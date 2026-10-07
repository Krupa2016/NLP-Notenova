import sqlite3
import os
import hashlib
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "notesense.db")

def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def hash_password(password: str) -> str:
    salt = "notesense_salt_2026"
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'instructor', 'student')),
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT 'Computer Science',
        difficulty TEXT NOT NULL DEFAULT 'Beginner' CHECK(difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
        instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        thumbnail TEXT,
        is_published INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT,
        duration_minutes INTEGER DEFAULT 15,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        pages_count INTEGER DEFAULT 0,
        chunks_count INTEGER DEFAULT 0,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed_lesson_id INTEGER REFERENCES lessons(id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS lesson_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        completed INTEGER DEFAULT 1,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, lesson_id)
    );
    """)

    conn.commit()
    seed_initial_data(conn)
    conn.close()

def seed_initial_data(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        # Default accounts
        admin_pass = hash_password("admin123")
        inst_pass = hash_password("instructor123")
        student_pass = hash_password("student123")

        cursor.execute("""
            INSERT INTO users (email, username, full_name, password_hash, role)
            VALUES 
            ('admin@notesense.ai', 'admin', 'System Administrator', ?, 'admin'),
            ('instructor@notesense.ai', 'dralan', 'Dr. Alan Turing', ?, 'instructor'),
            ('student@notesense.ai', 'student', 'Jane Student', ?, 'student')
        """, (admin_pass, inst_pass, student_pass))

        instructor_id = cursor.lastrowid - 1  # ID of Dr. Alan Turing

        # Seed Course 1
        cursor.execute("""
            INSERT INTO courses (title, description, category, difficulty, instructor_id, thumbnail, is_published)
            VALUES (
                'Natural Language Processing & LLMs',
                'Comprehensive masterclass covering tokenization, word representations, morphological analysis, transformer architectures, and semantic search vector databases.',
                'AI & Data Science',
                'Intermediate',
                ?,
                'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=60',
                1
            )
        """, (instructor_id,))
        course1_id = cursor.lastrowid

        # Modules for Course 1
        cursor.execute("""
            INSERT INTO modules (course_id, title, description, order_index)
            VALUES 
            (?, 'Module 1: Foundations of Natural Language Processing', 'Core preprocessing and linguistic representations', 1),
            (?, 'Module 2: Word-Level & Morphological Analysis', 'Tokenization, stemming, lemmatization and syntax', 2),
            (?, 'Module 3: Semantic Embeddings & Vector Search', 'Dense vector spaces, FAISS indexing and retrieval pipelines', 3)
        """, (course1_id, course1_id, course1_id))

        # Retrieve module IDs
        cursor.execute("SELECT id FROM modules WHERE course_id = ? ORDER BY order_index", (course1_id,))
        module_rows = cursor.fetchall()
        mod1_id = module_rows[0][0]
        mod2_id = module_rows[1][0]
        mod3_id = module_rows[2][0]

        # Lessons for Modules
        cursor.execute("""
            INSERT INTO lessons (module_id, course_id, title, content, duration_minutes, order_index)
            VALUES
            (?, ?, '1.1 Introduction to Computational Linguistics', 'Overview of natural language processing concepts, historical context, and the rise of language models.', 20, 1),
            (?, ?, '1.2 Corpus Preprocessing and Cleaning', 'Text normalization, special character filtering, and vocabulary construction methods.', 25, 2),
            (?, ?, '2.1 Morphology and Word Structure', 'Study of morphemes, inflectional vs derivational morphology, and word tokens.', 30, 1),
            (?, ?, '2.2 Stemming Algorithms (Porter & Snowball)', 'Heuristic rule-based stemming techniques, algorithms comparison, and limitations.', 25, 2),
            (?, ?, '3.1 Dense Representations & Transformers', 'Bi-encoder representations, sentence transformers, and cosine similarity.', 35, 1),
            (?, ?, '3.2 Vector Indexing with FAISS', 'Flat IP indexes, Voronoi cells, and scalable nearest neighbor retrieval.', 30, 2)
        """, (mod1_id, course1_id, mod1_id, course1_id, mod2_id, course1_id, mod2_id, course1_id, mod3_id, course1_id, mod3_id, course1_id))

        # Seed Course 2
        cursor.execute("""
            INSERT INTO courses (title, description, category, difficulty, instructor_id, thumbnail, is_published)
            VALUES (
                'Modern Cloud DevOps & CI/CD Pipelines',
                'Hands-on engineering course covering Docker containerization, Jenkins automation pipelines, Ansible configurations, and high-availability deployment strategies.',
                'DevOps & Cloud',
                'Advanced',
                ?,
                'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=800&auto=format&fit=crop&q=60',
                1
            )
        """, (instructor_id,))
        course2_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO modules (course_id, title, description, order_index)
            VALUES (?, 'Module 1: Containerization with Docker', 'Multi-stage Dockerfiles and container orchestration', 1)
        """, (course2_id,))
        cursor.execute("SELECT id FROM modules WHERE course_id = ?", (course2_id,))
        mod_devops_id = cursor.fetchone()[0]

        cursor.execute("""
            INSERT INTO lessons (module_id, course_id, title, content, duration_minutes, order_index)
            VALUES (?, ?, '1.1 Docker Multi-stage Builds for React and FastAPI', 'Constructing lightweight production-ready images with healthcheck integration.', 25, 1)
        """, (mod_devops_id, course2_id))

        # Default student enrollment in Course 1
        cursor.execute("SELECT id FROM users WHERE username = 'student'")
        student_id = cursor.fetchone()[0]

        cursor.execute("SELECT id FROM lessons WHERE course_id = ? ORDER BY id LIMIT 1", (course1_id,))
        first_lesson = cursor.fetchone()
        first_lesson_id = first_lesson[0] if first_lesson else None

        cursor.execute("""
            INSERT INTO enrollments (student_id, course_id, last_accessed_lesson_id)
            VALUES (?, ?, ?)
        """, (student_id, course1_id, first_lesson_id))

        if first_lesson_id:
            cursor.execute("""
                INSERT INTO lesson_progress (student_id, course_id, lesson_id, completed)
                VALUES (?, ?, ?, 1)
            """, (student_id, course1_id, first_lesson_id))

        conn.commit()

# Run initialization immediately when imported
init_db()
