import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["app"] == "NoteSense"
    assert "uptime_seconds" in data
    assert "vector_store" in data

def test_home_status():
    response = client.get("/")
    assert response.status_code == 200
    assert "NoteSense" in response.json()["message"]

def test_auth_login_student():
    response = client.post("/auth/login", json={
        "username_or_email": "student",
        "password": "student123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "student"

def test_auth_login_instructor():
    response = client.post("/auth/login", json={
        "username_or_email": "dralan",
        "password": "instructor123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "instructor"

def test_auth_login_admin():
    response = client.post("/auth/login", json={
        "username_or_email": "admin",
        "password": "admin123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "admin"

def test_auth_login_invalid():
    response = client.post("/auth/login", json={
        "username_or_email": "student",
        "password": "wrong_password_here"
    })
    assert response.status_code == 401

def test_get_courses_public():
    response = client.get("/courses")
    assert response.status_code == 200
    data = response.json()
    assert "courses" in data
    assert len(data["courses"]) >= 1

def test_student_cannot_create_course():
    # Login as student
    login_res = client.post("/auth/login", json={
        "username_or_email": "student",
        "password": "student123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/courses", json={
        "title": "Hacking Course By Student",
        "description": "Unauthorized course creation attempt",
        "category": "Security"
    }, headers=headers)
    assert create_res.status_code == 403

def test_instructor_can_create_course():
    login_res = client.post("/auth/login", json={
        "username_or_email": "dralan",
        "password": "instructor123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/courses", json={
        "title": "Automated Unit Testing & Continuous Delivery",
        "description": "Learn pytest, GitHub Actions, and Jenkins pipelines",
        "category": "DevOps & Cloud",
        "difficulty": "Intermediate",
        "is_published": True
    }, headers=headers)
    assert create_res.status_code == 200
    assert "course_id" in create_res.json()

def test_course_detail_and_modules():
    response = client.get("/courses/1")
    assert response.status_code == 200
    data = response.json()
    assert "course" in data
    course = data["course"]
    assert "modules" in course
    assert len(course["modules"]) >= 1

def test_student_enrollment_and_progress():
    # Login student
    login_res = client.post("/auth/login", json={
        "username_or_email": "student",
        "password": "student123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Enroll in course 2
    enroll_res = client.post("/courses/2/enroll", headers=headers)
    assert enroll_res.status_code == 200

    # Mark lesson complete
    complete_res = client.post("/courses/2/lessons/7/complete", headers=headers)
    assert complete_res.status_code == 200

    # Check My Learning
    learning_res = client.get("/student/my-learning", headers=headers)
    assert learning_res.status_code == 200
    enrolled = learning_res.json()["enrolled_courses"]
    assert any(c["course_id"] == 2 for c in enrolled)

def test_admin_dashboard_access():
    # Admin login
    admin_login = client.post("/auth/login", json={"username_or_email": "admin", "password": "admin123"})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    dash_res = client.get("/dashboard/admin", headers=admin_headers)
    assert dash_res.status_code == 200
    stats = dash_res.json()["stats"]
    assert stats["total_users"] >= 3
    assert stats["total_courses"] >= 2

    # Non-admin access to admin dashboard should fail
    student_login = client.post("/auth/login", json={"username_or_email": "student", "password": "student123"})
    student_token = student_login.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    unauth_res = client.get("/dashboard/admin", headers=student_headers)
    assert unauth_res.status_code == 403

def test_semantic_search_with_filter():
    response = client.get("/search?query=lemmatization+tokenization&top_k=3")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "query" in data
