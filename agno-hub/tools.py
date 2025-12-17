"""
Tool Execution Layer

This module handles calling tools back to the Next.js app.
Tools are executed via POST /api/tools/execute on the web app.
"""

import os
import httpx
from typing import Any


async def call_tool(
    tool_name: str,
    args: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    """
    Call a tool on the Next.js app.
    
    Args:
        tool_name: The tool to execute (e.g., "brain.upsert_item")
        args: Arguments for the tool
        context: Execution context (org_id, session_id, etc.)
    
    Returns:
        Tool execution result with data, explainability, and writes
    """
    tool_api_url = context.get("tool_api_url")
    internal_secret = context.get("internal_secret")
    
    if not tool_api_url:
        return {
            "success": False,
            "error": {"code": "NO_TOOL_API", "message": "TOOL_API_URL not configured"},
        }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{tool_api_url}/api/tools/execute",
                json={
                    "toolName": tool_name,
                    "args": args,
                    "context": {
                        "org_id": context.get("org_id", ""),
                        "session_id": context.get("session_id", ""),
                        "user_id": context.get("user", {}).get("id"),
                        "allowWrites": True,  # Hub always has write permission
                    },
                },
                headers={
                    "Content-Type": "application/json",
                    "X-Internal-Secret": internal_secret or "",
                },
            )
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": {
                        "code": "HTTP_ERROR",
                        "message": f"Tool API returned {response.status_code}",
                    },
                }
            
            return response.json()
            
    except httpx.TimeoutException:
        return {
            "success": False,
            "error": {"code": "TIMEOUT", "message": "Tool execution timed out"},
        }
    except Exception as e:
        return {
            "success": False,
            "error": {"code": "EXECUTION_ERROR", "message": str(e)},
        }


# Tool definitions for agents to reference
AVAILABLE_TOOLS = {
    "brain.upsert_item": {
        "description": "Create or update a brain item (decision, SOP, principle, etc.)",
        "args": ["type", "title", "content", "metadata?"],
    },
    "brain.record_decision": {
        "description": "Record a decision with rationale",
        "args": ["title", "decision", "rationale?", "alternatives_considered?"],
    },
    "brain.append_memory": {
        "description": "Store agent memory",
        "args": ["key", "value", "memory_type?", "ttl_hours?"],
    },
    "guests.upsert_guest": {
        "description": "Create or update a guest profile",
        "args": ["name", "email?", "company?", "pillar?", "unique_pov?"],
    },
    "interviews.upsert_interview": {
        "description": "Create or update an interview",
        "args": ["guest_id", "title", "status?", "summary?"],
    },
    "interviews.add_quote": {
        "description": "Add a quote from an interview",
        "args": ["interview_id", "guest_id", "quote", "pillar?", "emotional_insight?"],
    },
    "outreach.log_event": {
        "description": "Log an outreach activity",
        "args": ["guest_id", "event_type", "channel", "status?"],
    },
    "followups.create": {
        "description": "Create a follow-up task",
        "args": ["related_type", "related_id", "action", "due_at", "priority?"],
    },
    "scoring.score_guest": {
        "description": "Calculate a score for a guest",
        "args": ["guest_id", "score_type?"],
    },
}


def get_tool_help() -> str:
    """Get formatted help text for all available tools."""
    lines = ["Available tools:"]
    for name, info in AVAILABLE_TOOLS.items():
        args_str = ", ".join(info["args"])
        lines.append(f"  • {name}({args_str})")
        lines.append(f"    {info['description']}")
    return "\n".join(lines)

