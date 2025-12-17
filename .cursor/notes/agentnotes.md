# LifeRX Brain - Agent Notes

## Project Overview
LifeRX Brain is a multi-agent orchestration system with a single chat UI control plane. Built on Next.js 14 (App Router) + TypeScript, with Agno for agent orchestration and Supabase for data.

## Architecture
```
Chat UI → POST /api/assistant/run → Agno Hub (Railway) → Agent Response
                                          ↓
                              POST /api/tools/execute
                                          ↓
                                     Supabase
```

## Key Files & Directories

### Next.js App (Main)
- `app/page.tsx` - Single chat UI
- `app/api/assistant/run/route.ts` - Main endpoint, proxies to Agno Hub
- `app/api/tools/execute/route.ts` - Tool execution endpoint (called by Agno Hub)

### Agno Hub (For Railway Deployment)
- `agno-hub/server.py` - FastAPI server with Hub routing
- `agno-hub/agents.py` - Agent definitions (Hub, Ops, Content, Growth, Systems)
- `agno-hub/tools.py` - Tool callback client
- `agno-hub/Dockerfile` - Railway-ready Dockerfile

### Tool System
- `src/lib/tools/types.ts` - ToolContext, ToolResponse, ToolDefinition
- `src/lib/tools/registry.ts` - Central tool registry
- `src/lib/tools/executeTool.ts` - Executor with logging
- `src/lib/tools/implementations/` - Individual tool files

### Supabase
- `src/lib/supabase/server.ts` - Server client (service role)
- `src/lib/supabase/browser.ts` - Browser client (anon key)
- `supabase/migrations/` - SQL migrations (local reference)

## Environment Variables (.env.local)

```bash
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Agno Hub (after Railway deployment)
AGNO_HUB_URL=https://your-hub.up.railway.app
INTERNAL_SHARED_SECRET=generate-a-long-random-string

# Auth mode
ENABLE_OPERATOR_MODE=true  # Set to true for dev/testing
```

## Agents
| Agent | Purpose |
|-------|---------|
| Hub | Routes requests to specialist agents |
| Ops | Newsletter workflows, SOPs, follow-ups |
| Content | Interview analysis, quotes, editorial |
| Growth | Guest discovery, trends, audience insights |
| Systems | Schema design, tooling, integrations |

## Registered Tools
1. `brain.upsert_item` - Create/update brain items (decision, SOP, principle, etc.)
2. `brain.record_decision` - Record decision with rationale
3. `brain.append_memory` - Store agent memory with TTL
4. `guests.upsert_guest` - Create/update guest profiles
5. `interviews.upsert_interview` - Create/update interviews
6. `interviews.add_quote` - Add quotes with pillar tagging
7. `interviews.tag_theme` - Tag interviews with themes
8. `outreach.log_event` - Log outreach activities
9. `followups.create` - Create follow-up tasks
10. `scoring.score_guest` - Calculate explainable guest scores

## Database Schema (Extended Existing Tables)
- `ai_tool_logs` - Extended with tool_version, status, duration_ms, writes
- `guests` - Extended with pillar, unique_pov, expertise, social_links
- `interviews` - Extended with title, status, summary, media URLs
- `interview_quotes` - Extended with pillar, emotional_insight, is_highlight

### New Tables Created
- `brain_items` - Typed brain entries with versioning
- `themes` - Cross-cutting themes with pillar alignment
- `agent_sessions` - Agent conversation sessions
- `agent_messages` - Messages within sessions
- `agent_memory` - Agent memory with TTL
- `interview_themes` - Theme tagging for interviews
- `guest_personas` - Generated personas
- `guest_scores` - Explainable scoring
- `outreach_events` - Outreach activity log
- `followups` - Follow-up tasks
- `engagement_scores` - Engagement metrics

## Deployment Steps

### 1. Railway (Agno Hub)
1. Create Railway project from `agno-hub/` folder
2. Set environment variables:
   - `OPENAI_API_KEY`
   - `INTERNAL_SHARED_SECRET` (must match Next.js)
   - `TOOL_API_URL` (your Next.js app URL)
3. Railway auto-builds via Dockerfile
4. Get public URL

### 2. Next.js (Vercel or other)
1. Connect GitHub repo
2. Set environment variables including `AGNO_HUB_URL`
3. Deploy

## User Preferences
- No org_id scope (existing schema is user-scoped)
- Operator mode enabled for single-tenant use
- All tools require explicit `allowWrites: true` for mutations
- Tools return explainability metadata

## Last Session: Dec 16, 2024
- Created Agno Hub structure for Railway deployment
- Updated migrations to EXTEND existing Supabase tables
- Applied all migrations successfully
- Fixed TypeScript compilation errors
- All tools registered and functional
