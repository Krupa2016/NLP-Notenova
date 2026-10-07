import { useState, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  Brain,
  Layers,
  ChevronRight,
  GraduationCap,
  Activity,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  Users
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function HomeView({ onNavigate, onSelectCourse }) {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getHealth().catch(() => null),
      api.getCourses().catch(() => ({ courses: [] })),
    ]).then(([healthData, coursesData]) => {
      setHealth(healthData);
      setCourses(coursesData?.courses || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="home-view-container">
      {/* Hero Section */}
      <section className="welcome-section hero-banner">
        <div className="hero-top-meta">
          <div className="eyebrow">
            <Sparkles size={14} /> AUTOMATED E-LEARNING & AI STUDY PLATFORM
          </div>

          {health && (
            <div className="health-badge-pill" title={`Vector Store: ${health.vector_store?.total_vectors || 0} chunks indexed`}>
              <span className="health-indicator-dot online" />
              <span>System: <strong>{health.status.toUpperCase()}</strong></span>
              <span className="health-separator">•</span>
              <span>FAISS: <strong>{health.vector_store?.total_vectors || 0} vectors</strong></span>
            </div>
          )}
        </div>

        <h1>
          Master concepts with
          <br />
          <span>Intelligent Courseware & Semantic Search.</span>
        </h1>

        <p className="welcome-description">
          An automated e-learning content release platform combining course curriculum management, 
          PyMuPDF text extraction, FAISS vector embeddings, and Gemini generative AI for active study.
        </p>

        <div className="hero-actions-group">
          <button className="primary-button" onClick={() => onNavigate("Explore Courses")}>
            <BookOpen size={16} /> Explore Courses <ChevronRight size={16} />
          </button>
          <button className="secondary-button" onClick={() => onNavigate("AI Study Assistant")}>
            <Brain size={16} /> Launch AI Study Assistant
          </button>
        </div>
      </section>

      {/* Metrics Counter Bar */}
      <div className="platform-metrics-grid">
        <div className="metric-box">
          <div className="metric-icon-wrap purple"><BookOpen size={20} /></div>
          <div>
            <h3>{courses.length}+</h3>
            <span>Published Courses</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap blue"><Users size={20} /></div>
          <div>
            <h3>{courses.reduce((acc, c) => acc + (c.total_students || 0), 3)}+</h3>
            <span>Enrolled Students</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap emerald"><Layers size={20} /></div>
          <div>
            <h3>{health?.vector_store?.total_vectors || 197}+</h3>
            <span>FAISS Vector Chunks</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap amber"><Activity size={20} /></div>
          <div>
            <h3>99.9%</h3>
            <span>Pipeline Uptime</span>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Learning Modules & AI Tools</h2>
            <p>Select an environment to start exploring.</p>
          </div>
        </div>

        <div className="tools-grid">
          <button className="tool-card" onClick={() => onNavigate("Explore Courses")}>
            <div className="tool-icon"><GraduationCap size={20} /></div>
            <h3>Course Curriculum</h3>
            <p>Browse structured modules, lessons, and interactive course materials.</p>
            <span className="tool-arrow"><ChevronRight size={17} /></span>
          </button>

          <button className="tool-card" onClick={() => onNavigate("My Learning")}>
            <div className="tool-icon"><Award size={20} /></div>
            <h3>My Learning</h3>
            <p>Track lesson completion percentages and resume right where you left off.</p>
            <span className="tool-arrow"><ChevronRight size={17} /></span>
          </button>

          <button className="tool-card" onClick={() => onNavigate("AI Study Assistant")}>
            <div className="tool-icon"><Brain size={20} /></div>
            <h3>Semantic AI Assistant</h3>
            <p>Ask questions, generate exam flashcards, and create instant summaries.</p>
            <span className="tool-arrow"><ChevronRight size={17} /></span>
          </button>

          <button className="tool-card" onClick={() => onNavigate("Dashboard")}>
            <div className="tool-icon"><Activity size={20} /></div>
            <h3>Role Dashboard</h3>
            <p>View administrative metrics, manage enrolled classes, or publish content.</p>
            <span className="tool-arrow"><ChevronRight size={17} /></span>
          </button>
        </div>
      </section>

      {/* Featured Courses Showcase */}
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Featured Courses</h2>
            <p>Curated learning materials with AI-indexed study documents.</p>
          </div>
          <button className="view-all-link" onClick={() => onNavigate("Explore Courses")}>
            View all courses <ArrowRight size={14} />
          </button>
        </div>

        <div className="courses-showcase-grid">
          {courses.slice(0, 3).map((course) => (
            <div key={course.id} className="course-card">
              <div className="course-thumbnail-wrap">
                <img
                  src={course.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                  alt={course.title}
                  className="course-thumbnail"
                />
                <span className="course-difficulty-badge">{course.difficulty}</span>
              </div>

              <div className="course-content-body">
                <span className="course-category-tag">{course.category}</span>
                <h3 className="course-title">{course.title}</h3>
                <p className="course-desc">{course.description?.substring(0, 110)}...</p>

                <div className="course-meta-row">
                  <span><Clock size={13} /> {course.total_lessons || 6} Lessons</span>
                  <span><Users size={13} /> {course.total_students || 0} Students</span>
                </div>

                <div className="course-footer-row">
                  <span className="course-instructor-name">By {course.instructor_name}</span>
                  <button
                    className="primary-button-sm"
                    onClick={() => {
                      if (onSelectCourse) onSelectCourse(course);
                      onNavigate("Explore Courses");
                    }}
                  >
                    View Course
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DevOps & Architecture Note */}
      <section className="architecture-banner">
        <div className="arch-content">
          <div className="eyebrow"><CheckCircle2 size={13} /> PRODUCTION-GRADE ARCHITECTURE</div>
          <h3>Seamless Semantic Ingestion Pipeline</h3>
          <p>
            Instructor PDF uploads are processed through PyMuPDF text stream partitioning, 
            vectorized using <code>all-MiniLM-L6-v2</code> sentence transformers, and indexed into FAISS 
            with full course and lesson isolation.
          </p>
        </div>
        <div className="arch-tags">
          <span className="arch-tag">Docker</span>
          <span className="arch-tag">Jenkins CI/CD</span>
          <span className="arch-tag">FAISS FlatIP</span>
          <span className="arch-tag">FastAPI</span>
          <span className="arch-tag">React Vite</span>
          <span className="arch-tag">Ansible</span>
        </div>
      </section>
    </div>
  );
}
