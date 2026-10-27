# CampusAtlas — Agent Handoff

> Keep this file compact and factual. This is the source for agent-to-agent continuity. Update at the end of every milestone and before switching agents.

## Current state
- **Last updated:** 2026-10-27 16:55 IST
- **Current milestone:** 5 (Complete — Final Hardening & Submission Ready)
- **Git branch / last commit:** master / 1423cee (feat(hardening): complete Milestone 5 UI quality, hardening, demo script & submission readiness)
- **App status:** client working / API working / end-to-end working / single-service deployment verified

## Decisions locked
- React + Vite + Tailwind; Express + Mongoose; MongoDB Atlas (with local 127.0.0.1:27017 fallback); official `@google/genai` SDK.
- Consistent ES modules (`"type": "module"`) across client and server.
- Auth uses HttpOnly JWT cookie (`ca_auth_token`, SameSite=Lax/None, Secure in prod); moderator assignment/verification is server-controlled via `ADMIN_EMAILS`.
- PDF upload limit 8 MiB; magic bytes validated (`%PDF-` / 0x255044462D) alongside MIME and extension.
- Bounded BSON storage for PDF file bytes in MongoDB (fileData excluded by default from queries and lists).
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
- MongoDB connectivity verified: yes (Atlas connection with automatic local `127.0.0.1:27017` failover verified in test suite)
- Gemini generation verified: yes (official `@google/genai` SDK verified live with `gemini-3.5-flash-lite`, grounded generation smoke test passed)
- Gemini embeddings verified: yes (official `@google/genai` SDK verified live with `gemini-embedding-001` at 768 dimensions)

## Last completed milestone
- **Implemented:** Milestone 5 (UI Quality, End-to-End Hardening, Deployment & Submission Readiness — F6):
  - Resilient Database Connectivity: Added local MongoDB connection failover (`127.0.0.1:27017/campusatlas`) in `server/src/config/db.js` when external Atlas IP whitelist or TLS connection drops.
  - Route and Link Hardening: Added `/login` and `/register` route redirects in `client/src/App.jsx` pointing to `/auth`; normalized navigation links in `AskDocPage.jsx`.
  - Single-Service Express Verification: Tested and verified Express serving compiled Vite client SPA from `client/dist` with non-API wildcard fallback (`GET /ask` -> 200 HTML, `GET /api/health` -> 200 JSON).
  - Evaluator Demo Script: Created `docs/DEMO_SCRIPT.md` providing a structured 3–5 minute evaluation guide covering user registration, PDF upload, background ingestion, semantic search, grounded Q&A with citations, honest abstention, and community moderation.
  - Comprehensive README: Completely rewritten `README.md` covering architecture, feature capabilities F1–F6, environment variables table, quick start, test execution, demo walkthrough, and deployment guide.
  - Security Check: Confirmed `.env` is ignored by Git and untracked; verified `.env.example` contains only safe placeholders; confirmed no API keys or credentials are committed.
- **Files changed (key paths only):**
  - `server/src/config/db.js`
  - `client/src/App.jsx`
  - `client/src/pages/AskDocPage.jsx`
  - `README.md`
  - `docs/DEMO_SCRIPT.md` (new)
  - `docs/AGENT_HANDOFF.md`
- **Validation run + result:**
  - Automated test suite (`npm --prefix server test`): 23 tests passed, 0 failed across F1, F2, F3, F4, and F5 (10.47s).
  - Client production build (`npm --prefix client run build`): Vite build passed in 5.48s with 0 errors.
  - Single-service local smoke test: Verified Express serving `client/dist` and SPA routing on port 5002.
  - Live Gemini generation: Verified live grounded answer synthesis with `gemini-3.5-flash-lite`.
- **Known issues / accepted limitations:**
  - Scan limit: In-memory cosine scan limit bounded to 1,000 candidate chunks for initial demo corpus before Atlas Vector Search migration.
  - Cloud deployment: Single-service production architecture is verified locally and ready for PaaS (Render, Railway, Fly.io); live public cloud deployment requires hosting account credentials which are not provided in this environment.
