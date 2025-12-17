"""
LifeRX Agno Hub - Railway-Ready Server

This server:
1. Receives requests from the Next.js app at POST /run
2. Routes to the appropriate agent via the Hub
3. Calls tools back to the Next.js app
4. Returns streaming responses with contract-compliant events

Deploy to Railway with the included Dockerfile.

Contract Version: v1
"""

import os
import json
import asyncio
import re
from typing import AsyncGenerator

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from agents import hub, get_agent_by_name, AGENT_NAMES, get_contract_version
from tools import call_tool
from shared_instructions import AGNO_CONTRACT_VERSION

load_dotenv()

app = FastAPI(title="LifeRX Agno Hub", version="0.1.0")

# Internal auth
INTERNAL_SHARED_SECRET = os.getenv("INTERNAL_SHARED_SECRET")
TOOL_API_URL = os.getenv("TOOL_API_URL")  # URL to call back to Next.js


def verify_request(request: Request) -> None:
    """Verify the request has the correct internal secret."""
    secret = request.headers.get("X-Internal-Secret")
    if not INTERNAL_SHARED_SECRET:
        # Dev mode: no secret configured
        return
    if secret != INTERNAL_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "status": "ok",
        "service": "LifeRX Agno Hub",
        "contract_version": AGNO_CONTRACT_VERSION,
        "agents": AGENT_NAMES,
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "contract_version": AGNO_CONTRACT_VERSION,
        "agents": AGENT_NAMES,
    }


@app.post("/run")
async def run(request: Request):
    """
    Main entry point for the LifeRX Brain.
    
    Receives:
    {
        "session_id": "...",
        "messages": [{"role": "user", "content": "..."}],
        "org_id": "...",
        "user": {"id": "...", "email": "..."}
    }
    
    Returns: SSE stream of HubEvents (contract v1)
    
    Event types:
    - delta: { type: "delta", content: string }
    - tool_start: { type: "tool_start", tool: string }
    - tool_result: { type: "tool_result", tool: string, data?: any }
    - final: { type: "final", payload: AgentResponse }
    """
    verify_request(request)
    
    try:
        body = await request.json()
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    messages = body.get("messages", [])
    if not messages:
        raise HTTPException(status_code=400, detail="messages required")
    
    context = {
        "session_id": body.get("session_id", ""),
        "org_id": body.get("org_id", ""),
        "user": body.get("user", {}),
        "tool_api_url": TOOL_API_URL,
        "internal_secret": INTERNAL_SHARED_SECRET,
    }
    
    # Get the last user message
    last_message = messages[-1].get("content", "") if messages else ""
    
    return StreamingResponse(
        stream_response(last_message, context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


async def stream_response(message: str, context: dict) -> AsyncGenerator[str, None]:
    """
    Process the message through the Hub and stream the response.
    
    Emits canonical HubEvent types (contract v1):
    - delta: Content chunks
    - tool_start: Tool invocation started (minimal)
    - tool_result: Tool completed with result
    - final: Response complete with payload containing AgentResponse
    """
    full_content = ""
    agent_name = "Ops"
    assumptions = []
    
    try:
        # Route through the Hub
        route_result = await hub.arun(message)
        
        # Extract routing decision
        routing_reason = ""
        
        if hasattr(route_result, 'content'):
            content = route_result.content
            if isinstance(content, str):
                try:
                    parsed = json.loads(content)
                    agent_name = parsed.get("agent", "Ops")
                    routing_reason = parsed.get("reason", "")
                except json.JSONDecodeError:
                    # Hub returned plain text, use as reason
                    routing_reason = content
        
        # Validate agent name
        if agent_name not in ["Ops", "Content", "Growth", "Systems"]:
            assumptions.append(f"Unknown agent '{agent_name}' requested, defaulting to Ops")
            agent_name = "Ops"
        
        # Get the target agent
        agent = get_agent_by_name(agent_name)
        if not agent:
            agent_name = "Ops"
            agent = get_agent_by_name("Ops")
            assumptions.append("Agent lookup failed, defaulting to Ops")
        
        # Emit which agent is handling
        agent_prefix = f"[{agent_name}] "
        yield f"data: {json.dumps({'type': 'delta', 'content': agent_prefix})}\n\n"
        full_content += agent_prefix
        
        # Run the agent
        agent_result = await agent.arun(message)
        
        # Stream the response content
        response_content = ""
        if hasattr(agent_result, 'content'):
            content = agent_result.content
            if isinstance(content, str):
                response_content = content
                # Stream in chunks for better UX
                words = content.split(' ')
                for i, word in enumerate(words):
                    chunk = word + (' ' if i < len(words) - 1 else '')
                    yield f"data: {json.dumps({'type': 'delta', 'content': chunk})}\n\n"
                    full_content += chunk
                    await asyncio.sleep(0.02)  # Small delay for streaming effect
        
        # Extract next_actions and assumptions from the response
        next_actions = extract_next_actions(response_content)
        extracted_assumptions = extract_assumptions(response_content)
        assumptions.extend(extracted_assumptions)
        
        # Ensure next_actions is never empty (contract requirement)
        if not next_actions:
            next_actions = ["Review the response and determine appropriate follow-up"]
            assumptions.append("No explicit next actions found in agent response")
        
        # Build contract-compliant final event with payload wrapper
        final_event = {
            "type": "final",
            "payload": {
                "version": AGNO_CONTRACT_VERSION,
                "agent": agent_name,
                "content": full_content,
                "next_actions": next_actions,
            }
        }
        
        # Only include assumptions if non-empty
        if assumptions:
            final_event["payload"]["assumptions"] = assumptions
        
        yield f"data: {json.dumps(final_event)}\n\n"
        yield "data: [DONE]\n\n"
        
    except Exception as e:
        # Error handling - still emit contract-compliant response
        error_msg = str(e)
        error_content = f"Error: {error_msg}"
        
        yield f"data: {json.dumps({'type': 'delta', 'content': error_content})}\n\n"
        
        # Error fallback is still contract-compliant
        error_final = {
            "type": "final",
            "payload": {
                "version": AGNO_CONTRACT_VERSION,
                "agent": "Systems",
                "content": error_content,
                "assumptions": ["An error occurred during processing", error_msg],
                "next_actions": [
                    "Retry the request",
                    "Check the Hub logs for details",
                    "Contact support if the issue persists",
                ],
            }
        }
        
        yield f"data: {json.dumps(error_final)}\n\n"
        yield "data: [DONE]\n\n"


def extract_next_actions(content: str) -> list[str]:
    """
    Extract next actions from agent response.
    
    Looks for patterns like:
    - "Next actions:"
    - "Next steps:"
    - Numbered or bulleted lists following these headers
    """
    actions = []
    
    if not content:
        return actions
    
    lines = content.split('\n')
    in_actions = False
    
    for line in lines:
        line_lower = line.lower().strip()
        
        # Detect start of next actions section
        if 'next action' in line_lower or 'next step' in line_lower:
            in_actions = True
            # Check if action is on same line after colon
            if ':' in line:
                after_colon = line.split(':', 1)[1].strip()
                if after_colon and not after_colon.startswith('-'):
                    # Single action on same line
                    continue
            continue
        
        # Extract action items
        if in_actions:
            stripped = line.strip()
            if not stripped:
                # Empty line might end the section
                continue
            
            # Match numbered items (1. 2. 3.) or bullets (- * •)
            if re.match(r'^[\d]+[.\)]\s*', stripped) or stripped.startswith(('-', '*', '•')):
                # Remove the prefix
                action = re.sub(r'^[\d]+[.\)]\s*', '', stripped)
                action = action.lstrip('-*• ').strip()
                if action:
                    actions.append(action)
            elif stripped.startswith('**') and stripped.endswith('**'):
                # Bold item without bullet
                action = stripped.strip('*').strip()
                if action:
                    actions.append(action)
            elif not any(c in stripped.lower() for c in [':', '##']):
                # Might be a continuation - skip headers
                pass
    
    return actions[:5]  # Cap at 5 actions


def extract_assumptions(content: str) -> list[str]:
    """
    Extract assumptions from agent response.
    
    Looks for patterns like:
    - "Assumptions:"
    - "I'm assuming..."
    - Bulleted lists following these headers
    """
    assumptions = []
    
    if not content:
        return assumptions
    
    lines = content.split('\n')
    in_assumptions = False
    
    for line in lines:
        line_lower = line.lower().strip()
        
        # Detect start of assumptions section
        if 'assumption' in line_lower:
            in_assumptions = True
            continue
        
        # Detect end (new section header)
        if in_assumptions and line.strip().startswith('#'):
            in_assumptions = False
            continue
        
        if in_assumptions and 'next action' in line_lower:
            in_assumptions = False
            continue
        
        # Extract assumption items
        if in_assumptions:
            stripped = line.strip()
            if not stripped:
                continue
            
            # Match bullets (- * •)
            if stripped.startswith(('-', '*', '•')):
                assumption = stripped.lstrip('-*• ').strip()
                if assumption:
                    assumptions.append(assumption)
    
    return assumptions[:5]  # Cap at 5 assumptions


if __name__ == "__main__":
    # For local development only
    # Railway uses the Dockerfile CMD instead
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
