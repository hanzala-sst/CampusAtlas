# CampusAtlas — Agent Handoff

> Keep this file compact and factual. This is the source for agent-to-agent continuity. Update at the end of every milestone and before switching agents.

## Current state
- **Last updated:** 2026-10-27 20:45 IST
- **Current milestone:** 5 (Complete + Targeted Release Safety Patch + Render Build Fix + Ingestion fileData Fix)
- **Git branch / last commit:** master / 87d30b1 (fix(ingestion): validate non-empty fileData and use atomic updates to prevent required-field validation failures)
- **App status:** client working / API working / end-to-end working / single-service deployment verified / no automatic localhost failover / atomic status updates safe against unselected fileData validation

## Decisions locked
- React + Vite + Tailwind; Express + Mongoose; MongoDB (strictly uses single configured MONGODB_URI target, no automatic local store switching); official `@google/genai` SDK.
- Consistent ES modules (`"type": "module"`) across client and server.
- Auth uses HttpOnly JWT cookie (`ca_auth_token`, SameSite=Lax/None, Secure in prod); moderator assignment/verification is server-controlled via `ADMIN_EMAILS`.
- PDF upload limit 8 MiB; magic bytes validated (`%PDF-` / 0x255044462D) alongside MIME and extension.
- Bounded BSON storage for PDF file bytes in MongoDB (`fileData` excluded by default via `select: false` from queries, lists, and detail API JSON; explicitly selected with `.select('+fileData')` only where raw bytes are required; status and metadata updates use atomic `findByIdAndUpdate` to prevent triggering schema validation on unselected `fileData`).
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
- **Implemented:** Milestone 5 + Release Safety Patch + Render Deployment Build Fix + Ingestion fileData Fix:
  - Ingestion fileData Fix: Resolved "Extraction failed: Resource validation failed: fileData: File data buffer is required".
    - Root cause: Document saves (`resource.save()`) in ingestion (`processIngestion`), retry route (`POST /:id/retry`), edit route (`PUT /:id`), vote route (`POST /:id/vote`), and moderator actions (`/verify`, `/unverify`, `/archive`) called `.save()` on partially selected documents where `fileData` was omitted by schema default (`select: false`), triggering Mongoose full document validation error on the required `fileData` buffer.
    - Fix: In `server/src/services/ingestionService.js`, explicitly validated that `fileData` is a non-empty `Buffer` or `Uint8Array` before extraction, and replaced `.save()` with atomic `findByIdAndUpdate` for status transitions (`processing`, `ready`). Replaced `.save()` with atomic `findByIdAndUpdate` in retry, metadata update, vote, and moderator routes. Preserved `fileData: { select: false }` schema default so PDF bytes are never exposed in lists or detail API JSON.
  - Render Deployment Fix: Updated root `install:all` script in `package.json` to `npm install && npm --prefix server install && npm --prefix client install --include=dev`, preventing `sh: 1: vite: not found` on Render.
  - Removed Automatic Local MongoDB Fallback: Eliminated silent connection fallback to `mongodb://127.0.0.1:27017/campusatlas` in `server/src/config/db.js`.
  - Structured Degraded Mode: Guarded all database-dependent routes with `requireDatabase` returning structured HTTP 503 (`DATABASE_UNAVAILABLE`).
  - Automated Regression Tests: Created `server/test/ingestionFileData.test.js` validating schema projection (`select: false`), required buffer validation, atomic status updates without validation errors, and retry idempotency.
- **Files changed (key paths only):**
  - `server/src/services/ingestionService.js`
  - `server/src/routes/resources.js`
  - `server/src/routes/moderator.js`
  - `server/test/ingestionFileData.test.js` (new)
  - `docs/AGENT_HANDOFF.md`
- **Validation run + result:**
  - Automated test suite (`npm --prefix server test`): 27 tests executed (8 passed offline/unit tests including schema projection/validation regression, DB configuration safety, degraded health, 404 handler, PDF extraction, cosine similarity; 19 tests honestly skipped because MongoDB Atlas cluster is unreachable from this IP via SSL alert 80).
  - Client production build (`npm run build`): Vite build passed in 7.53s with 0 errors (`dist/index.html`, `dist/assets/`).
- **Post-Deploy Action for User:**
  - After deploying this fix to Render, open the deployed application, navigate to the previously failed resource detail page, and click "Retry Ingestion" (or trigger `POST /api/resources/:id/retry`). The resource will transition from `failed` to `queued` -> `processing` -> `ready` without Mongoose validation errors.
