# LifeRX Brain - Notebook

## Key Findings & Decisions

### Existing Supabase Schema (Dec 16, 2024)
The existing Supabase project already has many tables:
- `guests`, `interviews`, `interview_quotes` - Core content tables
- `prospects`, `audience_segments` - Audience data
- `ai_tool_logs`, `ai_chat_sessions`, `ai_chat_messages` - AI logging
- `quiz_results`, `quiz_questions`, `quiz_responses` - Quiz system
- `brain_memories`, `chat_threads`, `chat_messages` - Chat history

**Decision:** Extend existing tables with new columns rather than recreate. No org_id scope since existing schema is user-based.

### HubEvent Contract
Canonical SSE event types for streaming:
```typescript
type HubEvent =
  | { type: "delta"; content: string }
  | { type: "tool_start"; tool: string; args?: unknown }
  | { type: "tool_result"; tool: string; explainability?: unknown; writes?: unknown }
  | { type: "final"; next_actions?: string[]; assumptions?: string[]; active_agent?: string };
```

### Write Intent Guard
All tools that modify data require `context.allowWrites === true`. This:
- Prevents accidental writes during analysis
- Enables future dry-run/preview modes
- Separates read-only agents from write-capable ones

### Version Tracking
Version everything that "thinks":
- `brain_items.version` - Content version
- `agent_sessions.runtime_version` - Hub version
- `ai_tool_logs.tool_version` - Tool version
- `guest_scores.rules_version` - Scoring rules version

### Pillar Framework
LifeRX uses Health/Wealth/Connection pillars:
- **Health**: Physical wellness, mental health, longevity, habits
- **Wealth**: Financial freedom, career growth, business success
- **Connection**: Relationships, community, purpose, belonging

All guest/content tagging uses this framework.

### Railway Deployment Notes
**Critical:** Railway injects `$PORT` environment variable. The Dockerfile MUST use:
```dockerfile
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port $PORT"]
```
Do NOT hardcode the port or traffic will fail silently.

### Agno Agent Design
- **Hub**: JSON router that returns `{ "agent": "...", "reason": "..." }`
- **Specialists**: Return markdown with "Next actions:" sections
- All agents share the same model (configured via OPENAI_MODEL env var)

## Troubleshooting

### "Authentication required" error
Set `ENABLE_OPERATOR_MODE=true` in .env.local for development.

### Supabase type errors
The database.types.ts file is a manual placeholder. Run `npx supabase gen types typescript` to generate accurate types.

### Tool not found
All tools must be imported and registered in `src/lib/tools/registry.ts`.
