import { useState, useEffect } from "react";
import {
  GraduationCap,
  PlayCircle,
  Clock,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Sparkles,
  BarChart3,
  XCircle
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function MyLearningView({ onResumeCourse, onExplore }) {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyLearning = async () => {
    try {
      setLoading(true);
      const res = await api.getMyLearning();
      setEnrolledCourses(res.enrolled_courses || []);
    } catch (err) {
      console.error("Failed to load my learning:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLearning();
  }, []);

  const handleUnenroll = async (courseId) => {
    if (!confirm("Are you sure you want to unenroll from this course?")) return;
    try {
      await api.unenrollCourse(courseId);
      await fetchMyLearning();
    } catch (err) {
      alert("Failed to unenroll.");
    }
  };

  const totalCompletedLessons = enrolledCourses.reduce(
    (acc, c) => acc + (c.completed_lessons || 0),
    0
  );
  const totalLessons = enrolledCourses.reduce(
    (acc, c) => acc + (c.total_lessons || 0),
    0
  );
  const averageProgress = enrolledCourses.length
    ? Math.round(
        enrolledCourses.reduce((acc, c) => acc + (c.progress_percent || 0), 0) /
          enrolledCourses.length
      )
    : 0;

  return (
    <div className="my-learning-container">
      {/* Header */}
      <section className="welcome-section">
        <div className="eyebrow">
          <GraduationCap size={14} /> ACTIVE ENROLLMENTS & STUDY PROGRESS
        </div>
        <h1>
          My <span>Learning Journey.</span>
        </h1>
        <p className="welcome-description">
          Pick up right where you left off, review completed modules, and track syllabus mastery.
        </p>
      </section>

      {/* Stats Ribbon */}
      <div className="platform-metrics-grid">
        <div className="metric-box">
          <div className="metric-icon-wrap purple"><BookOpen size={20} /></div>
          <div>
            <h3>{enrolledCourses.length}</h3>
            <span>Enrolled Courses</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap emerald"><CheckCircle2 size={20} /></div>
          <div>
            <h3>{totalCompletedLessons} / {totalLessons}</h3>
            <span>Lessons Completed</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap blue"><BarChart3 size={20} /></div>
          <div>
            <h3>{averageProgress}%</h3>
            <span>Average Progress</span>
          </div>
        </div>
      </div>

      {/* Courses Section */}
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Enrolled Courseware</h2>
            <p>Courses currently in your study schedule.</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading your courses...</p>
          </div>
        ) : enrolledCourses.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={36} />
            <h3>No enrolled courses yet</h3>
            <p>Explore our catalog to find courses and start learning with AI study assistance.</p>
            <button className="primary-button" onClick={onExplore}>
              Browse Courses <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="my-learning-grid">
            {enrolledCourses.map((item) => (
              <div key={item.course_id} className="learning-course-card">
                <div className="learning-card-thumb-wrap">
                  <img
                    src={item.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                    alt={item.title}
                    className="learning-thumb"
                  />
                  <span className="course-difficulty-badge">{item.difficulty}</span>
                </div>

                <div className="learning-card-content">
                  <div className="learning-card-top">
                    <span className="course-category-tag">{item.category}</span>
                    <button
                      className="unenroll-link-btn"
                      onClick={() => handleUnenroll(item.course_id)}
                      title="Unenroll from course"
                    >
                      <XCircle size={14} /> Unenroll
                    </button>
                  </div>

                  <h3 className="learning-course-title">{item.title}</h3>
                  <p className="learning-instructor-text">Instructor: {item.instructor_name}</p>

                  {/* Progress section */}
                  <div className="learning-progress-block">
                    <div className="progress-labels">
                      <span>Course Progress</span>
                      <strong>{item.progress_percent}%</strong>
                    </div>
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${item.progress_percent}%` }}
                      />
                    </div>
                    <div className="progress-sub-info">
                      <span>{item.completed_lessons} of {item.total_lessons} lessons completed</span>
                    </div>
                  </div>

                  {/* Resume Section */}
                  <div className="learning-card-bottom">
                    <div className="resume-lesson-info">
                      <span className="resume-label">NEXT / CURRENT LESSON:</span>
                      <strong className="resume-lesson-title">
                        {item.last_lesson_title || "Lesson 1: Introduction"}
                      </strong>
                    </div>

                    <button
                      className="primary-button resume-action-btn"
                      onClick={() => onResumeCourse(item.course_id, item.last_accessed_lesson_id)}
                    >
                      <PlayCircle size={16} /> Resume Learning
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
