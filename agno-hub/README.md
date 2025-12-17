# LifeRX Agno Hub

Multi-agent orchestration hub for LifeRX Brain, designed for Railway deployment.

## Architecture

```
Next.js App → POST /run → Agno Hub → Agent Response
                              ↓
                    POST /api/tools/execute
                              ↓
                         Supabase
```

## Agents

| Agent | Purpose |
|-------|---------|
| **Hub** | Routes requests to specialist agents |
| **Ops** | Newsletter workflows, SOPs, follow-ups |
| **Content** | Interview analysis, quotes, editorial |
| **Growth** | Guest discovery, trends, audience insights |
| **Systems** | Schema design, tooling, integrations |

## Local Development

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from example
cp .env.example .env
# Edit .env with your values

# Run server
python server.py
```

Test:
```bash
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: your-secret" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

## Railway Deployment

### 1. Create Railway Service
- New Project → Deploy from GitHub
- Select this repo (or the `agno-hub` subdirectory)

### 2. Set Environment Variables
In Railway → Service → Variables:
```
OPENAI_API_KEY=sk-...
INTERNAL_SHARED_SECRET=your-secret
TOOL_API_URL=https://your-nextjs-app.vercel.app
```

### 3. Deploy
Railway will:
- Build the Docker image
- Run on `$PORT` (automatically injected)
- Expose a public URL

### 4. Verify
```bash
curl https://your-railway-url.up.railway.app/health
# Should return: {"status":"ok","agents":["Hub","Ops","Content","Growth","Systems"]}
```

## Critical Notes

1. **Never hardcode PORT** - Railway injects it via `$PORT`
2. **Match secrets** - `INTERNAL_SHARED_SECRET` must match Next.js app
3. **Check logs** - If traffic fails, Uvicorn might not be binding to `$PORT`

## SSE Event Schema

The hub streams these event types:

```typescript
type HubEvent =
  | { type: "delta"; content: string }
  | { type: "tool_start"; tool: string; args?: unknown }
  | { type: "tool_result"; tool: string; explainability?: unknown }
  | { type: "final"; next_actions?: string[]; assumptions?: string[] };
```

