# CampusAtlas — Build Playbook (Canonical Specification)

Use this file as the source of truth across all coding agents. Do not ask the user to restate decisions already recorded here. Update `docs/AGENT_HANDOFF.md` after each phase.

## Product promise

CampusAtlas is a peer-powered academic knowledge hub. Students discover course-specific lecture notes, previous-year questions (PYQs), lab manuals and assignments; upload and preview PDFs; search by meaning; ask questions grounded in retrieved course material; and help the community judge resource usefulness and correctness.

**Differentiator:** provenance and trust. AI answers must show supporting resource/page excerpts, state when available material is insufficient, and never present community popularity as proof of correctness. A “Verified” badge is granted only by a moderator. “Unverified” is an honest default.

## Hard constraints

- Ship a complete working product, not a landing page or UI mock. No fake AI answers or hardcoded success states.
- Preserve all existing working code. Inspect the repo and git status before editing; do not overwrite a populated repository or run destructive commands.
- Never expose API keys, database credentials, JWT secrets or uploaded private files. Keep secrets server-side and out of Git.
- Never claim a workflow is complete unless it has been exercised. Run the relevant tests/build after each phase and fix regressions before moving on.
- Keep the output/credit budget low: inspect only relevant files, make targeted edits, avoid rewriting unrelated files, do not print entire files or repeat the entire project summary, and report only changed files, commands/tests, failures and next action.
- When a coding agent is changed, the replacement must first read this playbook plus `docs/AGENT_HANDOFF.md`, inspect current `git status`/diff, and continue from actual code—not from assumptions.

## Locked architecture

- **Frontend:** React + Vite, JavaScript, Tailwind CSS, React Router. Use accessible, responsive components; avoid unnecessary state libraries.
- **Backend:** Node.js + Express, JavaScript ES modules or CommonJS consistently (choose one and retain it), Mongoose.
- **Database:** MongoDB Atlas. Store users, resources, votes, comments, reports, resource chunks and embeddings.
- **AI:** official `@google/genai` SDK only; API key stays on the server. Choose a currently available stable Gemini Flash generation model after checking official docs and configure it with an environment variable. For embeddings, prefer `gemini-embedding-001` with 768 dimensions and batch chunk inputs where supported; use `RETRIEVAL_DOCUMENT` for document chunks and `RETRIEVAL_QUERY` or `QUESTION_ANSWERING` for queries. Keep the embedding model and dimension configurable and consistent. Do not mix embedding models within one index; if the model changes, re-embed all existing chunks.
- **Retrieval:** implement reliable embedding similarity retrieval over stored MongoDB chunks for the initial bounded demo corpus. Keep retrieval behind a service interface so Atlas Vector Search can be enabled later without rewriting the RAG flow. Apply course/resource filters before ranking. Document the current implementation's scalability limits honestly. Do not make a required Atlas vector index setup a blocker for the core demo.
- **PDFs:** accept PDF only, validate MIME type and extension, set an 8 MiB max upload, extract text page-by-page using a maintained Node-compatible PDF parser, and retain page numbers. Store file bytes in MongoDB only if each resource document stays safely below MongoDB's 16 MiB document limit; exclude file bytes from all list queries. Serve previews through an authenticated/authorized API with the correct `application/pdf` response. Do not persist uploads to ephemeral deployment disk.
- **Auth:** hash passwords using bcrypt/bcryptjs; JWT in an HttpOnly cookie; protect private routes; authorization on every ownership/moderator operation. Use secure cookies in production and credentialed CORS only for configured client origins in development. In production, serve the built client from Express on the same origin if the host supports it.
- **Deployment target:** one web service for the built client and Express API + MongoDB Atlas, unless the existing repository already has a working deployment architecture. Keep provider choices configurable; do not commit credentials.

## Required functional scope (feature contract)

A feature is not done merely because its screen exists. The browser action, API, persistence, validation, loading/error/empty state and permission checks must work end-to-end.

### F1. Identity and permissions
- Register, log in, log out, and load current user.
- Password hashes only; unique normalized email; safe validation and helpful errors.
- Student and moderator roles. A normalized email in `ADMIN_EMAILS` may receive moderator role on registration; never allow the client to self-select a role.
- HTTP-only cookie auth; protected and ownership-scoped API operations.

### F2. Academic resource library
- Upload PDF with title, description, course code/name, subject, semester, academic year and resource type (`lecture-notes`, `pyq`, `lab-manual`, `assignment`, `reference`).
- Resource list with text search, filters, sort, pagination and useful empty/loading/error states.
- PDF preview and download; show metadata, uploader, uploaded date, processing state, verification state, votes and report status as appropriate.
- Ingestion status: `queued`/`processing`, `ready`, `failed`; a failed extraction/indexing run can be retried safely without duplicate chunks.
- Resource owner can edit metadata and delete their resource; moderator can manage all resources. Never allow a user to change role/verification via ordinary resource update.

### F3. Document ingestion and semantic retrieval
- Extract text per page; split into bounded overlapping chunks while retaining resource ID, title, course metadata, page number, chunk order and text.
- Create embeddings with the configured Gemini embedding model. Persist them in a separate chunk collection. Process modest batches sequentially and handle rate limits/API failures; mark failed ingestion clearly and permit retry.
- Semantic search should return useful chunks/resources by similarity, with filters. Also provide a basic keyword fallback if embedding service is unavailable; label fallback accurately and do not pretend it is semantic search.
- Re-upload/retry/delete must not leave orphaned chunks or stale embeddings.

### F4. Grounded “Ask the Doc” RAG
- Ask a question against one selected resource or a selected course/resource set.
- Retrieve relevant chunks first; send only retrieved context to Gemini, with explicit instructions not to use unsupported outside knowledge.
- Return answer text and structured sources: resource title, page number, excerpt and resource link/ID. Source cards must come from the actual retrieved chunks, not model-invented URLs/pages.
- When evidence is missing, clearly say the indexed material does not contain enough information. Do not invent citations.
- Save per-user conversation/question history if time permits after all core workflows pass; if implemented, enforce ownership. Do not let history distract from reliable retrieval and citations.

### F5. Community trust and feedback
- One upvote/downvote per user per resource; changing the vote replaces the prior vote and score stays consistent.
- Comments on resources with author, timestamp and deletion/edit permissions; validate lengths and escape rendered content.
- Report resource with a reason; users can see their own report outcome if supported. Avoid duplicate open reports from the same user/resource.
- Moderator queue to review reports and mark resources verified/unverified, resolve reports, or archive/remove unsuitable resources. Keep an audit trail of verification/status changes if practical.
- Contributor reputation is computed from actual persisted events (e.g. helpful votes received, moderator-verified uploads, reports upheld against their content); do not store a manually editable score. Avoid rewarding raw upload volume alone.

### F6. Usable product UI
- Product name CampusAtlas. Build a coherent, polished academic dashboard, not a generic template clone. Prioritize responsive layouts, strong hierarchy, readable typography, consistent spacing, clear resource metadata, and accessible buttons/forms.
- Main screens: landing/library, login/register, resource detail/PDF preview, upload/edit resource, Ask the Doc, profile/contributions, moderator review queue.
- Provide disabled/loading/success/error feedback and confirmation for destructive actions. API errors must be human-readable.
- Add realistic demo seed data or instructions and a repeatable end-to-end demo path. Never seed fake AI answers as if generated live.

## Data model contract (adapt implementation details only when justified)

- `User`: name, normalized email (unique), passwordHash, role (`student`/`moderator`), createdAt.
- `Resource`: metadata, uploadedBy, fileName, mimeType, fileSize, fileData (if bounded BSON storage is used), pageCount, ingestionStatus, ingestionError (safe message), verificationStatus (`unverified`/`verified`/`flagged`/`archived`), verification metadata, createdAt/updatedAt.
- `Chunk`: resourceId, pageNumber, chunkIndex, text, embedding array, embeddingModel, embeddingDimensions, createdAt. Index resourceId/page/chunk for retrieval/deletion.
- `Vote`: userId, resourceId, value (-1 or 1), unique compound index `{userId, resourceId}`.
- `Comment`: resourceId, userId, body, timestamps.
- `Report`: resourceId, reporterId, reason, status (`open`/`resolved`/`dismissed`), moderator resolution fields, timestamps; unique open-report handling in service logic.
- If Q&A history is built: `Conversation`/`Message` with owner and validated source chunk references.

Use Mongoose schemas, timestamps, useful indexes, input validation and centralized error handling. Never return passwordHash, fileData, or embedding arrays in ordinary API responses.

## Engineering standards

- Use a small service/controller/route structure; keep Gemini, PDF extraction, ingestion and retrieval logic outside route handlers.
- Consistent API response shape and HTTP status codes. Validate IDs, request bodies, upload type/size and query parameters. Return 401/403/404/409/422/429/500 appropriately.
- Rate limit authentication and AI endpoints; set Helmet; keep CORS origins explicit; avoid logging secrets, passwords, file contents or raw API responses.
- Create `.env.example` with names and safe placeholders only. At minimum: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `GEMINI_GENERATION_MODEL`, `GEMINI_EMBEDDING_MODEL`, `GEMINI_EMBEDDING_DIMENSIONS`, `CLIENT_URL`, `ADMIN_EMAILS`, `NODE_ENV`, `PORT`.
- Add tests for critical pure logic and APIs where possible. At minimum test similarity ranking, chunking/page metadata, auth protections, vote uniqueness/score behavior and grounded-source response shape.
- Keep meaningful Git commits by logical milestone where Git is initialized. Never amend/rewrite the user's commits without asking.

## Milestone order

1. **Bootstrap + guardrails:** inspect repo; create/repair minimal client/server scripts, config, env example, health check, handoff file and baseline build. Do not begin a destructive rewrite.
2. **Core product:** auth, models, protected routes, resource upload/list/filter/detail/preview/download, comments, votes, reports, moderator verification/review and reputation.
3. **RAG pipeline:** PDF extraction with page mapping, chunk persistence, embedding batches, ingestion states/retry, semantic retrieval and keyword fallback.
4. **Ask the Doc:** grounded answers + actual source cards and no-evidence behavior; wire into real UI.
5. **Hardening + release:** integration/regression checks, responsive/error states, seed/demo path, README, deployment config, build verification and demo script.

Do not start milestone 3 while the API and resource workflow from milestone 2 is broken. Do not start visual polishing as a substitute for end-to-end implementation.

## Definition of done

- Clean install/start instructions work.
- Client production build succeeds; server boots and `/api/health` reports status.
- Real MongoDB persistence for all implemented workflows.
- The five required workflows have been walked end-to-end; no core buttons are decorative.
- A PDF upload reaches `ready`, can be previewed, has page-mapped chunks/embeddings, can be found semantically and can answer at least one relevant question with valid source cards.
- Weak/no evidence produces a clear abstention instead of fabricated answer/citation.
- Voting uniqueness, comments, reports, moderator verification and permissions are checked.
- Missing Gemini configuration produces a clear, non-crashing AI-unavailable state; it must not generate fake output.
- README contains problem, target users, features, stack, architecture, setup, environment variables, API overview, known limitations, deployment and demo steps.
- No secrets committed. Git status and build/test results are recorded in handoff.

## Agent operating protocol

At the start of every prompt:
1. Read this playbook and `docs/AGENT_HANDOFF.md` if present.
2. Inspect `git status --short`, relevant files, package scripts and current tests before changing code.
3. State only material blockers or assumptions. If no user decision is essential, make the safest compatible decision and record it.
4. Implement the named milestone as one coherent vertical slice; do not merely propose a plan or output example snippets.
5. Run commands/tests/build; fix issues created by the changes.
6. Update `docs/AGENT_HANDOFF.md`: completed features, changed files, validations and exact next task; update feature checkboxes accurately.
7. Respond in a compact report: done, tests, known blockers, next prompt. Do not paste large code diffs unless asked.

If an external API or package fails, first verify the installed version and official API, then make the smallest compatibility fix. Do not replace entire modules or change established architecture to work around a narrow error.
