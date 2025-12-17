# LifeRX Brain — Big Calendar Integration (Tech Spec)

## Goal
Embed the full **Big Calendar** experience (month/week/day/year/agenda views, event CRUD, user filtering, badge variants, drag-and-drop rescheduling) into the existing LifeRX Brain chat UI, launched from a small calendar button in the actions bar.

Reference implementation: `lramos33/big-calendar` (MIT) — [`https://github.com/lramos33/big-calendar.git`](https://github.com/lramos33/big-calendar.git)

## Non-goals (initial rollout)
- Tight coupling to LifeRX domain objects (guests/interviews/outreach) beyond optional future linking.
- Complex permissions/RLS or multi-tenant org scoping (current app is single-tenant/operator-mode oriented).

## UX / Product Requirements
- **Entry point**: calendar icon button in the chat input actions bar opens the full calendar.
- **Full experience**:
  - Views: **day/week/month/year/agenda**
  - Date navigation + range display
  - Event colors + badge variants (dot/colored/mixed)
  - User filter (All vs single user) + avatars
  - Add/edit/view event dialogs
  - Drag & drop:
    - Move events between days in month view
    - Adjust timing in week/day views
  - Live “now” indicator + current event highlighting (week/day views)
- **UI integration**: use existing shadcn-style components already in repo (`src/components/ui/*`) and Tailwind tokens.

## Technical Approach
### 1) Calendar module (ported, not reinvented)
Create `src/calendar/**` mirroring upstream structure:
- `src/calendar/types.ts`, `src/calendar/interfaces.ts`, `src/calendar/helpers.ts`
- `src/calendar/contexts/calendar-context.tsx`
- `src/calendar/components/client-container.tsx`
- `src/calendar/components/**` (views, header, dialogs, DnD wrapper/layer)

Where upstream depends on components not present in LifeRX, we will:
- Prefer existing `src/components/ui/*` components
- Add missing shadcn components only when needed
- Keep files < ~500 LOC by splitting by responsibility

### 2) Drag-and-drop dependency
Upstream uses `react-dnd` + `react-dnd-html5-backend`.

Risks:
- Our app is on React 19; some DnD libs may have strict peer deps.

Plan:
- Try installing `react-dnd` + `react-dnd-html5-backend`.
- If peer-dep incompatibilities block build, switch to a React 19–compatible alternative (`@dnd-kit/core`) while preserving the same UX and component boundaries.

### 3) Embedding into chat UI
Replace the current lightweight calendar dialog with a **full-screen (or near full-screen) dialog** that renders the calendar container.

Implementation options:
- Dialog-based “CalendarOverlay” (preferred: keeps user in chat, fast).
- Route-based `/calendar` page (optional later).

### 4) Data / Persistence
Two stages:
- **Stage A (ship UI)**: use in-memory mocked users/events (seeded) to deliver full UX quickly.
- **Stage B (persist)**: add Supabase tables:
  - `calendar_users` (optional; can also map to existing auth/users later)
  - `calendar_events` (id, title, description, start_at, end_at, color, user_id, created_at, updated_at)
  - Add API endpoints for CRUD and wire provider to fetch/refetch.

Open question: whether events should be global/shared vs user-scoped; default to single-tenant operator mode (shared).

## Testing Plan
- Render smoke test: calendar overlay opens/closes from actions bar.
- View switching test: day/week/month/year/agenda render without errors.
- Event CRUD: create/edit/delete works in state.
- DnD: moving an event updates its dates/times.
- Lint pass for touched files.

## Rollout Plan
1. Port core calendar primitives + context and render Month view.
2. Add remaining views + header controls.
3. Add dialogs + badge/user controls.
4. Add DnD.
5. Wire to actions bar and polish.
6. (Optional) Persistence via Supabase.


