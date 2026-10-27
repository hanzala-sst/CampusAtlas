# CampusAtlas — Agent Handoff

> Keep this file compact and factual. This is the source for agent-to-agent continuity. Update at the end of every milestone and before switching agents.

## Current state
- **Last updated:** 2026-10-27 13:50 IST
- **Current milestone:** 2 (Complete)
- **Git branch / last commit:** master / 18186da (Working tree contains completed Milestone 2 implementation)
- **App status:** client working / API working / end-to-end working

## Decisions locked
- React + Vite + Tailwind; Express + Mongoose; MongoDB Atlas; official `@google/genai` SDK.
- Consistent ES modules (`"type": "module"`) across client and server.
- Auth uses HttpOnly JWT cookie (`ca_auth_token`, SameSite=Lax/None, Secure in prod); moderator assignment/verification is server-controlled via `ADMIN_EMAILS`.
- PDF upload limit 8 MiB; magic bytes validated (`%PDF-` / 0x255044462D) alongside MIME and extension.
- Bounded BSON storage for PDF file bytes in MongoDB (fileData excluded by default from queries and lists).
- Centralized error handling returns uniform shape: `{ success: false, error: { message, code, details } }`.
- Voting uses unique compound index `{ userId, resourceId }` with atomic score recalculation.
- Contributor reputation is calculated dynamically from persisted events (+2 per upvote, +10 per verified doc, -1 per downvote, -5 per upheld report; 0 for raw upload count).
- Production static client serving configured from Express (`client/dist`).
- Embedding model + dimension used by this repo: `gemini-embedding-001` with 768 dimensions.
- Deployment target: Configurable single web service (built client served by Express + MongoDB Atlas).

## Feature contract status
- [x] F1 Identity and permissions (register/login/logout/me, cookie, roles, ownership)
- [x] F2 Resource library (upload, metadata, list/search/filter/sort/pagination, PDF preview/download, edit/delete, ingestion state)
- [ ] F3 Ingestion and retrieval (page text, chunks, embeddings, retry, semantic search, keyword fallback, cleanup)
- [ ] F4 Ask the Doc (retrieval-grounded answers, actual sources/page excerpts, no-evidence abstention)
- [x] F5 Community (unique voting, comments, reports, moderator queue/verification, computed reputation)
- [ ] F6 UI quality (responsive, all states, no decorative core controls)

*(Note: F3 and F4 remain scheduled for Milestones 3 and 4; not faked in UI or backend.)*

## Environment (names only; never put secrets here)
- Required variables configured locally: yes (configured via local .env)
- Missing required variables: `GEMINI_API_KEY` (needed for Milestone 3 embeddings)
- MongoDB connectivity verified: yes (MongoDB Atlas connected and verified against test suite)
- Gemini generation verified: no (scheduled for Milestone 4)
- Gemini embeddings verified: no (scheduled for Milestone 3)

## Last completed milestone
- **Implemented:** Milestone 2 (Core Product Vertical Slice: F1 + F2 + F5):
  - F1: User model with normalized unique email, bcrypt hash, server-assigned role (`student`/`moderator` via `ADMIN_EMAILS`). Endpoints for `register`, `login`, `logout`, `me` with HttpOnly JWT cookies and rate limiting.
  - F2: Resource model with bounded BSON storage (max 8 MiB), PDF magic byte validation, paginated list with text search & filters, detail endpoint, inline PDF preview and download streaming, and owner/moderator metadata edit and delete.
  - F5: Vote model with unique compound index `{ userId, resourceId }`, atomic score calculation, comments with delete permissions, reports with duplicate-open-report protection, moderator queue with verify/unverify/archive and report resolution, and calculated contributor reputation service.
  - Frontend: AuthContext with persistent cookie session, AuthPage (sign in / register), ResourceCard with live voting, ResourceDetailPage with PDF preview iframe, comments, report modal, and edit/delete; updated LibraryPage, UploadPage, ContributionsPage, and ModeratorPage.
- **Files changed (key paths only):**
  - `server/package.json`
  - `server/src/models/User.js`, `Resource.js`, `Vote.js`, `Comment.js`, `Report.js`
  - `server/src/middleware/auth.js`
  - `server/src/services/reputationService.js`
  - `server/src/routes/auth.js`, `resources.js`, `moderator.js`, `users.js`
  - `server/src/app.js`
  - `server/test/core.test.js`
  - `client/src/services/api.js`, `client/src/context/AuthContext.jsx`
  - `client/src/components/Navbar.jsx`, `ResourceCard.jsx`
  - `client/src/pages/AuthPage.jsx`, `ResourceDetailPage.jsx`, `LibraryPage.jsx`, `UploadPage.jsx`, `ContributionsPage.jsx`, `ModeratorPage.jsx`, `App.jsx`
  - `docs/AGENT_HANDOFF.md`
- **Validation run + result:**
  - Server test suite: `node --test` executed 10 tests across F1, F2, F5, config, and health checks. Result: 10 passed, 0 failed (11.5s).
  - Client production build: `vite build` completed in 5.39s with 0 errors.
- **Known issues / accepted limitations:**
  - Uploaded resources remain in `queued` ingestion status until Milestone 3 implements text extraction and chunk embedding.

## Exact next task
1. Milestone 3: Implement Document Ingestion and Semantic Retrieval (F3) — Install `@google/genai` and `pdf-parse` (or compatible maintained parser), extract text per page retaining page numbers, split into bounded overlapping chunks, generate embeddings with `gemini-embedding-001` (768 dimensions), persist Chunks in MongoDB, and implement semantic retrieval with keyword fallback.

## Recent agent activity
- 2026-10-27 12:35 IST — Milestone 1 completed: full MERN foundation, health check, UI shell, design conventions, handoff documentation (commit 18186da).
- 2026-10-27 13:50 IST — Milestone 2 completed: F1 (Identity), F2 (Resource Library), F5 (Community Trust & Moderation), end-to-end integration and 10/10 test pass.

## Handoff rule
The next agent must inspect actual code, `git status` and the latest test/build results before editing. Do not trust this file blindly if it conflicts with the repository state. Continue the exact next task above; don't recreate completed files/features or refactor unrelated code.
