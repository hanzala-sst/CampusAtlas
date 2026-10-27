# CampusAtlas — Agent Handoff

> Keep this file compact and factual. This is the source for agent-to-agent continuity. Update at the end of every milestone and before switching agents.

## Current state
- **Last updated:** 2026-10-27 14:45 IST
- **Current milestone:** 4 (Complete)
- **Git branch / last commit:** master / 1d50936 (Milestone 4 functional commit pending local commit)
- **App status:** client working / API working / end-to-end working

## Decisions locked
- React + Vite + Tailwind; Express + Mongoose; MongoDB Atlas; official `@google/genai` SDK.
- Consistent ES modules (`"type": "module"`) across client and server.
- Auth uses HttpOnly JWT cookie (`ca_auth_token`, SameSite=Lax/None, Secure in prod); moderator assignment/verification is server-controlled via `ADMIN_EMAILS`.
- PDF upload limit 8 MiB; magic bytes validated (`%PDF-` / 0x255044462D) alongside MIME and extension.
- Bounded BSON storage for PDF file bytes in MongoDB (fileData excluded by default from queries and lists).
- PDF extraction: `unpdf` parses page-by-page returning 1-based page numbers; non-extractable / image-only PDFs fail with clear explanation.
- Chunking: deterministic bounded chunks (~600 chars, ~120 char overlap) generated strictly per page so no chunk claims text from another page.
- Embedding model + dimension used by this repo: `gemini-embedding-001` with 768 dimensions (normalized vectors with cosine similarity).
- Generation model: `gemini-3.5-flash-lite` with automatic fallback to `gemini-3.5-flash` if `gemini-2.5-flash` encounters a 404/503 from the Google GenAI provider.
- Bounded scan limit: Initial in-memory cosine scan limit set to 1000 candidate chunks for demo corpus before Atlas Vector Search migration.
- Ingestion state machine: `queued` → `processing` → `ready` or `failed`. Background worker with in-process lock (`activeIngestions` Set) and startup recovery.
- Grounded RAG Contract: `POST /api/ask` requires authentication; rejects unauthenticated requests; bounded question (2-1200 characters); optional `resourceId`, `courseCode`, `semester`, `resourceType`.
- Strict Grounding & Citation Validation: Candidate chunks assigned server-controlled source IDs (`S1`, `S2`...). Model is strictly instructed to treat document chunks as untrusted evidence, ignore embedded prompt injections, cite inline `[S1]`, and return structured JSON (`answer`, `abstained`, `abstentionReason`, `citedSourceIds`).
- Server-side Invariants:
  1. If no eligible evidence exists, generation is skipped and an honest abstention is returned immediately.
  2. Every returned source card is assembled on the server strictly from persisted DB chunk and Resource records—never from model-generated titles, page numbers, or URLs.
  3. Hallucinated / unknown source IDs are stripped from the response and answer markers; they cannot produce source cards.
  4. If a model generates a non-abstaining answer without valid citations to candidate chunks, it is converted to an honest abstention (`NO_VALID_CITATIONS`).
- Keyword fallback: Automatic graceful failover to deterministic keyword matching over eligible chunk text when embedding service is unavailable, with explicit mode labelling (`retrievalMode: 'keyword_fallback'`) and warning banner.
- Centralized error handling returns uniform shape: `{ success: false, error: { message, code, details } }`.

## Feature contract status
- [x] F1 Identity and permissions (register/login/logout/me, cookie, roles, ownership)
- [x] F2 Resource library (upload, metadata, list/search/filter/sort/pagination, PDF preview/download, edit/delete, ingestion state)
- [x] F3 Ingestion and retrieval (page text, chunks, embeddings, retry, semantic search, keyword fallback, cleanup)
- [x] F4 Ask the Doc (retrieval-grounded answers, actual sources/page excerpts, no-evidence abstention, citation validation, prompt injection protection)
- [x] F5 Community (unique voting, comments, reports, moderator queue/verification, computed reputation)
- [ ] F6 UI quality (responsive, all states, no decorative core controls — Milestone 5)

## Environment (names only; never put secrets here)
- Required variables configured locally: yes (configured via local .env)
- Missing required variables: none
- MongoDB connectivity verified: yes (MongoDB Atlas connected and verified against test suite)
- Gemini generation verified: yes (official `@google/genai` SDK verified live with `gemini-3.5-flash-lite`, grounded generation smoke test passed)
- Gemini embeddings verified: yes (official `@google/genai` SDK verified live with `gemini-embedding-001` at 768 dimensions)

## Last completed milestone
- **Implemented:** Milestone 4 (Evidence-Grounded "Ask the Doc" RAG — F4):
  - Shared retrieval service (`server/src/services/retrievalService.js`) consolidating chunk filtering, resource eligibility (ready and not archived), bounded scan, Gemini embeddings, and deterministic keyword fallback.
  - Search route refactored (`server/src/routes/search.js`) to consume shared retrieval without changing its API contract.
  - Grounded answer generation service (`server/src/services/generationService.js`) using `@google/genai` with strict evidence-only instructions, prompt injection resistance, inline citation format `[S1]`, structured JSON schema, and multi-model fallback (`gemini-3.5-flash-lite` / `gemini-3.5-flash`).
  - Server-side citation verification: candidate chunks mapped to server IDs; hallucinated IDs stripped; unsupported answers converted to abstentions; source cards built strictly from MongoDB Chunk and Resource records.
  - Authenticated Q&A endpoint (`POST /api/ask`) in `server/src/routes/ask.js` mounted at `/api/ask` in `server/src/app.js`.
  - Frontend Ask the Doc page (`client/src/pages/AskDocPage.jsx`): scope selector (All Library / Specific Document / Course Filters), question input with character counter, quick prompt chips, formatted inline citation badges, verified source cards with verbatim excerpts and links to documents, honest retrieval mode badge (semantic vs keyword fallback), honest abstention states, and loading skeletons.
  - Resource detail integration (`client/src/pages/ResourceDetailPage.jsx`): direct "Ask this Doc" action button in PDF preview header linking to `/ask?resourceId=:id`.
  - Client API service helper (`client/src/services/api.js`): added `api.ask.query(body)`.
- **Files changed (key paths only):**
  - `server/src/config/env.js`
  - `server/src/services/retrievalService.js` (new)
  - `server/src/services/generationService.js` (new)
  - `server/src/routes/ask.js` (new)
  - `server/src/routes/search.js`
  - `server/src/app.js`
  - `server/test/ask.test.js` (new)
  - `client/src/services/api.js`
  - `client/src/pages/AskDocPage.jsx`
  - `client/src/pages/ResourceDetailPage.jsx`
  - `docs/AGENT_HANDOFF.md`
- **Validation run + result:**
  - Automated test suite (`npm --prefix server test`): 23 tests passed, 0 failed across F1, F2, F3, F4, and F5 (10.65s).
  - Mocked test suite: verified request validation (short/long/invalid ID), authentication enforcement (401), zero-evidence abstention without generation invocation, grounded response mapping to DB source cards, hallucinated source ID stripping, non-abstaining unsupported answer conversion to abstention, keyword fallback mode, malformed model output graceful abstention, and archived resource exclusion.
  - Live smoke test: verified real `@google/genai` SDK generation call against sample academic chunk, yielding grounded answer with verified `[S1]` citation.
  - Client production build (`npm --prefix client run build`): Vite build passed in 3.12s with 0 errors.
- **Known issues / accepted limitations:**
  - In-memory cosine scan bounded to 1,000 candidate chunks for initial demo corpus before Atlas Vector Search migration.
  - Optional multi-turn conversational history is deferred to post-acceptance or future milestone, as core F4 study RAG is focused on single grounded questions with verified sources.

## Immediate next task
Milestone 5: F6 UI quality, end-to-end hardening, comprehensive deployment/docs/demo checklist, and project submission readiness.
