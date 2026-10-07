import os
import shutil
import time
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr

import services.db as db
from services.auth import (
    create_access_token,
    get_current_user,
    get_current_user_optional,
    require_roles,
    hash_password,
    verify_password
)
from services.pdf_processor import (
    extract_text_from_pdf,
    chunk_text
)
from services.embeddings import (
    create_embeddings,
    create_query_embedding
)
from services.vector_store import (
    create_index,
    add_to_index,
    search,
    get_index_stats
)
from services.ai import (
    generate_summary,
    answer_question,
    generate_flashcards
)

APP_START_TIME = time.time()

app = FastAPI(
    title="NoteSense — AI-Powered E-Learning and Content Management Platform",
    description="Automated E-Learning Content Release Platform with semantic search and AI study tools",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount uploads directory for direct PDF viewing if needed
app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# -------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------
class UserRegister(BaseModel):
    email: str
    username: str
    full_name: str
    password: str
    role: Optional[str] = "student"

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "General"
    difficulty: Optional[str] = "Beginner"
    thumbnail: Optional[str] = None
    is_published: Optional[bool] = False

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    thumbnail: Optional[str] = None
    is_published: Optional[bool] = None

class ModuleCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    order_index: Optional[int] = 0

class LessonCreate(BaseModel):
    title: str
    content: Optional[str] = ""
    duration_minutes: Optional[int] = 15
    order_index: Optional[int] = 0

class AskRequest(BaseModel):
    question: str
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None

class StudyToolRequest(BaseModel):
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None


# -------------------------------------------------------------
# HEALTH CHECK & SYSTEM STATUS
# -------------------------------------------------------------
@app.get("/health")
def health_check():
    faiss_status = get_index_stats()
    db_status = "connected"
    try:
        conn = db.get_connection()
        conn.execute("SELECT 1")
        conn.close()
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "app": "NoteSense",
        "version": "2.0.0",
        "uptime_seconds": round(time.time() - APP_START_TIME, 2),
        "database": db_status,
        "vector_store": faiss_status
    }


@app.get("/")
def home():
    return {
        "message": "NoteSense — AI-Powered E-Learning Platform API is running",
        "version": "2.0.0",
        "docs": "/docs"
    }


# -------------------------------------------------------------
# AUTHENTICATION & USER MANAGEMENT
# -------------------------------------------------------------
@app.post("/auth/register")
def register(user_data: UserRegister):
    conn = db.get_connection()
    cursor = conn.cursor()

    role = user_data.role.lower() if user_data.role else "student"
    if role not in ["admin", "instructor", "student"]:
        role = "student"

    cursor.execute("SELECT id FROM users WHERE email = ? OR username = ?", (user_data.email, user_data.username))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with that email or username already exists."
        )

    pw_hash = hash_password(user_data.password)
    cursor.execute("""
        INSERT INTO users (email, username, full_name, password_hash, role)
        VALUES (?, ?, ?, ?, ?)
    """, (user_data.email, user_data.username, user_data.full_name, pw_hash, role))
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    token = create_access_token({"sub": str(user_id), "role": role, "username": user_data.username})
    return {
        "message": "User registered successfully",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "username": user_data.username,
            "full_name": user_data.full_name,
            "role": role
        }
    }


@app.post("/auth/login")
def login(login_data: UserLogin):
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, email, username, full_name, password_hash, role, is_active
        FROM users
        WHERE email = ? OR username = ?
    """, (login_data.username_or_email, login_data.username_or_email))
    user = cursor.fetchone()
    conn.close()

    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username/email and password."
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended or deactivated. Contact administrator."
        )

    token = create_access_token({"sub": str(user["id"]), "role": user["role"], "username": user["username"]})
    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    }


@app.get("/auth/me")
def get_current_user_profile(user: dict = Depends(get_current_user)):
    return {"user": user}


# -------------------------------------------------------------
# COURSE MANAGEMENT
# -------------------------------------------------------------
@app.get("/courses")
def get_courses(
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    search_term: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    conn = db.get_connection()
    cursor = conn.cursor()

    is_elevated = current_user and current_user["role"] in ["admin", "instructor"]

    query = """
        SELECT c.*, u.full_name as instructor_name,
               (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as total_modules,
               (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as total_lessons,
               (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as total_students
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE 1=1
    """
    params = []

    # If student or unauthenticated, only show published courses
    if not is_elevated:
        query += " AND c.is_published = 1"

    if category and category != "All":
        query += " AND c.category = ?"
        params.append(category)

    if difficulty and difficulty != "All":
        query += " AND c.difficulty = ?"
        params.append(difficulty)

    if search_term:
        query += " AND (c.title LIKE ? OR c.description LIKE ?)"
        params.extend([f"%{search_term}%", f"%{search_term}%"])

    query += " ORDER BY c.created_at DESC"
    cursor.execute(query, params)
    courses = [dict(row) for row in cursor.fetchall()]

    # If student is logged in, attach is_enrolled flag and progress
    if current_user and current_user["role"] == "student":
        student_id = current_user["id"]
        for c in courses:
            cursor.execute("SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?", (student_id, c["id"]))
            enrollment = cursor.fetchone()
            c["is_enrolled"] = bool(enrollment)
            if enrollment:
                cursor.execute("""
                    SELECT COUNT(*) FROM lesson_progress WHERE student_id = ? AND course_id = ? AND completed = 1
                """, (student_id, c["id"]))
                completed = cursor.fetchone()[0]
                total = c["total_lessons"]
                c["progress_percent"] = round((completed / total * 100), 1) if total > 0 else 0
            else:
                c["progress_percent"] = 0

    conn.close()
    return {"courses": courses}


@app.post("/courses")
def create_course(
    course: CourseCreate,
    current_user: dict = Depends(require_roles(["admin", "instructor"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO courses (title, description, category, difficulty, instructor_id, thumbnail, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        course.title,
        course.description,
        course.category or "Computer Science",
        course.difficulty or "Beginner",
        current_user["id"],
        course.thumbnail or "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
        1 if course.is_published else 0
    ))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return {"message": "Course created successfully", "course_id": new_id}


@app.get("/courses/{course_id}")
def get_course_detail(
    course_id: int,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.*, u.full_name as instructor_name, u.email as instructor_email
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.id = ?
    """, (course_id,))
    course_row = cursor.fetchone()

    if not course_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    course = dict(course_row)

    # Fetch modules
    cursor.execute("SELECT * FROM modules WHERE course_id = ? ORDER BY order_index, id", (course_id,))
    modules = [dict(m) for m in cursor.fetchall()]

    # Fetch lessons and materials for each module
    all_lessons = []
    completed_lesson_ids = set()

    if current_user and current_user["role"] == "student":
        cursor.execute("SELECT lesson_id FROM lesson_progress WHERE student_id = ? AND course_id = ? AND completed = 1", (current_user["id"], course_id))
        completed_lesson_ids = {row[0] for row in cursor.fetchall()}

    for mod in modules:
        cursor.execute("SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index, id", (mod["id"],))
        lessons = [dict(l) for l in cursor.fetchall()]

        for lesson in lessons:
            lesson["is_completed"] = lesson["id"] in completed_lesson_ids
            # Fetch attached materials
            cursor.execute("SELECT id, filename, original_name, file_size, pages_count, chunks_count, created_at FROM materials WHERE lesson_id = ?", (lesson["id"],))
            lesson["materials"] = [dict(mat) for mat in cursor.fetchall()]
            all_lessons.append(lesson)

        mod["lessons"] = lessons

    course["modules"] = modules
    course["total_lessons"] = len(all_lessons)

    # Enrollment status
    is_enrolled = False
    last_accessed_lesson_id = None
    if current_user and current_user["role"] == "student":
        cursor.execute("SELECT id, last_accessed_lesson_id FROM enrollments WHERE student_id = ? AND course_id = ?", (current_user["id"], course_id))
        enrollment = cursor.fetchone()
        if enrollment:
            is_enrolled = True
            last_accessed_lesson_id = enrollment["last_accessed_lesson_id"]

    course["is_enrolled"] = is_enrolled
    course["last_accessed_lesson_id"] = last_accessed_lesson_id
    completed_count = len(completed_lesson_ids)
    course["completed_lessons"] = completed_count
    course["progress_percent"] = round((completed_count / len(all_lessons) * 100), 1) if all_lessons else 0

    conn.close()
    return {"course": course}


@app.put("/courses/{course_id}")
def update_course(
    course_id: int,
    course_data: CourseUpdate,
    current_user: dict = Depends(require_roles(["admin", "instructor"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT instructor_id FROM courses WHERE id = ?", (course_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user["role"] != "admin" and row["instructor_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="You can only edit courses you created.")

    updates = []
    params = []
    for field, val in course_data.dict(exclude_unset=True).items():
        if field == "is_published":
            updates.append("is_published = ?")
            params.append(1 if val else 0)
        else:
            updates.append(f"{field} = ?")
            params.append(val)

    if updates:
        params.append(course_id)
        cursor.execute(f"UPDATE courses SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", params)
        conn.commit()

    conn.close()
    return {"message": "Course updated successfully"}


@app.delete("/courses/{course_id}")
def delete_course(
    course_id: int,
    current_user: dict = Depends(require_roles(["admin", "instructor"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT instructor_id FROM courses WHERE id = ?", (course_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user["role"] != "admin" and row["instructor_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="You can only delete courses you created.")

    cursor.execute("DELETE FROM courses WHERE id = ?", (course_id,))
    conn.commit()
    conn.close()
    return {"message": "Course deleted successfully"}


@app.patch("/courses/{course_id}/publish")
def toggle_publish_course(
    course_id: int,
    current_user: dict = Depends(require_roles(["admin", "instructor"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT instructor_id, is_published FROM courses WHERE id = ?", (course_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user["role"] != "admin" and row["instructor_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Unauthorized")

    new_status = 0 if row["is_published"] else 1
    cursor.execute("UPDATE courses SET is_published = ? WHERE id = ?", (new_status, course_id))
    conn.commit()
    conn.close()

    return {"message": f"Course {'published' if new_status else 'unpublished'} successfully", "is_published": bool(new_status)}


# -------------------------------------------------------------
# MODULE & LESSON MANAGEMENT
# -------------------------------------------------------------
@app.post("/courses/{course_id}/modules")
def add_module(
    course_id: int,
    mod: ModuleCreate,
    current_user: dict = Depends(require_roles(["admin", "instructor"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO modules (course_id, title, description, order_index)
        VALUES (?, ?, ?, ?)
    """, (course_id, mod.title, mod.description, mod.order_index))
    conn.commit()
    module_id = cursor.lastrowid
    conn.close()
    return {"message": "Module created", "module_id": module_id}


@app.delete("/modules/{module_id}")
def delete_module(
    module_id: int,
    current_user: dict = Depends(require_roles(["admin", "instructor"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM modules WHERE id = ?", (module_id,))
    conn.commit()
    conn.close()
    return {"message": "Module deleted"}


@app.post("/modules/{module_id}/lessons")
def add_lesson(
    module_id: int,
    lesson: LessonCreate,
    current_user: dict = Depends(require_roles(["admin", "instructor"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT course_id FROM modules WHERE id = ?", (module_id,))
    m_row = cursor.fetchone()
    if not m_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Module not found")

    course_id = m_row["course_id"]
    cursor.execute("""
        INSERT INTO lessons (module_id, course_id, title, content, duration_minutes, order_index)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (module_id, course_id, lesson.title, lesson.content, lesson.duration_minutes, lesson.order_index))
    conn.commit()
    lesson_id = cursor.lastrowid
    conn.close()
    return {"message": "Lesson created", "lesson_id": lesson_id}


@app.get("/lessons/{lesson_id}")
def get_lesson(
    lesson_id: int,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT l.*, c.title as course_title, m.title as module_title
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        JOIN modules m ON l.module_id = m.id
        WHERE l.id = ?
    """, (lesson_id,))
    lesson_row = cursor.fetchone()
    if not lesson_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Lesson not found")

    lesson = dict(lesson_row)

    # Get materials
    cursor.execute("SELECT * FROM materials WHERE lesson_id = ?", (lesson_id,))
    lesson["materials"] = [dict(m) for m in cursor.fetchall()]

    # If student, record last accessed and fetch completion status
    if current_user and current_user["role"] == "student":
        student_id = current_user["id"]
        course_id = lesson["course_id"]
        # Update last accessed lesson in enrollment
        cursor.execute("""
            UPDATE enrollments SET last_accessed_lesson_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE student_id = ? AND course_id = ?
        """, (lesson_id, student_id, course_id))

        cursor.execute("SELECT completed FROM lesson_progress WHERE student_id = ? AND lesson_id = ?", (student_id, lesson_id))
        prog = cursor.fetchone()
        lesson["is_completed"] = bool(prog and prog[0])
        conn.commit()

    conn.close()
    return {"lesson": lesson}


@app.delete("/lessons/{lesson_id}")
def delete_lesson(
    lesson_id: int,
    current_user: dict = Depends(require_roles(["admin", "instructor"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lessons WHERE id = ?", (lesson_id,))
    conn.commit()
    conn.close()
    return {"message": "Lesson deleted"}


# -------------------------------------------------------------
# LEARNING MATERIALS & PDF PIPELINE
# -------------------------------------------------------------
@app.post("/courses/{course_id}/lessons/{lesson_id}/materials")
async def upload_lesson_material(
    course_id: int,
    lesson_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles(["admin", "instructor"]))
):
    """
    Integrates NoteSense PDF-processing pipeline:
    1. Saves PDF file into course & lesson uploads.
    2. Extracts text using PyMuPDF (services.pdf_processor).
    3. Partitions text into semantic chunks.
    4. Generates embeddings using sentence-transformers.
    5. Appends vectors and course/lesson metadata into FAISS index without overwriting.
    6. Stores material record in SQLite database.
    """
    safe_filename = f"c{course_id}_l{lesson_id}_{int(time.time())}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    # Step 2: Extract text using existing PyMuPDF service
    pages = extract_text_from_pdf(file_path)
    all_chunks = []
    metadata = []

    for page in pages:
        chunks = chunk_text(page["text"])
        for chunk in chunks:
            all_chunks.append(chunk)
            metadata.append({
                "course_id": course_id,
                "lesson_id": lesson_id,
                "page": page["page"],
                "text": chunk,
                "filename": file.filename
            })

    # Step 3 & 4: Embeddings & Incremental FAISS storage
    if all_chunks:
        embeddings = create_embeddings(all_chunks)
        add_to_index(embeddings, metadata)

    # Step 5: Save record to SQLite
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO materials (course_id, lesson_id, filename, original_name, file_path, file_size, pages_count, chunks_count, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        course_id,
        lesson_id,
        safe_filename,
        file.filename,
        file_path,
        file_size,
        len(pages),
        len(all_chunks),
        current_user["id"]
    ))
    conn.commit()
    mat_id = cursor.lastrowid
    conn.close()

    return {
        "message": "Lesson material processed and indexed in FAISS successfully",
        "material_id": mat_id,
        "filename": file.filename,
        "course_id": course_id,
        "lesson_id": lesson_id,
        "pages": len(pages),
        "chunks": len(all_chunks),
        "file_size": file_size
    }


@app.delete("/materials/{material_id}")
def delete_material(
    material_id: int,
    current_user: dict = Depends(require_roles(["admin", "instructor"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM materials WHERE id = ?", (material_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Material not found")

    file_path = row["file_path"]
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    cursor.execute("DELETE FROM materials WHERE id = ?", (material_id,))
    conn.commit()
    conn.close()
    return {"message": "Material deleted"}


# -------------------------------------------------------------
# STUDENT ENROLLMENT & PROGRESS TRACKING
# -------------------------------------------------------------
@app.post("/courses/{course_id}/enroll")
def enroll_course(
    course_id: int,
    current_user: dict = Depends(require_roles(["student", "admin"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM courses WHERE id = ? AND is_published = 1", (course_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found or not published.")

    # Find first lesson
    cursor.execute("SELECT id FROM lessons WHERE course_id = ? ORDER BY order_index, id LIMIT 1", (course_id,))
    first_lesson = cursor.fetchone()
    first_lesson_id = first_lesson[0] if first_lesson else None

    cursor.execute("""
        INSERT OR IGNORE INTO enrollments (student_id, course_id, last_accessed_lesson_id)
        VALUES (?, ?, ?)
    """, (current_user["id"], course_id, first_lesson_id))
    conn.commit()
    conn.close()

    return {"message": "Successfully enrolled in course", "first_lesson_id": first_lesson_id}


@app.post("/courses/{course_id}/unenroll")
def unenroll_course(
    course_id: int,
    current_user: dict = Depends(require_roles(["student"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM enrollments WHERE student_id = ? AND course_id = ?", (current_user["id"], course_id))
    cursor.execute("DELETE FROM lesson_progress WHERE student_id = ? AND course_id = ?", (current_user["id"], course_id))
    conn.commit()
    conn.close()
    return {"message": "Unenrolled successfully"}


@app.post("/courses/{course_id}/lessons/{lesson_id}/complete")
def toggle_lesson_complete(
    course_id: int,
    lesson_id: int,
    completed: bool = Body(True, embed=True) if False else True,
    current_user: dict = Depends(require_roles(["student", "admin"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO lesson_progress (student_id, course_id, lesson_id, completed)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(student_id, lesson_id) DO UPDATE SET completed = 1, completed_at = CURRENT_TIMESTAMP
    """, (current_user["id"], course_id, lesson_id))

    # Update last accessed
    cursor.execute("""
        UPDATE enrollments SET last_accessed_lesson_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE student_id = ? AND course_id = ?
    """, (lesson_id, current_user["id"], course_id))

    conn.commit()

    # Calculate overall progress
    cursor.execute("SELECT COUNT(*) FROM lessons WHERE course_id = ?", (course_id,))
    total_lessons = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM lesson_progress WHERE student_id = ? AND course_id = ? AND completed = 1", (current_user["id"], course_id))
    completed_count = cursor.fetchone()[0]

    progress_percent = round((completed_count / total_lessons * 100), 1) if total_lessons > 0 else 100.0

    conn.close()
    return {
        "message": "Lesson marked completed",
        "lesson_id": lesson_id,
        "completed": True,
        "progress_percent": progress_percent
    }


@app.get("/student/my-learning")
def get_my_learning(current_user: dict = Depends(require_roles(["student", "admin"]))):
    student_id = current_user["id"]
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT e.enrolled_at, e.last_accessed_lesson_id,
               c.id as course_id, c.title, c.description, c.category, c.difficulty, c.thumbnail,
               u.full_name as instructor_name,
               (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as total_lessons,
               (SELECT title FROM lessons l2 WHERE l2.id = e.last_accessed_lesson_id) as last_lesson_title
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        WHERE e.student_id = ?
        ORDER BY e.updated_at DESC
    """, (student_id,))
    rows = [dict(r) for r in cursor.fetchall()]

    for r in rows:
        cursor.execute("""
            SELECT COUNT(*) FROM lesson_progress
            WHERE student_id = ? AND course_id = ? AND completed = 1
        """, (student_id, r["course_id"]))
        completed = cursor.fetchone()[0]
        r["completed_lessons"] = completed
        r["progress_percent"] = round((completed / r["total_lessons"] * 100), 1) if r["total_lessons"] > 0 else 0

    conn.close()
    return {"enrolled_courses": rows}


# -------------------------------------------------------------
# ROLE DASHBOARDS
# -------------------------------------------------------------
@app.get("/dashboard/student")
def student_dashboard(current_user: dict = Depends(require_roles(["student", "admin"]))):
    student_id = current_user["id"]
    conn = db.get_connection()
    cursor = conn.cursor()

    # Enrolled courses with stats
    cursor.execute("""
        SELECT e.course_id, e.enrolled_at, e.last_accessed_lesson_id,
               c.title, c.category, c.difficulty, c.thumbnail,
               (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as total_lessons,
               (SELECT title FROM lessons l2 WHERE l2.id = e.last_accessed_lesson_id) as last_lesson_title
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ?
        ORDER BY e.updated_at DESC
    """, (student_id,))
    enrolled = [dict(r) for r in cursor.fetchall()]

    total_completed_lessons = 0
    for item in enrolled:
        cursor.execute("SELECT COUNT(*) FROM lesson_progress WHERE student_id = ? AND course_id = ? AND completed = 1", (student_id, item["course_id"]))
        comp = cursor.fetchone()[0]
        item["completed_lessons"] = comp
        total_completed_lessons += comp
        item["progress_percent"] = round((comp / item["total_lessons"] * 100), 1) if item["total_lessons"] > 0 else 0

    # Recommended courses (not yet enrolled)
    cursor.execute("""
        SELECT c.*, u.full_name as instructor_name,
               (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as total_lessons
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.is_published = 1
          AND c.id NOT IN (SELECT course_id FROM enrollments WHERE student_id = ?)
        LIMIT 4
    """, (student_id,))
    recommended = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {
        "enrolled_courses": enrolled,
        "total_enrolled": len(enrolled),
        "total_completed_lessons": total_completed_lessons,
        "recommended_courses": recommended
    }


@app.get("/dashboard/instructor")
def instructor_dashboard(current_user: dict = Depends(require_roles(["instructor", "admin"]))):
    instructor_id = current_user["id"]
    conn = db.get_connection()
    cursor = conn.cursor()

    # List courses created by instructor
    cursor.execute("""
        SELECT c.*,
               (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as student_count,
               (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lesson_count,
               (SELECT COUNT(*) FROM materials m WHERE m.course_id = c.id) as material_count
        FROM courses c
        WHERE c.instructor_id = ?
        ORDER BY c.created_at DESC
    """, (instructor_id,))
    courses = [dict(r) for r in cursor.fetchall()]

    total_students = sum(c["student_count"] for c in courses)
    published_count = sum(1 for c in courses if c["is_published"])
    draft_count = len(courses) - published_count
    total_materials = sum(c["material_count"] for c in courses)

    conn.close()
    return {
        "courses": courses,
        "total_courses": len(courses),
        "total_students": total_students,
        "published_courses": published_count,
        "draft_courses": draft_count,
        "total_materials": total_materials
    }


@app.get("/dashboard/admin")
def admin_dashboard(current_user: dict = Depends(require_roles(["admin"]))):
    conn = db.get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'student'")
    total_students = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'instructor'")
    total_instructors = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM courses")
    total_courses = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM courses WHERE is_published = 1")
    published_courses = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM materials")
    total_materials = cursor.fetchone()[0]

    cursor.execute("SELECT id, email, username, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 10")
    recent_users = [dict(u) for u in cursor.fetchall()]

    cursor.execute("""
        SELECT c.*, u.full_name as instructor_name,
               (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as student_count
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        ORDER BY c.created_at DESC LIMIT 10
    """)
    recent_courses = [dict(c) for c in cursor.fetchall()]

    conn.close()
    return {
        "stats": {
            "total_users": total_users,
            "total_students": total_students,
            "total_instructors": total_instructors,
            "total_courses": total_courses,
            "published_courses": published_courses,
            "unpublished_courses": total_courses - published_courses,
            "total_materials": total_materials
        },
        "recent_users": recent_users,
        "recent_courses": recent_courses
    }


@app.get("/admin/users")
def get_all_users(current_user: dict = Depends(require_roles(["admin"]))):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, username, full_name, role, is_active, created_at FROM users ORDER BY id DESC")
    users = [dict(u) for u in cursor.fetchall()]
    conn.close()
    return {"users": users}


@app.patch("/admin/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role: str = Query(..., pattern="^(admin|instructor|student)$"),
    current_user: dict = Depends(require_roles(["admin"]))
):
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
    conn.commit()
    conn.close()
    return {"message": f"User role updated to {role}"}


# -------------------------------------------------------------
# EXISTING NOTENENSE FEATURES (PRESERVED & ENHANCED)
# -------------------------------------------------------------
@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...)
):
    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    pages = extract_text_from_pdf(
        file_path
    )

    all_chunks = []
    metadata = []

    for page in pages:
        chunks = chunk_text(
            page["text"]
        )

        for chunk in chunks:
            all_chunks.append(chunk)
            metadata.append({
                "page": page["page"],
                "text": chunk,
                "filename": file.filename
            })

    if all_chunks:
        embeddings = create_embeddings(
            all_chunks
        )
        add_to_index(
            embeddings,
            metadata
        )

    return {
        "message": "PDF processed successfully",
        "filename": file.filename,
        "pages": len(pages),
        "chunks": len(all_chunks),
        "chunk_details": metadata
    }


@app.get("/search")
def semantic_search(
    query: str,
    top_k: int = 5,
    course_id: Optional[int] = None,
    lesson_id: Optional[int] = None
):
    query_embedding = create_query_embedding(
        query
    )

    results = search(
        query_embedding,
        top_k=top_k,
        course_id=course_id,
        lesson_id=lesson_id
    )

    return {
        "query": query,
        "course_id": course_id,
        "lesson_id": lesson_id,
        "results": results
    }


@app.post("/ask")
def ask_question_endpoint(
    question: Optional[str] = None,
    course_id: Optional[int] = None,
    lesson_id: Optional[int] = None,
    payload: Optional[AskRequest] = None
):
    # Support both query param and JSON body
    q = (payload.question if payload else None) or question
    c_id = (payload.course_id if payload else None) or course_id
    l_id = (payload.lesson_id if payload else None) or lesson_id

    if not q:
        raise HTTPException(status_code=400, detail="Question is required")

    query_embedding = create_query_embedding(q)

    results = search(
        query_embedding,
        top_k=5,
        course_id=c_id,
        lesson_id=l_id
    )

    context = "\n\n".join(
        [result["text"] for result in results]
    )

    if not context.strip():
        return {
            "question": q,
            "answer": "No relevant course notes or study material found for this query.",
            "sources": []
        }

    try:
        answer = answer_question(
            q,
            context
        )
    except Exception as e:
        answer = f"Generated from matching notes: {context[:400]}..."

    return {
        "question": q,
        "answer": answer,
        "sources": results
    }


@app.post("/summary")
def summary(
    course_id: Optional[int] = None,
    lesson_id: Optional[int] = None,
    payload: Optional[StudyToolRequest] = None
):
    c_id = (payload.course_id if payload else None) or course_id
    l_id = (payload.lesson_id if payload else None) or lesson_id

    results = search(
        create_query_embedding("important concepts definitions key points overview"),
        top_k=10,
        course_id=c_id,
        lesson_id=l_id
    )

    context = "\n\n".join(
        [result["text"] for result in results]
    )

    if not context.strip():
        return {"summary": "Please upload study notes or select a course lesson with materials to generate a summary."}

    try:
        result = generate_summary(context)
    except Exception as e:
        result = f"Summary of retrieved notes:\n" + "\n".join([f"• {r['text'][:150]}..." for r in results[:4]])

    return {
        "summary": result,
        "sources_count": len(results)
    }


@app.post("/flashcards")
def flashcards(
    course_id: Optional[int] = None,
    lesson_id: Optional[int] = None,
    payload: Optional[StudyToolRequest] = None
):
    c_id = (payload.course_id if payload else None) or course_id
    l_id = (payload.lesson_id if payload else None) or lesson_id

    results = search(
        create_query_embedding("important concepts definitions examples key questions"),
        top_k=10,
        course_id=c_id,
        lesson_id=l_id
    )

    context = "\n\n".join(
        [result["text"] for result in results]
    )

    if not context.strip():
        return {"flashcards": []}

    try:
        cards_text = generate_flashcards(context)
        parsed_cards = []
        current_q = None
        for line in cards_text.strip().split('\n'):
            line = line.strip()
            if line.startswith("Q:"):
                current_q = line[2:].strip()
            elif line.startswith("A:") and current_q:
                parsed_cards.append({
                    "question": current_q,
                    "answer": line[2:].strip()
                })
                current_q = None
    except Exception as e:
        # Fallback flashcards from retrieved text if Gemini API has quota/network limit
        parsed_cards = [
            {"question": f"Key concept from {r['filename']} (p.{r['page']})", "answer": r['text'][:120]}
            for r in results[:5]
        ]

    return {
        "flashcards": parsed_cards,
        "sources_count": len(results)
    }