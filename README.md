# CampusAtlas

> Peer-powered academic knowledge hub featuring page-aware PDF ingestion, semantic search, and evidence-grounded study RAG with verified citations.

CampusAtlas enables university students to discover, verify, and interact with course-specific lecture notes, previous-year question papers (PYQs), lab manuals, and assignments. Students can upload and preview PDFs, search by meaning across academic materials, and ask questions strictly grounded in retrieved documents with verified page-level provenance.

---

## Architecture & Tech Stack

CampusAtlas is built as an end-to-end full-stack MERN application with a single-service production deployment model:

- **Client (`client/`)**:
  - React 18, Vite, React Router 6, Tailwind CSS, Lucide icons.
  - Complete UX states (responsive layouts, loading skeletons, empty states, error boundaries, accessible focus rings).
  - Production build outputs to `client/dist/`, which is statically served by Express in production with SPA route fallback.
- **Server (`server/`)**:
  - Node.js & Express using ES modules (`"type": "module"`).
  - MongoDB with Mongoose ODM (supports MongoDB Atlas with seamless local fallback).
  - Official Google GenAI SDK (`@google/genai`) for 768-dimensional query/chunk embeddings (`gemini-embedding-001`) and grounded study answer generation (`gemini-3.5-flash-lite` / `gemini-3.5-flash`).
  - In-process background ingestion worker with atomic concurrency lock (`activeIngestions` Set) and startup recovery.
  - Page-aware PDF parsing with `unpdf`, preserving 1-based page numbers and deterministic bounded chunking.
  - Security: Helmet security headers, HttpOnly JWT cookies (`ca_auth_token`), bcrypt password hashing, and centralized error sanitization.

---

## Core Feature Capabilities

### F1: Identity & Permissions
- Secure registration and login with cryptographically hashed passwords (bcrypt).
- Session management via HttpOnly, SameSite cookies (`ca_auth_token`).
- Role-based permissions (`student`, `moderator`) with server-controlled moderator assignment via `ADMIN_EMAILS`.
- Ownership-enforced mutations (editing metadata, deleting contributions).

### F2: Academic Resource Library
- Multi-attribute filtering (course code, semester 1–10, resource type, academic year).
- Safe PDF streaming endpoint (`GET /api/resources/:id/preview`) and download support.
- File upload pipeline with 8 MiB size limit, MIME validation, and `%PDF-` magic-bytes signature verification.
- Pagination, sorting (newest, top-rated, title), and document metadata inspection.

### F3: Ingestion & Semantic Retrieval
- Page-by-page PDF extraction using `unpdf` retaining authentic 1-based page numbers.
- Deterministic per-page chunking (~600 characters with ~120 character overlap).
- Vector embeddings generated via official `@google/genai` (`gemini-embedding-001`, 768 dimensions) with cosine similarity ranking.
- Ingestion state lifecycle (`queued` → `processing` → `ready` or `failed`) with automatic startup recovery and retry endpoint (`POST /api/resources/:id/retry`).
- Deterministic keyword fallback: if embedding services are unavailable or rate-limited, retrieval automatically falls back to regex keyword search over eligible chunks with honest user-facing mode notices (`mode: 'keyword_fallback'`).

### F4: Evidence-Grounded "Ask the Doc" RAG
- Authenticated Q&A endpoint (`POST /api/ask`) supporting scoped queries against a single document, a course/semester filter, or library-wide materials.
- Strict evidence-only grounding prompt with prompt injection defense (document excerpts treated as untrusted data).
- Inline citation badges `[S1]`, `[S2]` mapped to server-assigned candidate chunk IDs.
- Server-side citation enforcement invariant: verified source cards are constructed strictly from database records (`Chunk` and `Resource` models). Hallucinated source IDs are stripped, and unsupported claims are converted to honest abstentions.
- Honest abstention when no eligible evidence exists (`abstained: true`, `abstentionReason: 'NO_EVIDENCE_FOUND'`).

### F5: Community Moderation & Reputation
- Unique toggle upvoting/downvoting with atomic score recalculation.
- Threaded resource comments with ownership-checked deletion.
- Community reports with duplicate-open protection and moderator resolution queue.
- Moderator verification workflow (`/moderator`) with approval notes.
- Dynamic academic reputation calculation based on uploads, upvotes, and verified badges.

### F6: UI/UX Quality & Accessibility
- Fully responsive navigation and forms verified on desktop and mobile viewports.
- Real-time API and database health monitor in the navbar with degraded-mode notification.
- Comprehensive loading skeletons, error recovery buttons, and descriptive empty states.
- Zero decorative or fake buttons: every control executes real authenticated backend workflows.

---

## Environment Variables

Configure environment variables in `.env` (or via hosting provider dashboard). See `.env.example` for reference templates:

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server listen port (default: `5000`) |
| `NODE_ENV` | No | Environment mode: `development` or `production` |
| `CLIENT_URL` | No | Frontend origin for development CORS (default: `http://localhost:5173`) |
| `MONGODB_URI` | Yes | MongoDB connection string (Atlas URI or local `mongodb://127.0.0.1:27017/campusatlas`) |
| `JWT_SECRET` | Yes | Secret key for signing JWT cookies (min 32 characters in production) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for embeddings and grounded answer generation |
| `GEMINI_GENERATION_MODEL` | No | Generation model name (default: `gemini-3.5-flash-lite`, with fallback to `gemini-3.5-flash`) |
| `GEMINI_EMBEDDING_MODEL` | No | Embedding model name (default: `gemini-embedding-001`) |
| `GEMINI_EMBEDDING_DIMENSIONS`| No | Embedding dimension count (default: `768`) |
| `ADMIN_EMAILS` | No | Comma-separated emails automatically granted `moderator` role on registration |

*(Note: Never commit real API keys or `.env` files to version control).*

---

## Quick Start & Local Development

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MONGODB_URI, JWT_SECRET, and GEMINI_API_KEY
```

### 3. Start Development Servers
Run client and server concurrently:
```bash
npm run dev
```
- Client accessible at: `http://localhost:5173`
- Server API accessible at: `http://localhost:5000/api`

Or run independently:
```bash
npm run dev:server   # Starts Express backend with node --watch
npm run dev:client   # Starts Vite dev server
```

---

## Production Build & Single-Service Execution

CampusAtlas is optimized for single-service deployment where Express serves the compiled Vite SPA:

### 1. Build the Frontend
```bash
npm run build
```
Compiles Vite client assets into `client/dist/`.

### 2. Start the Production Server
```bash
npm start
```
Starts Express on `PORT` (default: `5000`), serving both the `/api/*` endpoints and the client SPA with automatic HTML5 history fallback.

---

## Testing & Quality Assurance

### Run Server Automated Test Suite
```bash
npm --prefix server test
```
Executes Node.js native test runner (`node --test`), verifying 23 automated tests across F1–F5:
- **`core.test.js`**: User registration, authentication, permissions, PDF upload validation, streaming, voting, comments, reports, moderator queue, and reputation calculation.
- **`ingestion.test.js`**: Page-aware PDF parsing, chunking, vector normalization, cosine similarity, sequential embedding batching, search with keyword fallback, and cascading deletions.
- **`ask.test.js`**: Grounded Q&A validation, authentication enforcement, zero-evidence abstention, DB source card mapping, hallucinated source stripping, unsupported answer conversion, keyword fallback mode, and malformed model output recovery.
- **`health.test.js`**: Health check and structured error formatting.

### Run Client Production Build Check
```bash
npm --prefix client run build
```
Validates TypeScript/JSX compilation, CSS bundle, and asset optimization.

---

## Evaluator Walkthrough & Demo

A structured 3–5 minute evaluation guide is available in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md), demonstrating:
1. Student registration & session creation.
2. PDF contribution with page-aware extraction and background embedding.
3. Semantic retrieval with explicit keyword fallback notice.
4. Grounded question answering citing real page excerpts and source cards.
5. Honest abstention when evidence is absent.
6. Community upvoting, comments, reporting, and moderator approval workflow.

---

## Deployment Guide (Render / Railway / PaaS)

To deploy CampusAtlas as a single web service:

1. **Build Command**:
   ```bash
   npm run install:all && npm run build
   ```
2. **Start Command**:
   ```bash
   npm start
   ```
3. **Environment Variables**:
   Provide `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, and `ADMIN_EMAILS` in the hosting dashboard.
4. **Health Check Path**:
   `/api/health`

---

## 🎥 Demo Video

Watch the CampusAtlas walkthrough to see the application in action, including PDF uploads, automatic document indexing, semantic search, AI-powered question answering with source citations, and community features.

📺 **[Watch the CampusAtlas Demo](https://drive.google.com/file/d/1LN7umOOgGKsStTV9elbTUgQjvn1yZPz8/view?usp=sharing)**

---

## Known Limitations & Bounds

- **Scan Limit**: In-memory cosine similarity search scans up to 1,000 candidate chunks for demo corpus scale. For enterprise-scale libraries (>50,000 chunks), migration to MongoDB Atlas Vector Search indexing is recommended.
- **PDF Size**: Document uploads are bounded to 8 MiB per PDF to maintain fast browser previews and predictable BSON document limits.
- **Conversational History**: In accordance with the core study RAG specification, "Ask the Doc" focuses on single-turn, grounded factual questions with verified provenance cards.
