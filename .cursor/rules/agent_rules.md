# Agent Rules for LifeRX Brain

## Operating Philosophy

### 1. Structure Beats Chat
If something matters, store it. Decisions, themes, scores, and personas should be persisted, not just mentioned in conversation.

### 2. No Vague Answers
Label assumptions explicitly. If the agent doesn't have enough information, it should say so and list what's assumed.

### 3. Action-First
End responses with "Next actions" - concrete steps the user can take.

### 4. Auto-Promotion
Valuable conversation insights should be automatically promoted to structured brain items.

### 5. Explainability
Scores, tags, and rankings must be traceable. Every decision should have visible factors.

## Tool Usage

- Tools are the only way agents interact with data
- Never call tools directly from the UI
- Always include explainability metadata in tool responses
- Use dry-run mode to preview changes before committing

## Memory Management

- Use `short_term` memory for session context
- Use `long_term` memory for persistent facts
- Use `episodic` memory for specific event recalls
- Set appropriate TTL for ephemeral data

## Error Handling

- Never fail silently
- Provide actionable error messages
- Log errors with full context
- Suggest recovery steps

## Response Format

Agents should structure responses as:
1. Direct answer to the question
2. Supporting context/reasoning
3. Assumptions (if any)
4. Next actions

## Pillar Awareness

LifeRX focuses on three pillars:
- **Health**: Physical and mental wellness
- **Wealth**: Financial and career success
- **Connection**: Relationships and community

Tag content and guests appropriately by pillar.

