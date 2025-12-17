# LifeRX Brain

Operator control plane for LifeRX, powered by Agno multi-agent orchestration.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase and Agno Hub credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the Brain.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Chat UI       │────▶│  /api/assistant │────▶│   Agno Hub      │
│   (Browser)     │     │     /run        │     │   (Railway)     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   /api/tools    │◀────│   Hub calls     │
                        │    /execute     │     │   tools here    │
                        └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    Supabase     │
                        │   (Postgres)    │
                        └─────────────────┘
```

- **One endpoint**: UI only calls `POST /api/assistant/run`
- **Streaming**: Real-time SSE responses from Hub
- **Tool isolation**: Tools execute server-side only
- **Org-scoped**: All data is organization-scoped with RLS

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `AGNO_HUB_URL` | No* | Agno Hub URL (mock mode if not set) |
| `INTERNAL_SHARED_SECRET` | Yes | Shared secret for Hub ↔ App auth |
| `ENABLE_OPERATOR_MODE` | No | Set to `true` for development (default: false) |
| `OPERATOR_MODE_TOKEN` | No | Token for operator mode |
| `DEFAULT_ORG_ID` | No | Default org for operator mode |

*If not set, the app runs in mock mode for UI development.

## Database Setup

Run the Supabase migrations:

```bash
# Using Supabase CLI
supabase db push

# Or apply migrations manually in order:
# 1. 20241216000001_core_brain_tables.sql
# 2. 20241216000002_guests_interviews_tables.sql
# 3. 20241216000003_audience_prospects_tables.sql
# 4. 20241216000004_outreach_ops_tables.sql
# 5. 20241216000005_rls_policies.sql
```

## Tool Registry

| Tool | Description |
|------|-------------|
| `brain.upsert_item` | Create/update brain items |
| `brain.record_decision` | Record decisions with rationale |
| `brain.append_memory` | Store agent memory |
| `guests.upsert_guest` | Manage guest profiles |
| `interviews.upsert_interview` | Manage interview records |
| `interviews.add_quote` | Add notable quotes |
| `interviews.tag_theme` | Tag interviews with themes |
| `outreach.log_event` | Log outreach activities |
| `followups.create` | Create follow-up tasks |
| `scoring.score_guest` | Rule-based guest scoring |

All tools support dry-run mode via `context.allowWrites`.

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── assistant/run/     # Hub proxy endpoint
│   │   └── tools/execute/     # Tool executor endpoint
│   ├── globals.css            # Dark operator theme
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Chat UI
├── src/lib/
│   ├── agno/                  # Agno types and event schema
│   ├── audit/                 # Tool event logging
│   ├── jobs/                  # Background job seam (no-op v1)
│   ├── supabase/              # Supabase clients and types
│   └── tools/                 # Tool registry and implementations
├── supabase/migrations/       # Database migrations
└── .cursor/                   # Agent documentation
```

## Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build
```

## Design Principles

1. **Structure beats chat** - Store important data, don't just discuss it
2. **No vague answers** - Label assumptions explicitly
3. **Action-first** - End with concrete next steps
4. **Explainability** - Scores and decisions must be traceable
5. **Write intent guard** - Tools require explicit permission to mutate

