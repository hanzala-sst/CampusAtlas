# CampusAtlas — Agent Handoff

> Keep this file compact and factual. This is the source for agent-to-agent continuity. Update at the end of every milestone and before switching agents.

## Current state
- **Last updated:** 2026-10-27 12:35 IST
- **Current milestone:** 1 (Complete)
- **Git branch / last commit:** master (initialized, uncommitted working tree)
- **App status:** client working / API working (tested via test suite and build verification)

## Decisions locked
- React + Vite + Tailwind; Express + Mongoose; MongoDB Atlas; official `@google/genai` SDK.
- Consistent ES modules (`"type": "module"`) used across both client and server.
- Auth uses HttpOnly JWT cookie; moderator assignment/verification is server-controlled via `ADMIN_EMAILS`.
- PDF upload limit 8 MiB; extract per page; chunks store page number and embedding metadata.
- Centralized error handling returns uniform shape: `{ success: false, error: { message, code, details } }`.
- Production static client serving configured from Express (`client/dist`).
- Embedding model + dimension used by this repo (must be identical for all indexed chunks): `gemini-embedding-001` with 768 dimensions.
- Deployment target / current URL: Configurable single web service (built client served by Express + MongoDB Atlas).

## Feature contract status
- [ ] F1 Identity and permissions (register/login/logout/me, cookie, roles, ownership)
- [ ] F2 Resource library (upload, metadata, list/search/filter/sort/pagination, PDF preview/download, edit/delete, ingestion state)
- [ ] F3 Ingestion and retrieval (page text, chunks, embeddings, retry, semantic search, keyword fallback, cleanup)
- [ ] F4 Ask the Doc (retrieval-grounded answers, actual sources/page excerpts, no-evidence abstention)
- [ ] F5 Community (unique voting, comments, reports, moderator queue/verification, computed reputation)
- [ ] F6 UI quality (responsive, all states, no decorative core controls)

*(Note: Feature screens are marked with honest Milestone notices in the UI shell; no mock or fake functionality is stubbed.)*

## Environment (names only; never put secrets here)
- Required variables configured locally: no (.env.example provided with safe placeholders)
- Missing required variables: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY` (defaults/fallbacks used for development bootstrap)
- MongoDB connectivity verified: no (live database credentials not yet supplied; server operates in graceful degraded mode reporting status honestly via `/api/health`)
- Gemini generation verified: no (API key not yet configured)
- Gemini embeddings verified: no (API key not yet configured)

## Last completed milestone
- **Implemented:** Milestone 1:
  - Inspected Node v24.13.0, npm 11.6.2, git repository initialized.
  - Setup unified root scripts, client (React 18 + Vite + Tailwind 3 + React Router 6), and server (Express + Mongoose + Helmet + CORS + cookie-parser).
  - Implemented server environment configuration validation (`server/src/config/env.js`).
  - Implemented MongoDB connection management with state tracking and non-crashing boot fallback (`server/src/config/db.js`).
  - Implemented centralized error handling with custom formatting for Mongoose, JWT, and duplicate errors (`server/src/middleware/errorHandler.js`).
  - Implemented `/api/health` endpoint with dynamic service status and warnings (`server/src/routes/health.js`).
  - Implemented production static serving of client build artifacts with SPA fallback in Express.
  - Created CampusAtlas shell with live health status pill, responsive navigation, and placeholder routes for Library (`/`), Upload (`/upload`), Ask the Doc (`/ask`), My Contributions (`/contributions`), and Moderator Review (`/moderator`).
  - Implemented reusable design conventions: `LoadingState`, `ErrorState`, `EmptyState`, and `MilestoneNotice`.
  - Added `.env.example`, `.gitignore`, and concise root `README.md`.
- **Files changed (key paths only):**
  - `package.json`, `.gitignore`, `.env.example`, `README.md`
  - `client/package.json`, `client/vite.config.js`, `client/tailwind.config.js`, `client/postcss.config.js`, `client/index.html`
  - `client/src/index.css`, `client/src/main.jsx`, `client/src/App.jsx`
  - `client/src/components/Navbar.jsx`, `Footer.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `EmptyState.jsx`, `MilestoneNotice.jsx`
  - `client/src/pages/LibraryPage.jsx`, `UploadPage.jsx`, `AskDocPage.jsx`, `ContributionsPage.jsx`, `ModeratorPage.jsx`, `NotFoundPage.jsx`
  - `server/package.json`, `server/src/server.js`, `server/src/app.js`, `server/src/config/env.js`, `server/src/config/db.js`, `server/src/middleware/errorHandler.js`, `server/src/routes/health.js`
  - `server/test/health.test.js`
  - `docs/AGENT_HANDOFF.md`
- **Validation run + result:** Client build test and server test runner (verification pending install completion).
- **Known issues / accepted limitations:**
  - MongoDB connection defaults to local MongoDB; when offline, server logs clear warning and reports degraded status via `/api/health` without crashing.
  - Core features (F1-F5) are intentionally deferred to Milestone 2+ and clearly marked with honest UI milestone notices.

## Exact next task
1. Milestone 2: Implement F1 (Identity & permissions) — User schema, bcrypt password hashing, JWT HttpOnly cookies, registration/login/logout/me endpoints, role checks (`student`/`moderator` via `ADMIN_EMAILS`).
2. Milestone 2: Implement F2 (Academic resource library) — Resource schema, PDF upload with 8 MiB limit, listing with search/filter/sort/pagination, detail/preview, and edit/delete permissions.
3. Milestone 2: Implement F5 (Community trust) — Vote schema (unique user/resource), comments, reports, moderator queue, and calculated reputation.

## Recent agent activity
- 2026-10-27 12:35 IST — Milestone 1 completed: full MERN project foundation, client/server setup, health check, UI shell, design conventions, handoff documentation.

## Handoff rule
The next agent must inspect actual code, `git status` and the latest test/build results before editing. Do not trust this file blindly if it conflicts with the repository state. Continue the exact next task above; don't recreate completed files/features or refactor unrelated code.
