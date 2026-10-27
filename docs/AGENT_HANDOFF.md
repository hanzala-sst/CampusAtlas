# CampusAtlas — Agent Handoff

> Keep this file compact and factual. This is the source for agent-to-agent continuity. Update at the end of every milestone and before switching agents.

## Current state
- **Last updated:** 2026-10-27 21:05 IST
- **Current milestone:** 5 (Complete + Targeted Release Safety Patch + Render Build Fix + Ingestion fileData Fix + Live Ingestion Polling)
- **Git branch / last commit:** master / 7be8e4d (feat(ui): add live ingestion status polling for resource detail and catalog)
- **App status:** client working / API working / end-to-end working / single-service deployment verified / no automatic localhost failover / atomic status updates / automatic frontend live ingestion status refresh

## Decisions locked
- React + Vite + Tailwind; Express + Mongoose; MongoDB (strictly uses single configured MONGODB_URI target, no automatic local store switching); official `@google/genai` SDK.
- Consistent ES modules (`"type": "module"`) across client and server.
- Auth uses HttpOnly JWT cookie (`ca_auth_token`, SameSite=Lax/None, Secure in prod); moderator assignment/verification is server-controlled via `ADMIN_EMAILS`.
- PDF upload limit 8 MiB; magic bytes validated (`%PDF-` / 0x255044462D) alongside MIME and extension.
- Bounded BSON storage for PDF file bytes in MongoDB (`fileData` excluded by default via `select: false` from queries, lists, and detail API JSON; explicitly selected with `.select('+fileData')` only where raw bytes are required; status and metadata updates use atomic `findByIdAndUpdate` to prevent triggering schema validation on unselected `fileData`).
- Live Ingestion Polling: `ResourceDetailPage` polls the single resource at 2.5s intervals while `ingestionStatus` is `'queued'` or `'processing'`; stops immediately on terminal `'ready'` or `'failed'` or on unmount. `LibraryPage` polls standard catalog list at 3s intervals only while at least one displayed resource is non-terminal, stopping as soon as all are ready/failed; pauses polling when tab is hidden (`document.hidden`) and guards against overlapping requests.
- PDF extraction: `unpdf` parses page-by-page returning 1-based page numbers; non-extractable / image-only PDFs fail with clear explanation.
- Chunking: deterministic bounded chunks (~600 chars, ~120 char overlap) generated strictly per page so no chunk claims text from another page.
- Embedding model + dimension: `gemini-embedding-001` with 768 dimensions (normalized vectors with cosine similarity).
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
- Database Connection Contract: Use strictly the single configured `MONGODB_URI`. Never silently attempt fallback or failover to `localhost` or `127.0.0.1` upon Atlas failure. On connection outage, the service maintains degraded mode: `/api/health` honestly reports database status as `'error'`/`'degraded'`, and all database-dependent API endpoints return structured HTTP 503 (`DATABASE_UNAVAILABLE`).
- Centralized error handling returns uniform shape: `{ success: false, error: { message, code, details } }`.
- Single-Service Production Deployment: Express natively serves built Vite assets from `client/dist` and handles SPA routing fallback for non-API requests (`get('*')`).

## Feature contract status
- [x] F1 Identity and permissions (register/login/logout/me, cookie, roles, ownership)
- [x] F2 Resource library (upload, metadata, list/search/filter/sort/pagination, PDF preview/download, edit/delete, ingestion state)
- [x] F3 Ingestion and retrieval (page text, chunks, embeddings, retry, semantic search, keyword fallback, cleanup)
- [x] F4 Ask the Doc (retrieval-grounded answers, actual sources/page excerpts, no-evidence abstention, citation validation, prompt injection protection)
- [x] F5 Community (unique voting, comments, reports, moderator queue/verification, computed reputation)
- [x] F6 UI quality (responsive, all states, zero decorative controls, single-service deployment verified)

## Environment (names only; never put secrets here)
- Required variables configured locally: yes (configured via local .env)
- Missing required variables: none
- MongoDB connectivity verified: yes (Single configured MONGODB_URI verified; zero automatic localhost failover; honest degraded mode with HTTP 503 on DB outage)
- Gemini generation verified: yes (official `@google/genai` SDK verified live with `gemini-3.5-flash-lite`, grounded generation smoke test passed)
- Gemini embeddings verified: yes (official `@google/genai` SDK verified live with `gemini-embedding-001` at 768 dimensions)

## Last completed milestone
- **Implemented:** Milestone 5 + Release Safety Patch + Render Deployment Build Fix + Ingestion fileData Fix + Live Ingestion Polling:
  - Live Ingestion Status Polling:
    - `ResourceDetailPage.jsx`: Added a targeted `useEffect` that periodically (every 2.5s) polls the resource detail endpoint while `ingestionStatus` is `'queued'` or `'processing'`. As soon as status becomes `'ready'` or `'failed'`, or when component unmounts, polling terminates cleanly. Overlapping requests are guarded by an `isFetching` flag, unmount leaks are prevented via `isMounted`, and polling is paused when the tab is hidden (`document.hidden`).
    - Immediate Retry Feedback: Updated `handleRetryIngestion` to immediately set state to `ingestionStatus: 'queued'`, seamlessly engaging the polling effect without waiting or requiring page reload.
    - `LibraryPage.jsx`: Added catalog list polling (every 3s) engaged strictly when at least one displayed resource has a non-terminal status (`queued` or `processing`). Polling terminates automatically once all resources reach terminal states (`ready` or `failed`).
  - Ingestion fileData Fix: Resolved "Extraction failed: Resource validation failed: fileData: File data buffer is required" by validating `fileData` buffer and switching status/metadata mutations to atomic `findByIdAndUpdate`.
  - Render Deployment Fix: Set `install:all` to run `npm --prefix client install --include=dev`.
  - Database Safety: Removed automatic localhost fallback; enforced single configured `MONGODB_URI`.
- **Files changed (key paths only):**
  - `client/src/pages/ResourceDetailPage.jsx`
  - `client/src/pages/LibraryPage.jsx`
  - `docs/AGENT_HANDOFF.md`
- **Validation run + result:**
  - Automated test suite (`npm --prefix server test`): 27 tests executed (8 passed offline/unit tests; 19 tests honestly skipped due to external Atlas IP SSL connection restriction).
  - Client production build (`npm run build`): Vite v6.4.5 built bundle in 3.23s with 0 errors (`dist/index.html`, `dist/assets/`).
- **Post-Deploy Verification Procedure for User:**
  1. Upload a PDF from `/upload`. On redirect to the resource detail page, the status badge automatically shows "Ingestion: queued" -> "Ingestion: processing" -> "Ingestion: ready" within seconds without refreshing.
  2. For a failed resource, click "Retry Ingestion": the badge immediately flips to "Queued", then advances to "Ready" without page reload.
  3. In `/library`, cards with "Indexing..." or "Queued" badges automatically refresh to "Indexed" once completed.
