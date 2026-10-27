# CampusAtlas — Evaluator Demo Script (3–5 Minutes)

This script provides an evaluator with an end-to-end walkthrough of CampusAtlas, demonstrating all core features (F1–F5) and UX quality (F6).

---

## Prerequisites & Setup

1. **Start the application** in single-service or development mode:
   ```bash
   # Option A: Full dev server (client + server concurrently)
   npm run dev

   # Option B: Single-service production build & start
   npm run build
   npm start
   ```
2. **Access the application** at `http://localhost:5173` (dev) or `http://localhost:5000` (production).
3. **Verify API & Database health**:
   Observe the status pill in the top-right navbar ("Online" with green indicator).

---

## Step 1: User Registration & Session (F1)

1. Click **Sign In** in the navbar (or visit `/auth`).
2. Switch to the **Create Account** tab.
3. Fill in the student registration details:
   - **Full Name**: `Priya Sharma`
   - **Academic Email**: `priya.sharma@campusatlas.edu`
   - **Password**: `StudentPass123!`
4. Click **Register**.
5. **Observed Behavior**:
   - The user is authenticated automatically via a secure HttpOnly JWT cookie (`ca_auth_token`).
   - The navbar immediately reflects the signed-in state, showing the student's name, role badge (`student`), and an initial reputation score (`0`).

---

## Step 2: Upload an Academic PDF (F2)

1. Click **Upload PDF** in the navbar (or visit `/upload`).
2. Attach or drag-and-drop a sample academic PDF (e.g. lecture slides or syllabus, under 8 MiB).
3. Complete the required course metadata:
   - **Document Title**: `Data Structures & Algorithms - Lecture 1`
   - **Course Code**: `CS201`
   - **Course Name**: `Data Structures and Algorithms`
   - **Subject**: `Computer Science`
   - **Semester**: `Semester 3`
   - **Academic Year**: `2024-2025`
   - **Resource Type**: `Notes`
   - **Description**: `Introduction to binary search and asymptotic time complexities.`
4. Click **Upload Document**.
5. **Observed Behavior**:
   - The file's MIME type and `%PDF-` magic bytes signature are validated on the server.
   - You are redirected to `/resources/:id`.
   - The document badge displays `Processing` while the server background worker parses pages with `unpdf`, chunks the text per page, and generates 768-dimensional embeddings.
   - Within seconds, the badge updates to **Ready** with green checkmark.

---

## Step 3: PDF Preview & Ingestion Verification (F2 & F3)

1. On the document detail page (`/resources/:id`):
   - Notice the document metadata: course code `CS201`, verified page count, and file size.
   - Inspect the embedded PDF preview iframe and download button.
   - Notice the **Ask this Doc** action button in the preview header.
2. In the bottom metadata section, verify that **Indexed Chunks** reflects the page-aware chunk count.

---

## Step 4: Semantic Search with Fallback Transparency (F3)

1. Navigate to the **Library** (`/`).
2. In the search box, enter a conceptual query: `logarithmic search in sorted list`.
3. Press Enter or click **Search**.
4. **Observed Behavior**:
   - The application performs semantic retrieval against the indexed vector embeddings.
   - An emerald badge appears: `Semantic Vector Search (gemini-embedding-001 • 768-dim)`.
   - Search results display matching document cards with exact excerpts, page numbers, and similarity scores.
   - *(Note: If Gemini embedding API is temporarily unavailable or unconfigured, the system automatically engages keyword fallback, displaying an amber notice without failing or crashing).*

---

## Step 5: Grounded "Ask the Doc" RAG (F4)

1. Click **Ask the Doc** in the navbar (or click "Ask this Doc" from the resource page).
2. Choose a **Search Scope**:
   - Select **Specific Document** and pick `Data Structures & Algorithms - Lecture 1`.
   *(Or keep "All Eligible Library Documents").*
3. **Test 1: Grounded Answer with Provenance**:
   - In the question box, enter: `What is the time complexity of binary search according to the notes?`
   - Click **Ask AI**.
   - **Observed Behavior**:
     - Animated skeleton loader appears while retrieving passages and synthesizing evidence.
     - The answer appears strictly grounded in the uploaded material, citing inline source markers `[S1]`.
     - Below the answer, a **Verified Document Sources** section displays provenance cards derived from actual MongoDB chunks:
       - Source ID: `S1`
       - Document Title
       - 1-based Page Number: `Page 1`
       - Verbatim excerpt from the document
       - Clickable "View Document" link.
4. **Test 2: Honest Abstention on No Evidence**:
   - In the question box, enter: `What is the chemical composition of chlorophyll in plant chloroplasts?`
   - Click **Ask AI**.
   - **Observed Behavior**:
     - The system detects that the indexed CS201 document contains no relevant evidence.
     - Instead of hallucinating, the assistant displays an honest abstention state:
       `"Evidence Insufficient to Answer: I could not find any relevant information in the selected document(s) to answer your question."`
     - Actionable suggestions are presented to the student (e.g. broaden scope, rephrase question).

---

## Step 6: Community Upvoting, Comments & Reports (F5)

1. Navigate to the uploaded resource's detail page (`/resources/:id`).
2. **Community Voting**:
   - Click the **Thumbs Up** button.
   - Score increments from `0` to `1`.
   - Clicking it again toggles the vote back to neutral.
3. **Comments**:
   - In the comments section, type: `Clear summary on asymptotic runtimes!` and submit.
   - The comment appears instantly with author name and timestamp.
4. **Reports**:
   - Click the **Report** button (flag icon).
   - Select reason `Misclassified Course / Semester` and submit.
   - A success banner confirms the report has been dispatched to the moderator review queue. Duplicate open reports on the same resource are rejected.

---

## Step 7: Moderator Review & Computed Reputation (F5)

1. Sign out and sign in using the configured moderator account:
   - Email: `moderator@campusatlas.edu` (or any email listed in `ADMIN_EMAILS`)
   - Password: `Password123!`
2. Notice the navbar displays the **Moderator Review** link (`/moderator`).
3. Click **Moderator Review**:
   - **Pending Verification Queue**: Shows newly uploaded resources.
   - Click **Verify** on the uploaded resource and enter an approval note.
   - The document now displays a verified badge across the library.
   - **Report Resolution Queue**: Shows the report submitted in Step 6.
   - Click **Resolve** or **Dismiss** with resolution notes.
4. Navigate to **My Contributions** (`/contributions`):
   - Inspect the **Reputation Breakdown** card.
   - The student uploader's score reflects verified community upvotes and moderator approvals.

---

## Summary of Evaluated Guarantees

| Milestone / Feature | Verified Guarantee |
|---|---|
| **F1 Identity** | HttpOnly JWT session, role-based controls, safe password hashing |
| **F2 Library** | Multi-attribute filtering, PDF streaming, 8 MiB limit, magic byte validation |
| **F3 Retrieval** | Page-aware chunking, 768-dim embeddings, deterministic keyword fallback |
| **F4 Grounded RAG** | Strict evidence grounding, prompt injection resistance, DB-backed source cards, zero hallucinations |
| **F5 Community** | Unique votes, comments, duplicate report protection, reputation scoring |
| **F6 UI Quality** | Responsive layouts, loading states, error recovery, accessible controls |
