# LifeRX Agno Contract

**Version:** v1  
**Status:** Locked  
**Last Updated:** 2024-12-17

---

## Why This Contract Exists

The Agno Contract establishes a strict, shared agreement between:

- **Agno Hub** (Python): Generates agent responses
- **Next.js API** (`/api/assistant/run`): Validates and proxies responses
- **Chat UI**: Consumes SSE events

This contract exists to:

1. **Prevent drift** — All agents emit the same structure
2. **Enable fail-safe** — Invalid responses get replaced, not crashed
3. **Support analytics** — Typed agent names enable routing metrics
4. **Ensure action-orientation** — Every response includes next steps
5. **Enable evolution** — Version field allows future changes

---

## Agent Response Contract

Every agent response MUST match this exact shape:

```typescript
interface AgentResponse {
  version: "v1";
  agent: "Ops" | "Content" | "Growth" | "Systems";
  content: string;
  assumptions?: string[];
  next_actions: string[];  // REQUIRED, non-empty
}
```

### Field Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `"v1"` | ✅ | Contract version for compatibility |
| `agent` | `AgentName` | ✅ | Which agent produced the response |
| `content` | `string` | ✅ | The full response content (markdown OK) |
| `assumptions` | `string[]` | ❌ | Explicit assumptions made |
| `next_actions` | `string[]` | ✅ | Must be non-empty |

### Valid Agent Names

- `Ops` — Newsletter operations, SOPs, follow-ups, pipelines
- `Content` — Interview analysis, quotes, editorial, H/W/C framing
- `Growth` — Guest discovery, prospect ranking, trends, audience
- `Systems` — Schema design, tooling, integrations, scoring models

**Note:** The `Hub` agent is internal for routing and never appears in responses.

---

## Streaming Event Contract (SSE)

The Hub emits Server-Sent Events in this format:

```
data: {"type": "...", ...}\n\n
```

### Canonical Event Types

| Type | Shape | Description |
|------|-------|-------------|
| `delta` | `{ type: "delta", content: string }` | Incremental text chunk |
| `tool_start` | `{ type: "tool_start", tool: string }` | Tool invocation started |
| `tool_result` | `{ type: "tool_result", tool: string, data?: unknown }` | Tool completed |
| `final` | `{ type: "final", payload: AgentResponse }` | Response complete |

### Important Notes

- `tool_start` is minimal — no `args` field to prevent leaking internals
- `final` wraps the full `AgentResponse` in a `payload` field
- Stream ends with `data: [DONE]\n\n`

### Example Stream

```
data: {"type": "delta", "content": "[Ops] "}

data: {"type": "delta", "content": "Here is "}

data: {"type": "delta", "content": "the SOP..."}

data: {"type": "final", "payload": {"version": "v1", "agent": "Ops", "content": "[Ops] Here is the SOP...", "next_actions": ["Review the document", "Update if needed"]}}

data: [DONE]
```

---

## What Breaks If Violated

### If `next_actions` is missing or empty:

- The `/api/assistant/run` route logs a `[CONTRACT VIOLATION]`
- A fallback response is emitted instead of crashing
- The user sees a system error message, not a 500

### If `agent` is invalid:

- Validation fails
- Fallback response is substituted
- Routing analytics become unreliable

### If unknown fields are added:

- Validation rejects the response
- This prevents "schema creep" and hidden dependencies

### If `version` is wrong:

- Future-proofing is broken
- Backward compatibility checks fail

---

## How Future Agents Must Comply

When adding a new specialist agent:

### 1. Add to Agent Registry

In `agno-hub/agents.py`:

```python
from shared_instructions import apply_guardrails

NEW_AGENT_INSTRUCTIONS = """Your agent-specific instructions here..."""

new_agent = Agent(
    name="NewAgent",
    model=create_model(),
    instructions=apply_guardrails(NEW_AGENT_INSTRUCTIONS),
    markdown=True,
)

AGENTS["NewAgent"] = new_agent
```

### 2. Update Contract Types

In `src/lib/agno/contract.ts`:

```typescript
export const AGENT_NAMES = ['Ops', 'Content', 'Growth', 'Systems', 'NewAgent'] as const;
```

### 3. Update Hub Router

In the Hub agent instructions, add the new agent to the routing rules.

### 4. Increment Contract Version (if changing structure)

If the change modifies the `AgentResponse` shape:

```typescript
export const AGNO_CONTRACT_VERSION = 'v2' as const;
```

And update Python:

```python
AGNO_CONTRACT_VERSION = "v2"
```

---

## Guardrails

All specialist agents have these guardrails appended to their instructions:

```
## RESPONSE CONTRACT (REQUIRED - DO NOT SKIP)

STRUCTURE FIRST, THEN STYLE. Write as if your response will be parsed, not just read.

1. Every response MUST end with "Next actions:" followed by at least one actionable step
2. If no actions are appropriate, explain WHY under "Next actions:"
3. List all assumptions under "Assumptions:" when you are uncertain
4. Use bullets and structure over paragraphs
5. Never give vague, open-ended, or purely conversational responses
```

These guardrails are defined in `agno-hub/shared_instructions.py` and applied via `apply_guardrails()`.

---

## Contract Version History

| Version | Date | Changes |
|---------|------|---------|
| `v1` | 2024-12-17 | Initial contract. Required fields: version, agent, content, next_actions. |

---

## Files

| File | Purpose |
|------|---------|
| `src/lib/agno/contract.ts` | TypeScript types and validation |
| `src/lib/agno/events.ts` | SSE event type definitions |
| `app/api/assistant/run/route.ts` | Server-side validation |
| `agno-hub/shared_instructions.py` | Python guardrails |
| `agno-hub/agents.py` | Agent definitions with guardrails |
| `agno-hub/server.py` | Hub server emitting contract events |
| `docs/agno-contract.md` | This documentation |

