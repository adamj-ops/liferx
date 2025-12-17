# LifeRX Brain - Project Checklist

## ✅ Phase 1: Foundation (COMPLETE)
- [x] Next.js 14 App Router setup
- [x] TypeScript configuration
- [x] Supabase client setup (server + browser)
- [x] Database types file
- [x] Single chat UI page

## ✅ Phase 2: API & Auth (COMPLETE)
- [x] POST /api/assistant/run endpoint
- [x] Operator mode authentication
- [x] Session persistence to agent_sessions
- [x] Message persistence to agent_messages
- [x] Streaming response passthrough
- [x] Development mode fallback (when no Hub)

## ✅ Phase 3: Tool System (COMPLETE)
- [x] Tool types (ToolContext, ToolResponse, ToolDefinition)
- [x] Central tool registry
- [x] executeTool with logging
- [x] POST /api/tools/execute endpoint
- [x] Internal shared secret auth
- [x] Write intent guard (allowWrites)

## ✅ Phase 4: Tool Implementations (COMPLETE)
- [x] brain.upsert_item (Decision, SOP, Principle, Playbook)
- [x] brain.record_decision (Quick decision logging)
- [x] brain.append_memory (Append-only brain memory)
- [x] brain.search (Semantic search with intent + logging)
- [x] guests.upsert_guest
- [x] interviews.upsert_interview
- [x] interviews.add_quote
- [x] interviews.tag_theme
- [x] outreach.log_event
- [x] followups.create
- [x] scoring.score_guest
- [x] themes.upsert_theme
- [x] themes.link_to_interview

## ✅ Phase 5: Chat Store & UI (COMPLETE)
- [x] Zustand chat store
- [x] Tool UI parts tracking
- [x] Streaming message updates
- [x] Tool panel sidebar
- [x] Error/loading states

## ✅ Phase 6: Agno Hub Integration (COMPLETE)
- [x] Hub event streaming
- [x] Contract validation (v1)
- [x] Tool callback flow
- [x] Agent routing (Hub → Ops/Content/Growth/Systems)
- [x] Shared guardrails

## ✅ Phase 7: Deployment (COMPLETE)
- [x] Railway deployment for Agno Hub
- [x] Vercel deployment for Next.js
- [x] Environment variable configuration
- [x] End-to-end validation
- [x] Ops hardening (error logging, config validation)

## ✅ Phase 8: UI Polish (COMPLETE)
- [x] Error banner display
- [x] Tool status indicators
- [x] Loading animations
- [x] Tool activity panel enhancements

## ✅ Phase 9: RAG/Semantic Search (COMPLETE)
- [x] Supabase migration for match_ai_chunks RPC
- [x] Text chunking utility (chunker.ts)
- [x] OpenAI embedding wrapper (embedder.ts)
- [x] Document ingestion pipeline (ingest.ts)
- [x] brain.search tool implementation
- [x] Tool registration and agent instructions
- [x] Ingestion API endpoint (/api/internal/ingest)

## ✅ Phase 10: RAG Guardrails & Compound Intelligence (COMPLETE)
- [x] Step A: Retrieval Guardrails
  - [x] Required intent field (factual_recall, prior_decision, interview_evidence, theme_discovery)
  - [x] Intent validation in brain.search
  - [x] Updated Content/Growth agent instructions with search rules
- [x] Step B: Result Post-Processing
  - [x] normalizer.ts for transforming chunks to evidence
  - [x] Group by source, collapse overlaps, extract quotes
  - [x] normalize option in brain.search
- [x] Step C: Theme Scanner Integration
  - [x] Semantic pattern finding via RAG
  - [x] Topic extraction from interview summaries
  - [x] Cross-interview pattern detection
  - [x] Semantic hints in AI prompt
- [x] Step D: Search Trace Table
  - [x] ai_search_logs table with indexes
  - [x] Non-blocking search logging
  - [x] Intent and latency tracking

---

## Deployed Services

| Service | Platform | URL |
|---------|----------|-----|
| Agno Hub | Railway | https://alert-patience-production.up.railway.app |
| Next.js App | Vercel | https://liferx-opsfx.vercel.app |
| Database | Supabase | (configured via env vars) |

---

## ✅ Phase 11: Pipeline 1 - Guest Intelligence & Enrichment (COMPLETE)
- [x] Prompt 1: Guest Core Schema & Upsert
  - [x] Add org_id, full_name, primary_role, has_podcast, socials to guests table
  - [x] Add unique constraint on (org_id, full_name)
  - [x] Update guests.upsert_guest v2.0 with name normalization, org-scoping
  - [x] Detect has_podcast from socials
- [x] Prompt 2: External Profile Enrichment
  - [x] Create guests.enrich_profiles tool
  - [x] Stub external source checks (LinkedIn, website, podcast)
  - [x] Calculate social_presence_strength
  - [x] Store enrichment metadata
- [x] Prompt 3: Guest Persona Generator
  - [x] Enhance guest_personas table with org_id, summary, beliefs, expertise, unique_povs
  - [x] Create guest_personas.upsert tool
  - [x] RAG-powered persona generation via brain.search
  - [x] AI analysis of quotes and content
- [x] Prompt 4: Guest Scoring Integration
  - [x] Update scoring.score_guest v3.0
  - [x] Add has_podcast bonus (10%)
  - [x] Add persona_clarity bonus (5%)
  - [x] Add social_presence bonus (5%)
  - [x] auto_enrich option for automatic data fetching

**Pipeline 1 Delivers:**
- Structured guest records with canonical identity
- External enrichment capability
- Clear personas (beliefs, POVs, expertise)
- Defensible ranking with explainability

---

## Next Steps (Future Phases)

## ✅ Phase 12: Pipeline 2 - Interview Intelligence (COMPLETE)
- [x] interviews.auto_tag - AI-powered tagging (industries, expertise, pillars, tones)
- [x] interviews.extract_defining_quotes - Extract reusable quotes with classification
- [x] interviews.build_semantic_index - RAG indexing for interview transcripts
- [x] Interview Intelligence Pipeline orchestrator (src/pipelines/interviewIntelligence.ts)
- [x] Integration with Theme Scanner for cross-interview pattern detection

**Pipeline 2 Delivers:**
- Automatic interview tagging based on transcript analysis
- Quote extraction with pillar/tone classification
- RAG-searchable interview content
- Optional theme scanning for recurring patterns

## ✅ Phase 13: Pipeline 3 - Content Repurposing Engine (COMPLETE)
- [x] Database migration: content_assets table with type, pillar, tone constraints
- [x] content.generate_quote_card - Turn quotes into publishable card concepts
- [x] content.generate_carousel_outline - Create Instagram/LinkedIn carousel outlines from themes
- [x] content.generate_shortform_script - Generate 30-60s video/audio scripts
- [x] content.generate_post_ideas - Generate 3-5 post topics from guest/theme
- [x] contentRepurposing.ts coordinator pipeline
- [x] Unit tests for validation and orchestrator logic

**Pipeline 3 Delivers:**
- Quotes become quote cards (headline, subtext, attribution, caption)
- Themes become carousels (5-8 slide outlines with hook and CTA)
- Interviews produce short-form scripts (30-60s spoken delivery)
- Guests produce post ideas (tied to Health/Wealth/Connection)
- All assets stored as structured, queryable, explainable content_assets

## ✅ Phase 14: Pipeline 4 - Outreach & Contributor Automation (COMPLETE)
- [x] Database: outreach_campaigns, outreach_threads tables
- [x] Database: Extended outreach_messages with org_id, thread_id, direction, channel, status
- [x] Database: Extended followups with org_id, thread_id, status, reason
- [x] Tool: outreach.create_campaign - Create outreach campaigns
- [x] Tool: outreach.upsert_thread - Create/update guest threads
- [x] Tool: outreach.compose_message - AI-powered personalized message generation
- [x] Tool: outreach.queue_send - Queue messages for sending
- [x] Tool: outreach.mark_sent - Mark messages as sent with followup scheduling
- [x] Tool: outreach.record_inbound - Record guest replies
- [x] Tool: followups.create_for_thread - Create thread-linked followups
- [x] Tool: outreach.send_email - Send emails via Resend provider
- [x] Provider: EmailProvider abstraction + Resend implementation
- [x] Internal endpoints: /api/internal/outreach/compose, /queue, /send-email
- [x] Orchestrator: src/pipelines/outreachAutomation.ts (eligibility + flows)

**Pipeline 4 Delivers:**
- Personalized contributor invite + post-release follow-up generation
- Explainable eligibility computation (score, POVs, quotes, social presence)
- State machine for thread management (draft → queued → sent → replied)
- Real email sending via Resend with audit trail
- Follow-up scheduling and tracking

### Phase 15: Knowledge Base Population
- [ ] Ingest existing ai_docs into ai_chunks
- [ ] Set up automatic ingestion for new documents
- [ ] Create ingestion dashboard/admin UI

### Phase 15: Session History UI
- [ ] Display past conversations
- [ ] Resume previous sessions
- [ ] Session search/filtering

### Phase 16: User Authentication
- [ ] Connect auth to chat sessions
- [ ] User-scoped data access
- [ ] Session ownership

### Phase 17: Advanced Features
- [ ] Multi-turn tool conversations
- [ ] Tool chaining
- [ ] Scheduled tasks/workflows

### Phase 18: Big Calendar (IN PROGRESS)
- [ ] Port `src/calendar/**` module (views + header + dialogs + DnD)
- [ ] Add calendar button to actions bar (already present) to open full calendar overlay
- [ ] Decide persistence strategy (mock vs Supabase tables) and implement if needed
- [ ] Validate drag/drop + view switching + event CRUD
