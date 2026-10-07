import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  Users,
  ChevronRight,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  PlayCircle
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function ExploreCoursesView({ onStartCourse, onOpenAssistantWithCourse }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [selectedCourseDetail, setSelectedCourseDetail] = useState(null);
  const [enrollingId, setEnrollingId] = useState(null);

  const categories = ["All", "AI & Data Science", "DevOps & Cloud", "Computer Science"];
  const difficulties = ["All", "Beginner", "Intermediate", "Advanced"];

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await api.getCourses({
        category: selectedCategory,
        difficulty: selectedDifficulty,
        search_term: searchTerm,
      });
      setCourses(data.courses || []);
    } catch (err) {
      console.error("Failed to load courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [selectedCategory, selectedDifficulty]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCourses();
  };

  const handleEnroll = async (courseId) => {
    if (!user) {
      alert("Please sign in to enroll in courses.");
      return;
    }
    try {
      setEnrollingId(courseId);
      const res = await api.enrollCourse(courseId);
      await fetchCourses();
      if (selectedCourseDetail && selectedCourseDetail.id === courseId) {
        const detail = await api.getCourseDetail(courseId);
        setSelectedCourseDetail(detail.course);
      }
    } catch (err) {
      alert(err.message || "Could not enroll.");
    } finally {
      setEnrollingId(null);
    }
  };

  const handleOpenDetail = async (courseId) => {
    try {
      const res = await api.getCourseDetail(courseId);
      setSelectedCourseDetail(res.course);
    } catch (err) {
      alert("Could not load course details.");
    }
  };

  return (
    <div className="explore-courses-container">
      {/* Page Header */}
      <section className="welcome-section">
        <div className="eyebrow">
          <BookOpen size={14} /> COURSE DIRECTORY & CURRICULUM
        </div>
        <h1>
          Explore <span>Academic Courses.</span>
        </h1>
        <p className="welcome-description">
          Browse comprehensive university courses, study materials, and AI-indexed lesson documents.
        </p>
      </section>

      {/* Filter and Search Bar */}
      <div className="courses-filter-bar">
        <form onSubmit={handleSearchSubmit} className="search-container courses-search-box">
          <Search size={18} className="search-symbol" />
          <input
            type="text"
            placeholder="Search by topic, language, algorithm or course title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="search-button">
            Search
          </button>
        </form>

        <div className="filter-pills-row">
          <div className="filter-group">
            <span className="filter-label"><Filter size={13} /> Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-pill ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <span className="filter-label">Difficulty:</span>
            {difficulties.map((diff) => (
              <button
                key={diff}
                className={`filter-pill ${selectedDifficulty === diff ? "active" : ""}`}
                onClick={() => setSelectedDifficulty(diff)}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Course List Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading course catalog...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={36} />
          <h3>No courses found</h3>
          <p>Try modifying your search keywords or filter criteria.</p>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <div key={course.id} className="course-card">
              <div className="course-thumbnail-wrap">
                <img
                  src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                  alt={course.title}
                  className="course-thumbnail"
                />
                <span className="course-difficulty-badge">{course.difficulty}</span>
                {course.is_enrolled && (
                  <span className="enrolled-badge">
                    <CheckCircle2 size={12} /> Enrolled ({course.progress_percent || 0}%)
                  </span>
                )}
              </div>

              <div className="course-content-body">
                <span className="course-category-tag">{course.category}</span>
                <h3 className="course-title">{course.title}</h3>
                <p className="course-desc">{course.description}</p>

                <div className="course-meta-row">
                  <span><Clock size={13} /> {course.total_lessons || 0} Lessons</span>
                  <span><Users size={13} /> {course.total_students || 0} Students</span>
                </div>

                {course.is_enrolled && (
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${course.progress_percent || 0}%` }} />
                  </div>
                )}

                <div className="course-card-actions">
                  <button
                    className="secondary-button-sm"
                    onClick={() => handleOpenDetail(course.id)}
                  >
                    View Syllabus
                  </button>

                  {course.is_enrolled ? (
                    <button
                      className="primary-button-sm"
                      onClick={() => onStartCourse && onStartCourse(course.id)}
                    >
                      <PlayCircle size={14} /> Resume Course
                    </button>
                  ) : (
                    <button
                      className="primary-button-sm"
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrollingId === course.id}
                    >
                      {enrollingId === course.id ? "Enrolling..." : (
                        <>
                          <GraduationCap size={14} /> Enroll Now
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Course Detail Modal */}
      {selectedCourseDetail && (
        <div className="modal-overlay" onClick={() => setSelectedCourseDetail(null)}>
          <div className="modal-card course-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="course-category-tag">{selectedCourseDetail.category}</span>
                <h2>{selectedCourseDetail.title}</h2>
                <p className="course-instructor-sub">
                  Instructor: <strong>{selectedCourseDetail.instructor_name}</strong> • Difficulty: <strong>{selectedCourseDetail.difficulty}</strong>
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedCourseDetail(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body-scroll">
              <p className="course-modal-desc">{selectedCourseDetail.description}</p>

              <div className="course-modal-action-row">
                {selectedCourseDetail.is_enrolled ? (
                  <button
                    className="primary-button"
                    onClick={() => {
                      const id = selectedCourseDetail.id;
                      setSelectedCourseDetail(null);
                      if (onStartCourse) onStartCourse(id);
                    }}
                  >
                    <PlayCircle size={16} /> Enter Classroom & Lesson Player
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    onClick={() => handleEnroll(selectedCourseDetail.id)}
                    disabled={enrollingId === selectedCourseDetail.id}
                  >
                    <GraduationCap size={16} /> Enroll in this Course
                  </button>
                )}

                <button
                  className="secondary-button"
                  onClick={() => {
                    const id = selectedCourseDetail.id;
                    setSelectedCourseDetail(null);
                    if (onOpenAssistantWithCourse) onOpenAssistantWithCourse(id);
                  }}
                >
                  <Sparkles size={16} /> Search & Ask NoteSense AI
                </button>
              </div>

              {/* Curriculum Tree */}
              <h3 className="curriculum-heading">Course Curriculum ({selectedCourseDetail.total_lessons} Lessons)</h3>
              <div className="curriculum-list">
                {selectedCourseDetail.modules?.map((mod, modIdx) => (
                  <div key={mod.id} className="module-accordion-card">
                    <div className="module-title-bar">
                      <h4>
                        <span className="mod-number">Module {modIdx + 1}:</span> {mod.title}
                      </h4>
                      <span className="mod-lesson-count">{mod.lessons?.length || 0} Lessons</span>
                    </div>
                    {mod.description && <p className="mod-desc-text">{mod.description}</p>}

                    <div className="module-lessons-list">
                      {mod.lessons?.map((lesson, lIdx) => (
                        <div key={lesson.id} className="lesson-item-row">
                          <div className="lesson-left">
                            <span className={`lesson-status-icon ${lesson.is_completed ? "completed" : ""}`}>
                              {lesson.is_completed ? <CheckCircle2 size={16} /> : <PlayCircle size={16} />}
                            </span>
                            <div>
                              <strong>{lesson.title}</strong>
                              <span className="lesson-duration">
                                <Clock size={12} /> {lesson.duration_minutes || 15} mins
                              </span>
                            </div>
                          </div>

                          <div className="lesson-right">
                            {lesson.materials?.length > 0 && (
                              <span className="materials-count-badge">
                                📄 {lesson.materials.length} PDF notes
                              </span>
                            )}
                            {selectedCourseDetail.is_enrolled && (
                              <button
                                className="start-lesson-btn"
                                onClick={() => {
                                  const cId = selectedCourseDetail.id;
                                  setSelectedCourseDetail(null);
                                  if (onStartCourse) onStartCourse(cId, lesson.id);
                                }}
                              >
                                {lesson.is_completed ? "Review" : "Start"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
