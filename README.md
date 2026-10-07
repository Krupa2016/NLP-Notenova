# NoteSense — AI-Powered E-Learning and Content Management Platform

NoteSense is an automated e-learning and intelligent study assistance platform. It extends semantic search for notes into a full-featured courseware management system where instructors create and manage courses with structured modules and lessons, students enroll and track learning progress, and both benefit from AI-powered semantic search, contextual question answering, instant summaries, and interactive 3D flashcards.

---

## 1. Core Architecture & Tech Stack

* **Frontend:** React 19, Vite, Lucide Icons, Vanilla CSS (Glassmorphism & SaaS Dark Theme)
* **Backend:** Python 3.11+, FastAPI, Uvicorn, Pydantic, PyJWT
* **Database:** SQLite with foreign keys and relational schema (`users`, `courses`, `modules`, `lessons`, `materials`, `enrollments`, `lesson_progress`)
* **Vector Store & Embeddings:** FAISS FlatIP multi-document index, Sentence Transformers (`all-MiniLM-L6-v2`)
* **PDF Processing:** PyMuPDF (`fitz`) text stream extraction and semantic chunking
* **Generative AI:** Google Gemini API (`gemini-2.5-flash`)
* **DevOps & CI/CD:** Docker, Docker Compose, Jenkinsfile declarative pipeline, Ansible automated configuration management & zero-downtime rollback

---

## 2. Platform Capabilities

### User Roles & Role-Based Access Control (RBAC)
* **Student:** Browse course catalog, filter by category/difficulty, enroll, view syllabus modules & lessons, mark lessons completed, track completion percentage, resume from last accessed lesson, query NoteSense AI scoped to enrolled courseware.
* **Instructor:** Create, edit, and delete authored courses, toggle publication status (Published / Draft), organize courses into modules and lessons, upload PDF study notes directly into lessons (vectorized into FAISS).
* **Admin:** Platform governance, view total system metrics (users, students, instructors, courses, materials), manage user roles (promote to Instructor/Admin), view system uptime and FAISS vector index health.

### Pre-configured Demo Accounts
For instant testing and evaluation, the following accounts are pre-seeded in the database (or accessible via the 1-click role switcher in the UI):

| Role | Username / Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Student** | `student` or `student@notesense.ai` | `student123` | Course enrollment, classroom player, progress tracking, study assistant |
| **Instructor** | `dralan` or `instructor@notesense.ai` | `instructor123` | Course authoring, module & lesson management, PDF ingestion |
| **Admin** | `admin` or `admin@notesense.ai` | `admin123` | System oversight, role management, catalog governance, health analytics |

---

## 3. NoteSense AI Pipeline (Multi-Document FAISS)

When an instructor uploads a PDF for a lesson or a student uploads personal study notes:
1. **Extraction:** PyMuPDF parses pages and text blocks.
2. **Chunking:** Text is partitioned into overlapping semantic chunks.
3. **Embeddings:** `all-MiniLM-L6-v2` produces dense vectors.
4. **Incremental FAISS Indexing:** New vectors and metadata (`course_id`, `lesson_id`, `page`, `filename`, `text`) are appended without overwriting existing indexed documents.
5. **Scoped Search & Generation:** Students can perform semantic search across all notes or filter strictly to a specific course/lesson. Gemini generates exam-ready answers, bullet-point summaries, and 3D flip flashcards.

---

## 4. DevOps Readiness & CI/CD Pipeline

* **Docker Containerization:**
  * `backend/Dockerfile`: Multi-stage Python 3.11-slim container with built-in `/health` check.
  * `frontend/Dockerfile`: Multi-stage Node 20 build with lightweight Nginx production server and SPA client routing.
  * `docker-compose.yml`: Full stack orchestration with health check dependencies and persistent volumes.
* **Jenkins Pipeline (`Jenkinsfile`):**
  * Automated SCM checkout
  * Lint and syntax checks
  * Automated PyTest execution (`pytest tests/`)
  * Production Docker image builds
  * Container health verification test
  * Ansible deployment trigger
  * Automated rollback on pipeline failure
* **Configuration Management (`ansible/`):**
  * `ansible/deploy.yml`: Zero-downtime rolling container updates with verification.
  * `ansible/rollback.yml`: Automatic fallback to previous stable image if verification fails.
* **Health Check Endpoint:**
  * `GET /health`: Returns JSON with system status, database connectivity, uptime, and FAISS vector count.

---

## 5. Quickstart & Setup Instructions

### Backend Setup

```bash
cd backend
python -m venv venv
```

Activate environment:
* Windows: `venv\Scripts\activate`
* Linux/macOS: `source venv/bin/activate`

Install dependencies:
```bash
pip install -r requirements.txt
```

Configure `.env` (copy from `.env.example`):
```env
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=notesense_secret_super_key_change_in_production_2026
```

Run automated backend tests:
```bash
pytest tests/ -v
```

Start backend development server:
```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Backend API URL: `http://127.0.0.1:8000`  
Swagger Documentation: `http://127.0.0.1:8000/docs`  
Health Check: `http://127.0.0.1:8000/health`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

### Docker Orchestration (Production Simulation)

```bash
# Build and run entire platform with healthchecks
docker-compose up --build
```
* Frontend Web App: `http://localhost:3000`
* Backend API: `http://localhost:8000`
