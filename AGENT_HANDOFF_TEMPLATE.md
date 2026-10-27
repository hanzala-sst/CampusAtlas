# CampusAtlas — Agent Handoff

> Keep this file compact and factual. This is the source for agent-to-agent continuity. Update at the end of every milestone and before switching agents.

## Current state
- **Last updated:** YYYY-MM-DD HH:MM IST
- **Current milestone:** 0 / 1 / 2 / 3 / 4 / 5
- **Git branch / last commit:**
- **App status:** not booted / client working / API working / end-to-end working / deployed

## Decisions locked
- React + Vite + Tailwind; Express + Mongoose; MongoDB Atlas; official `@google/genai` SDK.
- Auth uses HttpOnly JWT cookie; moderator assignment/verification is server-controlled.
- PDF upload limit 8 MiB; extract per page; chunks store page number and embedding metadata.
- Embedding model + dimension used by this repo (must be identical for all indexed chunks):
- Deployment target / current URL:

## Feature contract status
- [ ] F1 Identity and permissions (register/login/logout/me, cookie, roles, ownership)
- [ ] F2 Resource library (upload, metadata, list/search/filter/sort/pagination, PDF preview/download, edit/delete, ingestion state)
- [ ] F3 Ingestion and retrieval (page text, chunks, embeddings, retry, semantic search, keyword fallback, cleanup)
- [ ] F4 Ask the Doc (retrieval-grounded answers, actual sources/page excerpts, no-evidence abstention)
- [ ] F5 Community (unique voting, comments, reports, moderator queue/verification, computed reputation)
- [ ] F6 UI quality (responsive, all states, no decorative core controls)

## Environment (names only; never put secrets here)
- Required variables configured locally: yes/no/unknown
- Missing required variables:
- MongoDB connectivity verified: yes/no
- Gemini generation verified: yes/no
- Gemini embeddings verified: yes/no

## Last completed milestone
- **Implemented:**
- **Files changed (key paths only):**
- **Validation run + result:**
- **Known issues / accepted limitations:**

## Exact next task
1. 
2. 

## Recent agent activity
- YYYY-MM-DD HH:MM IST — milestone / change / test result / commit hash if available

## Handoff rule
The next agent must inspect actual code, `git status` and the latest test/build results before editing. Do not trust this file blindly if it conflicts with the repository state. Continue the exact next task above; don't recreate completed files/features or refactor unrelated code.
