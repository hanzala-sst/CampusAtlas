# CampusAtlas

CampusAtlas is a peer-powered academic knowledge hub. Students discover course-specific lecture notes, previous-year question papers (PYQs), lab manuals, and assignments; upload and preview PDFs; search by meaning; and ask questions strictly grounded in retrieved course material with verified provenance.

## Current Setup (Milestone 1 Baseline)

The project foundation has been established with a clean MERN structure:
- **Client (`client/`):** React 18, Vite, React Router 6, Tailwind CSS, Lucide icons. Coherent navigation shell and design convention states (loading, error, empty).
- **Server (`server/`):** Node.js Express, ES modules, Mongoose, Helmet, explicit CORS for development, centralized error handling, and `/api/health`.
- **Root Scripts:** Unified install, development, building, and running.

## Prerequisites

- Node.js (v18+ recommended; tested on v24.13)
- npm (v9+; tested on v11.6)
- MongoDB Atlas connection string (or local MongoDB on port 27017)

## Environment Configuration

Copy `.env.example` to `.env` in the root (or `server/.env`) and configure:
```bash
cp .env.example .env
```

Key environment variables:
- `PORT`: Port for Express backend (default: 5000)
- `NODE_ENV`: `development` or `production`
- `CLIENT_URL`: Client dev origin (default: `http://localhost:5173`)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Signing secret for JWT session cookies
- `GEMINI_API_KEY`: API key for official `@google/genai` SDK
- `GEMINI_GENERATION_MODEL`: `gemini-2.5-flash`
- `GEMINI_EMBEDDING_MODEL`: `gemini-embedding-001`
- `ADMIN_EMAILS`: Comma-separated emails to receive moderator role on registration

## Getting Started

### 1. Install Dependencies
```bash
npm run install:all
```
*(or run `npm install` in both `client` and `server`)*

### 2. Run in Development Mode
To run both server (port 5000) and client (port 5173) concurrently:
```bash
npm run dev
```
Or independently:
```bash
npm run dev:server
npm run dev:client
```

### 3. Build Client
```bash
npm run build
```

### 4. Health Check
Once server is running, visit:
```
http://localhost:5000/api/health
```

## Architectural Roadmap
- **Milestone 1 (Complete):** Workspace inspection, MERN baseline, health check, UI shell, design conventions, handoff documentation.
- **Milestone 2 (Next):** Identity (F1), Academic Resource Library (F2), and Community Trust & Moderation (F5).
- **Milestone 3:** Document Ingestion & Semantic Retrieval (F3) with page-mapped chunking and Gemini embeddings.
- **Milestone 4:** Grounded "Ask the Doc" RAG (F4) with structured source cards and evidence abstention.
- **Milestone 5:** Hardening, seed data, regression testing, and production deployment configuration.
