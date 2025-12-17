"""
LifeRX Agno Hub - Railway-Ready Server

This server:
1. Receives requests from the Next.js app at POST /run
2. Routes to the appropriate agent via the Hub
3. Calls tools back to the Next.js app
4. Returns streaming responses

Deploy to Railway with the included Dockerfile.
"""

import os
import json
import asyncio
from typing import AsyncGenerator

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from agents import hub, get_agent_by_name, AGENT_NAMES
from tools import call_tool

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


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "agents": AGENT_NAMES}


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
    
    Returns: SSE stream of HubEvents
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
    
    Emits canonical HubEvent types:
    - delta: Content chunks
    - tool_start: Tool invocation started
    - tool_result: Tool completed with result
    - final: Response complete with next_actions
    """
    try:
        # Route through the Hub
        route_result = await hub.arun(message)
        
        # Extract routing decision
        agent_name = "Ops"  # Default
        routing_reason = ""
        assumptions = []
        
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
        
        # Get the target agent
        agent = get_agent_by_name(agent_name)
        if not agent:
            agent_name = "Ops"
            agent = get_agent_by_name("Ops")
            assumptions.append(f"Unknown agent requested, defaulting to Ops")
        
        # Emit which agent is handling
        yield f"data: {json.dumps({'type': 'delta', 'content': f'[{agent_name}] '})}\n\n"
        
        # Run the agent
        agent_result = await agent.arun(message)
        
        # Stream the response content
        if hasattr(agent_result, 'content'):
            content = agent_result.content
            if isinstance(content, str):
                # Stream in chunks for better UX
                words = content.split(' ')
                for i, word in enumerate(words):
                    yield f"data: {json.dumps({'type': 'delta', 'content': word + (' ' if i < len(words) - 1 else '')})}\n\n"
                    await asyncio.sleep(0.02)  # Small delay for streaming effect
        
        # Extract next actions from the response
        next_actions = extract_next_actions(agent_result)
        
        # Final event
        final_event = {
            "type": "final",
            "active_agent": agent_name,
        }
        if next_actions:
            final_event["next_actions"] = next_actions
        if assumptions:
            final_event["assumptions"] = assumptions
        
        yield f"data: {json.dumps(final_event)}\n\n"
        yield "data: [DONE]\n\n"
        
    except Exception as e:
        # Error handling
        error_msg = str(e)
        yield f"data: {json.dumps({'type': 'delta', 'content': f'Error: {error_msg}'})}\n\n"
        yield f"data: {json.dumps({'type': 'final', 'assumptions': ['An error occurred during processing']})}\n\n"
        yield "data: [DONE]\n\n"


def extract_next_actions(result) -> list[str]:
    """Extract next actions from agent response."""
    actions = []
    
    if hasattr(result, 'content'):
        content = result.content
        if isinstance(content, str):
            # Look for "Next actions:" or similar patterns
            lines = content.split('\n')
            in_actions = False
            for line in lines:
                line_lower = line.lower().strip()
                if 'next action' in line_lower or 'next step' in line_lower:
                    in_actions = True
                    continue
                if in_actions and line.strip().startswith(('-', '•', '*', '1', '2', '3')):
                    action = line.strip().lstrip('-•*0123456789. ')
                    if action:
                        actions.append(action)
                elif in_actions and not line.strip():
                    break
    
    return actions[:5]  # Cap at 5 actions


if __name__ == "__main__":
    # For local development only
    # Railway uses the Dockerfile CMD instead
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)

