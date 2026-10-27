# CampusAtlas — Agent Handoff

> Keep this file compact and factual. This is the source for agent-to-agent continuity. Update at the end of every milestone and before switching agents.

## Current state
- **Last updated:** 2026-10-27 14:20 IST
- **Current milestone:** 3 (Complete)
- **Git branch / last commit:** master / 0857830 (Milestone 3 implementation ready)
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
- Bounded scan limit: Initial in-memory cosine scan limit set to 1000 candidate chunks for demo corpus before Atlas Vector Search migration.
- Ingestion state machine: `queued` → `processing` → `ready` or `failed`. Background worker with in-process lock (`activeIngestions` Set) and startup recovery.
- Keyword fallback: Automatic graceful failover to deterministic keyword matching over eligible chunk text when embedding service is unavailable, with explicit mode labelling (`mode: 'keyword_fallback'`).
- Centralized error handling returns uniform shape: `{ success: false, error: { message, code, details } }`.

## Feature contract status
- [x] F1 Identity and permissions (register/login/logout/me, cookie, roles, ownership)
- [x] F2 Resource library (upload, metadata, list/search/filter/sort/pagination, PDF preview/download, edit/delete, ingestion state)
- [x] F3 Ingestion and retrieval (page text, chunks, embeddings, retry, semantic search, keyword fallback, cleanup)
- [ ] F4 Ask the Doc (retrieval-grounded answers, actual sources/page excerpts, no-evidence abstention)
- [x] F5 Community (unique voting, comments, reports, moderator queue/verification, computed reputation)
- [ ] F6 UI quality (responsive, all states, no decorative core controls)

*(Note: F4 remains scheduled for Milestone 4; no fake AI answers or hardcoded success states exist.)*

## Environment (names only; never put secrets here)
- Required variables configured locally: yes (configured via local .env)
- Missing required variables: none
- MongoDB connectivity verified: yes (MongoDB Atlas connected and verified against test suite)
- Gemini generation verified: no (scheduled for Milestone 4)
- Gemini embeddings verified: yes (official `@google/genai` SDK verified live with `gemini-embedding-001` at 768 dimensions)

## Last completed milestone
- **Implemented:** Milestone 3 (Page-Aware PDF Ingestion & Semantic Retrieval — F3):
  - Extracted text page-by-page using `unpdf` retaining accurate 1-based page numbers; rejection of empty/scanned PDFs (`pdfService.js`).
  - Deterministic bounded overlapping chunking independently per page (`pdfService.js`).
  - Google GenAI embedding service with `gemini-embedding-001` at 768 dimensions, vector normalization, cosine similarity, sequential batching, and exponential backoff retry (`embeddingService.js`).
  - Chunk model (`Chunk.js`) indexing resourceId, page, chunk order, and text.
  - In-process background ingestion worker with atomic concurrency lock, status transitions (`queued` → `processing` → `ready`/`failed`), startup recovery, and authenticated idempotent retry endpoint (`POST /api/resources/:id/retry`) (`ingestionService.js`).
  - Cascading deletion of chunks on resource removal.
  - Semantic similarity search endpoint (`GET /api/search`) with eligible resource filtering (ready + non-archived), bounded scan, cosine ranking, and explicit `keyword_fallback` failover (`search.js`).
  - Frontend integration: Library page with live semantic/keyword search mode indicators, source cards with excerpts and page numbers; ResourceCard and ResourceDetailPage with real ingestion badges (`ready`, `processing`, `failed`, `queued`) and working "Retry Ingestion" button.
- **Files changed (key paths only):**
  - `server/package.json`
  - `server/src/models/Chunk.js`, `server/src/models/Resource.js`
  - `server/src/services/pdfService.js`, `server/src/services/embeddingService.js`, `server/src/services/ingestionService.js`
  - `server/src/routes/search.js`, `server/src/routes/resources.js`
  - `server/src/app.js`, `server/src/server.js`
  - `server/test/ingestion.test.js`
  - `client/src/services/api.js`
  - `client/src/components/ResourceCard.jsx`
  - `client/src/pages/ResourceDetailPage.jsx`, `client/src/pages/LibraryPage.jsx`
  - `docs/AGENT_HANDOFF.md`
- **Validation run + result:**
  - Automated test suite (`node --test`): 15 tests passed, 0 failed across F1, F2, F3, and F5 (9.95s).
  - Live smoke test: Verified live small PDF extraction and real Gemini 768-dim embedding generation against live MongoDB Atlas.
  - Client production build: `vite build` completed in 5.45s with 0 errors.
- **Known issues / accepted limitations:**
  - In-memory cosine scan bounded to 1,000 candidate chunks for initial demo corpus before Atlas Vector Search migration.
  - Q&A generation ("Ask the Doc" F4) is scheduled for Milestone 4.

## Exact next task
1. Milestone 4: Evidence-Grounded "Ask the Doc" RAG (F4) — Grounded question answering strictly against retrieved chunks, structured source cards (title, page number, excerpt), honest abstention when evidence is insufficient, and integration with the Ask the Doc UI.

## Recent agent activity
- 2026-10-27 12:35 IST — Milestone 1 completed: full MERN foundation, health check, UI shell, handoff (commit 18186da).
- 2026-10-27 13:50 IST — Milestone 2 completed: F1, F2, F5 core product vertical slice (commit 64cc46b / 0857830).
- 2026-10-27 14:20 IST — Milestone 3 completed: F3 page-aware PDF extraction, 768-dim embeddings, background worker, semantic retrieval, and keyword fallback.

## Handoff rule
The next agent must inspect actual code, `git status` and the latest test/build results before editing. Do not trust this file blindly if it conflicts with the repository state. Continue the exact next task above; don't recreate completed files/features or refactor unrelated code.
