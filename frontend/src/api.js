const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("notesense_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Health
  getHealth: async () => {
    const res = await fetch(`${API_URL}/health`);
    return res.json();
  },

  // Auth
  login: async (username_or_email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username_or_email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Login failed");
    }
    return res.json();
  },

  register: async (userData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Registration failed");
    }
    return res.json();
  },

  getMe: async () => {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
  },

  // Courses
  getCourses: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== "All") params.append("category", filters.category);
    if (filters.difficulty && filters.difficulty !== "All") params.append("difficulty", filters.difficulty);
    if (filters.search_term) params.append("search_term", filters.search_term);

    const res = await fetch(`${API_URL}/courses?${params.toString()}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to fetch courses");
    return res.json();
  },

  getCourseDetail: async (courseId) => {
    const res = await fetch(`${API_URL}/courses/${courseId}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to fetch course details");
    return res.json();
  },

  createCourse: async (courseData) => {
    const res = await fetch(`${API_URL}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(courseData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to create course");
    }
    return res.json();
  },

  updateCourse: async (courseId, courseData) => {
    const res = await fetch(`${API_URL}/courses/${courseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(courseData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to update course");
    }
    return res.json();
  },

  deleteCourse: async (courseId) => {
    const res = await fetch(`${API_URL}/courses/${courseId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to delete course");
    }
    return res.json();
  },

  togglePublishCourse: async (courseId) => {
    const res = await fetch(`${API_URL}/courses/${courseId}/publish`, {
      method: "PATCH",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to toggle publish");
    return res.json();
  },

  // Modules & Lessons
  addModule: async (courseId, moduleData) => {
    const res = await fetch(`${API_URL}/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(moduleData),
    });
    if (!res.ok) throw new Error("Failed to add module");
    return res.json();
  },

  deleteModule: async (moduleId) => {
    const res = await fetch(`${API_URL}/modules/${moduleId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to delete module");
    return res.json();
  },

  addLesson: async (moduleId, lessonData) => {
    const res = await fetch(`${API_URL}/modules/${moduleId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(lessonData),
    });
    if (!res.ok) throw new Error("Failed to add lesson");
    return res.json();
  },

  getLesson: async (lessonId) => {
    const res = await fetch(`${API_URL}/lessons/${lessonId}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to fetch lesson");
    return res.json();
  },

  deleteLesson: async (lessonId) => {
    const res = await fetch(`${API_URL}/lessons/${lessonId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to delete lesson");
    return res.json();
  },

  // Materials Upload (FAISS + PyMuPDF)
  uploadLessonMaterial: async (courseId, lessonId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/courses/${courseId}/lessons/${lessonId}/materials`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to upload lesson material");
    }
    return res.json();
  },

  deleteMaterial: async (materialId) => {
    const res = await fetch(`${API_URL}/materials/${materialId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to delete material");
    return res.json();
  },

  // Student Enrollment & Progress
  enrollCourse: async (courseId) => {
    const res = await fetch(`${API_URL}/courses/${courseId}/enroll`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to enroll in course");
    }
    return res.json();
  },

  unenrollCourse: async (courseId) => {
    const res = await fetch(`${API_URL}/courses/${courseId}/unenroll`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to unenroll");
    return res.json();
  },

  completeLesson: async (courseId, lessonId) => {
    const res = await fetch(`${API_URL}/courses/${courseId}/lessons/${lessonId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to complete lesson");
    return res.json();
  },

  getMyLearning: async () => {
    const res = await fetch(`${API_URL}/student/my-learning`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to fetch my learning");
    return res.json();
  },

  // Dashboards
  getStudentDashboard: async () => {
    const res = await fetch(`${API_URL}/dashboard/student`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to fetch student dashboard");
    return res.json();
  },

  getInstructorDashboard: async () => {
    const res = await fetch(`${API_URL}/dashboard/instructor`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to fetch instructor dashboard");
    return res.json();
  },

  getAdminDashboard: async () => {
    const res = await fetch(`${API_URL}/dashboard/admin`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to fetch admin dashboard");
    return res.json();
  },

  getAdminUsers: async () => {
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },

  updateUserRole: async (userId, role) => {
    const res = await fetch(`${API_URL}/admin/users/${userId}/role?role=${role}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error("Failed to update user role");
    return res.json();
  },

  // NoteSense AI Services
  uploadGenericPdf: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("PDF processing failed");
    return res.json();
  },

  searchNotes: async (query, topK = 5, courseId = null, lessonId = null) => {
    const params = new URLSearchParams({ query, top_k: topK });
    if (courseId) params.append("course_id", courseId);
    if (lessonId) params.append("lesson_id", lessonId);

    const res = await fetch(`${API_URL}/search?${params.toString()}`);
    if (!res.ok) throw new Error("Search failed");
    return res.json();
  },

  askQuestion: async (question, courseId = null, lessonId = null) => {
    const res = await fetch(`${API_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, course_id: courseId, lesson_id: lessonId }),
    });
    if (!res.ok) throw new Error("Failed to ask question");
    return res.json();
  },

  generateSummary: async (courseId = null, lessonId = null) => {
    const res = await fetch(`${API_URL}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, lesson_id: lessonId }),
    });
    if (!res.ok) throw new Error("Summary generation failed");
    return res.json();
  },

  generateFlashcards: async (courseId = null, lessonId = null) => {
    const res = await fetch(`${API_URL}/flashcards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, lesson_id: lessonId }),
    });
    if (!res.ok) throw new Error("Flashcards generation failed");
    return res.json();
  },
};

export { API_URL };
