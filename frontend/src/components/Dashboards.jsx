import { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  GraduationCap,
  Shield,
  Award,
  Layers,
  CheckCircle2,
  Plus,
  Trash2,
  Upload,
  Eye,
  Activity,
  Sparkles,
  PlayCircle,
  Clock,
  FileText,
  Filter
} from "lucide-react";
import { api, API_URL } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Dashboards({ onResumeCourse, onExplore }) {
  const { user, role } = useAuth();

  if (role === "admin") {
    return <AdminDashboard onResumeCourse={onResumeCourse} onExplore={onExplore} />;
  } else if (role === "instructor") {
    return <InstructorDashboard onResumeCourse={onResumeCourse} />;
  } else {
    return <StudentDashboard onResumeCourse={onResumeCourse} onExplore={onExplore} />;
  }
}

// -------------------------------------------------------------
// STUDENT DASHBOARD
// -------------------------------------------------------------
function StudentDashboard({ onResumeCourse, onExplore }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentDashboard()
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state"><div className="spinner" /><p>Loading student analytics...</p></div>;

  return (
    <div className="dashboard-container">
      <section className="welcome-section">
        <div className="eyebrow"><GraduationCap size={14} /> STUDENT DASHBOARD</div>
        <h1>Welcome, <span>Student!</span></h1>
        <p className="welcome-description">
          Monitor your active courses, track completed syllabus modules, and discover recommended courses.
        </p>
      </section>

      <div className="platform-metrics-grid">
        <div className="metric-box">
          <div className="metric-icon-wrap purple"><BookOpen size={20} /></div>
          <div>
            <h3>{data?.total_enrolled || 0}</h3>
            <span>Enrolled Courses</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap emerald"><CheckCircle2 size={20} /></div>
          <div>
            <h3>{data?.total_completed_lessons || 0}</h3>
            <span>Lessons Completed</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap blue"><Sparkles size={20} /></div>
          <div>
            <h3>{data?.recommended_courses?.length || 0}</h3>
            <span>Recommendations</span>
          </div>
        </div>
      </div>

      {/* Enrolled Courses */}
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>My Enrolled Courses</h2>
            <p>Active courses in progress.</p>
          </div>
        </div>

        {data?.enrolled_courses?.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={32} />
            <p>You have not enrolled in any courses yet.</p>
            <button className="primary-button" onClick={onExplore}>Explore Courses</button>
          </div>
        ) : (
          <div className="dashboard-cards-grid">
            {data?.enrolled_courses?.map((c) => (
              <div key={c.course_id} className="dash-course-card">
                <div className="dash-course-head">
                  <span className="course-category-tag">{c.category}</span>
                  <span className="course-difficulty-badge">{c.difficulty}</span>
                </div>
                <h3>{c.title}</h3>
                <div className="dash-progress-wrap">
                  <div className="progress-labels">
                    <span>Progress</span>
                    <strong>{c.progress_percent}%</strong>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${c.progress_percent}%` }} />
                  </div>
                </div>
                <div className="dash-card-footer">
                  <span className="dash-last-lesson">Next: {c.last_lesson_title || "Lesson 1"}</span>
                  <button
                    className="primary-button-sm"
                    onClick={() => onResumeCourse(c.course_id, c.last_accessed_lesson_id)}
                  >
                    <PlayCircle size={14} /> Continue
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recommended Courses */}
      {data?.recommended_courses?.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <h2>Recommended For You</h2>
              <p>Expand your skill set with these popular courses.</p>
            </div>
          </div>
          <div className="dashboard-cards-grid">
            {data.recommended_courses.map((rec) => (
              <div key={rec.id} className="dash-course-card">
                <span className="course-category-tag">{rec.category}</span>
                <h3>{rec.title}</h3>
                <p className="dash-course-desc">{rec.description?.substring(0, 90)}...</p>
                <div className="dash-card-footer">
                  <span>{rec.total_lessons} Lessons • By {rec.instructor_name}</span>
                  <button className="secondary-button-sm" onClick={onExplore}>
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// INSTRUCTOR DASHBOARD
// -------------------------------------------------------------
function InstructorDashboard({ onResumeCourse }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(null); // course_id
  const [showLessonModal, setShowLessonModal] = useState(null); // module_id
  const [showMaterialModal, setShowMaterialModal] = useState(null); // {course_id, lesson_id}

  // Course Form
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "AI & Data Science",
    difficulty: "Beginner",
    thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
    is_published: true,
  });

  // Module & Lesson Form
  const [modTitle, setModTitle] = useState("");
  const [modDesc, setModDesc] = useState("");
  const [lesTitle, setLesTitle] = useState("");
  const [lesContent, setLesContent] = useState("");
  const [lesDuration, setLesDuration] = useState(20);

  // Material File & Status
  const [matFile, setMatFile] = useState(null);
  const [matUploading, setMatUploading] = useState(false);
  const [matResult, setMatResult] = useState(null);

  const fetchInstructorData = async () => {
    try {
      setLoading(true);
      const res = await api.getInstructorDashboard();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructorData();
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await api.createCourse(courseForm);
      setShowCreateModal(false);
      setCourseForm({
        title: "",
        description: "",
        category: "AI & Data Science",
        difficulty: "Beginner",
        thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
        is_published: true,
      });
      fetchInstructorData();
    } catch (err) {
      alert("Failed to create course: " + err.message);
    }
  };

  const handleTogglePublish = async (courseId) => {
    try {
      await api.togglePublishCourse(courseId);
      fetchInstructorData();
    } catch (err) {
      alert("Failed to toggle publish status.");
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    try {
      await api.deleteCourse(courseId);
      fetchInstructorData();
    } catch (err) {
      alert("Failed to delete course.");
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    try {
      await api.addModule(showModuleModal, { title: modTitle, description: modDesc });
      setShowModuleModal(null);
      setModTitle("");
      setModDesc("");
      fetchInstructorData();
      alert("Module created successfully!");
    } catch (err) {
      alert("Failed to add module.");
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    try {
      await api.addLesson(showLessonModal, {
        title: lesTitle,
        content: lesContent,
        duration_minutes: Number(lesDuration) || 20,
      });
      setShowLessonModal(null);
      setLesTitle("");
      setLesContent("");
      fetchInstructorData();
      alert("Lesson created successfully!");
    } catch (err) {
      alert("Failed to add lesson.");
    }
  };

  const handleUploadLessonMaterial = async (e) => {
    e.preventDefault();
    if (!matFile || !showMaterialModal) return;

    try {
      setMatUploading(true);
      setMatResult(null);
      const res = await api.uploadLessonMaterial(
        showMaterialModal.course_id,
        showMaterialModal.lesson_id,
        matFile
      );
      setMatResult(res);
      setMatFile(null);
      fetchInstructorData();
    } catch (err) {
      alert("Material upload failed: " + err.message);
    } finally {
      setMatUploading(false);
    }
  };

  if (loading) return <div className="loading-state"><div className="spinner" /><p>Loading instructor workspace...</p></div>;

  return (
    <div className="dashboard-container">
      <section className="welcome-section">
        <div className="eyebrow"><Award size={14} /> INSTRUCTOR STUDIO</div>
        <h1>Course Management & <span>Material Pipeline.</span></h1>
        <p className="welcome-description">
          Create courses, structure modules & lessons, and upload PDF notes into the automated FAISS vector indexing pipeline.
        </p>
      </section>

      {/* Metrics */}
      <div className="platform-metrics-grid">
        <div className="metric-box">
          <div className="metric-icon-wrap purple"><BookOpen size={20} /></div>
          <div>
            <h3>{data?.total_courses || 0}</h3>
            <span>Authored Courses</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap blue"><Users size={20} /></div>
          <div>
            <h3>{data?.total_students || 0}</h3>
            <span>Enrolled Students</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap emerald"><CheckCircle2 size={20} /></div>
          <div>
            <h3>{data?.published_courses || 0}</h3>
            <span>Published</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap amber"><FileText size={20} /></div>
          <div>
            <h3>{data?.total_materials || 0}</h3>
            <span>PDF Materials Indexed</span>
          </div>
        </div>
      </div>

      {/* Course List & Actions */}
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>My Authored Courses</h2>
            <p>Manage syllabus, modules, publication status, and learning documents.</p>
          </div>
          <button className="primary-button" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Create New Course
          </button>
        </div>

        <div className="instructor-courses-table-wrap">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Category</th>
                <th>Lessons</th>
                <th>Students</th>
                <th>Materials</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.courses?.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.title}</strong>
                    <div className="table-subtext">{c.difficulty} Level</div>
                  </td>
                  <td>{c.category}</td>
                  <td>{c.lesson_count || 0}</td>
                  <td>{c.student_count || 0}</td>
                  <td>{c.material_count || 0} PDF(s)</td>
                  <td>
                    <button
                      className={`status-toggle-chip ${c.is_published ? "published" : "draft"}`}
                      onClick={() => handleTogglePublish(c.id)}
                    >
                      {c.is_published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td>
                    <div className="table-actions-cell">
                      <button
                        className="table-action-btn"
                        title="Add Module"
                        onClick={() => setShowModuleModal(c.id)}
                      >
                        <Plus size={14} /> Module
                      </button>
                      <button
                        className="table-action-btn"
                        title="Delete Course"
                        onClick={() => handleDeleteCourse(c.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Material Ingestion Pipeline Shortcut */}
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Upload & Index Lesson Materials</h2>
            <p>Upload lecture notes and PDF handouts directly into course lessons to trigger FAISS vectorization.</p>
          </div>
        </div>

        <div className="material-quick-uploader-card">
          <div className="eyebrow"><Sparkles size={12} /> FAISS MULTI-COURSE INGESTION</div>
          <h3>Select Target Lesson to Index PDF Notes</h3>
          <p className="welcome-description">
            Choose a course and lesson below to link and vectorize study material with PyMuPDF and Sentence Transformers.
          </p>

          <div className="uploader-select-row">
            {data?.courses?.map((c) => (
              <div key={c.id} className="uploader-course-chip">
                <strong>{c.title}</strong>
                <button
                  className="secondary-button-sm"
                  onClick={() => setShowMaterialModal({ course_id: c.id, lesson_id: 1 })}
                >
                  <Upload size={14} /> Attach PDF to Lesson
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CREATE COURSE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Course</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCourse} className="auth-form">
              <div className="form-group">
                <label>Course Title</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Systems & Microservices"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  placeholder="Course goals, target audience, and syllabus overview..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                  >
                    <option value="AI & Data Science">AI & Data Science</option>
                    <option value="DevOps & Cloud">DevOps & Cloud</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Difficulty</label>
                  <select
                    value={courseForm.difficulty}
                    onChange={(e) => setCourseForm({ ...courseForm, difficulty: e.target.value })}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="primary-button auth-submit-btn">
                Create & Initialize Course
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD MODULE MODAL */}
      {showModuleModal && (
        <div className="modal-overlay" onClick={() => setShowModuleModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Module to Course #{showModuleModal}</h2>
              <button className="modal-close-btn" onClick={() => setShowModuleModal(null)}>✕</button>
            </div>
            <form onSubmit={handleAddModule} className="auth-form">
              <div className="form-group">
                <label>Module Title</label>
                <input
                  type="text"
                  placeholder="e.g. Module 4: High-Performance Data Streaming"
                  value={modTitle}
                  onChange={(e) => setModTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Module Description</label>
                <input
                  type="text"
                  placeholder="Brief summary of concepts covered"
                  value={modDesc}
                  onChange={(e) => setModDesc(e.target.value)}
                />
              </div>
              <button type="submit" className="primary-button auth-submit-btn">Add Module</button>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD PDF LESSON MATERIAL MODAL */}
      {showMaterialModal && (
        <div className="modal-overlay" onClick={() => setShowMaterialModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload PDF Study Material</h2>
              <button className="modal-close-btn" onClick={() => setShowMaterialModal(null)}>✕</button>
            </div>
            <p className="welcome-description">
              Upload will process through PyMuPDF, chunk text, generate sentence embeddings, 
              and index into FAISS without overwriting existing data.
            </p>

            <form onSubmit={handleUploadLessonMaterial} className="auth-form">
              <div className="form-group">
                <label>Select Target Lesson ID</label>
                <input
                  type="number"
                  value={showMaterialModal.lesson_id}
                  onChange={(e) => setShowMaterialModal({ ...showMaterialModal, lesson_id: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label>PDF Document</label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setMatFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <button type="submit" className="primary-button auth-submit-btn" disabled={matUploading}>
                {matUploading ? "Vectorizing & Indexing in FAISS..." : "Process & Index Material"}
              </button>
            </form>

            {matResult && (
              <div className="result-card" style={{ marginTop: "15px" }}>
                <h4 style={{ color: "var(--accent-emerald)" }}>✔ Successfully Processed!</h4>
                <p>
                  <strong>{matResult.filename}</strong>: {matResult.pages} page(s) parsed, {matResult.chunks} semantic chunks stored in FAISS.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// ADMIN DASHBOARD
// -------------------------------------------------------------
function AdminDashboard({ onResumeCourse, onExplore }) {
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [dashRes, usersRes] = await Promise.all([
        api.getAdminDashboard(),
        api.getAdminUsers(),
      ]);
      setData(dashRes);
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      fetchAdminData();
    } catch (err) {
      alert("Failed to update role: " + err.message);
    }
  };

  if (loading) return <div className="loading-state"><div className="spinner" /><p>Loading administrative dashboard...</p></div>;

  return (
    <div className="dashboard-container">
      <section className="welcome-section">
        <div className="eyebrow"><Shield size={14} /> PLATFORM ADMINISTRATION</div>
        <h1>System & User <span>Governance.</span></h1>
        <p className="welcome-description">
          Monitor total users, course catalog health, role allocations, and content release status.
        </p>
      </section>

      {/* Metrics Grid */}
      <div className="platform-metrics-grid">
        <div className="metric-box">
          <div className="metric-icon-wrap purple"><Users size={20} /></div>
          <div>
            <h3>{data?.stats?.total_users || 0}</h3>
            <span>Total Users</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap blue"><GraduationCap size={20} /></div>
          <div>
            <h3>{data?.stats?.total_students || 0}</h3>
            <span>Students</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap emerald"><Award size={20} /></div>
          <div>
            <h3>{data?.stats?.total_instructors || 0}</h3>
            <span>Instructors</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap amber"><BookOpen size={20} /></div>
          <div>
            <h3>{data?.stats?.total_courses || 0}</h3>
            <span>Total Courses ({data?.stats?.published_courses} Published)</span>
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>User Management & Roles</h2>
            <p>Assign administrative, instructor, or student privileges.</p>
          </div>
        </div>

        <div className="instructor-courses-table-wrap">
          <table className="modern-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Current Role</th>
                <th>Change Role</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.full_name}</strong>
                    <div className="table-subtext">@{u.username}</div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge-tag ${u.role}`}>{u.role.toUpperCase()}</span>
                  </td>
                  <td>
                    <select
                      className="role-select-box"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{u.created_at?.substring(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Courses Oversight Section */}
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Course Catalog Oversight</h2>
            <p>All active courses on the platform.</p>
          </div>
        </div>

        <div className="instructor-courses-table-wrap">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Instructor</th>
                <th>Category</th>
                <th>Enrollments</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.recent_courses?.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.title}</strong></td>
                  <td>{c.instructor_name}</td>
                  <td>{c.category}</td>
                  <td>{c.student_count || 0}</td>
                  <td>
                    <span className={`status-toggle-chip ${c.is_published ? "published" : "draft"}`}>
                      {c.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
