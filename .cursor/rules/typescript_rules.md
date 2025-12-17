# TypeScript Rules for LifeRX Brain

## General

- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use `type` for unions and utility types
- Always define return types for functions
- Use `unknown` instead of `any` where possible

## Imports

- Use `@/` path alias for imports from `src/`
- Group imports: external, internal, types
- Use type-only imports where applicable: `import type { ... }`

## Naming

- PascalCase for types, interfaces, and components
- camelCase for functions, variables, and properties
- SCREAMING_SNAKE_CASE for constants
- Prefix interfaces with context, not "I": `ToolDefinition` not `IToolDefinition`

## Error Handling

- Always catch errors in async functions
- Use typed error handling where possible
- Log errors with context before re-throwing
- Swallow errors only when explicitly acceptable (e.g., audit logging)

## Supabase

- Always check for errors after Supabase operations
- Use `.single()` when expecting exactly one row
- Use `.maybeSingle()` when the row might not exist
- Always scope queries with `org_id`

## Tools

- Every tool must have a version string
- Every tool must return `ToolResponse` with data, explainability, and writes
- Every mutating tool must check `context.allowWrites`
- Use the `createDryRunResponse` and `createWriteResponse` helpers

## API Routes

- Use Next.js App Router conventions
- Return appropriate HTTP status codes
- Always validate request body
- Use `NextResponse.json()` for JSON responses

