import { useState, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Brain,
  BarChart3,
  User,
  Menu,
  X,
  ChevronRight,
  Shield,
  Award,
  LogIn,
  RotateCw
} from "lucide-react";
import "./App.css";

import { useAuth } from "./context/AuthContext";
import { api } from "./api";

import HomeView from "./components/HomeView";
import ExploreCoursesView from "./components/ExploreCoursesView";
import CoursePlayerView from "./components/CoursePlayerView";
import MyLearningView from "./components/MyLearningView";
import Dashboards from "./components/Dashboards";
import AiStudyAssistantView from "./components/AiStudyAssistantView";
import ProfileView from "./components/ProfileView";
import AuthModal from "./components/AuthModal";

function App() {
  const { user, role, logout, quickSwitchRole } = useAuth();
  const [activePage, setActivePage] = useState("Home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Active Course Player state (when user enters classroom for a specific course)
  const [playerCourseId, setPlayerCourseId] = useState(null);
  const [playerLessonId, setPlayerLessonId] = useState(null);

  // Scoped AI Assistant course selection
  const [assistantCourseId, setAssistantCourseId] = useState(null);

  // System Health
  const [healthStatus, setHealthStatus] = useState("checking");

  useEffect(() => {
    api.getHealth()
      .then((data) => {
        setHealthStatus(data.status === "healthy" ? "ready" : "degraded");
      })
      .catch(() => {
        setHealthStatus("offline");
      });
  }, []);

  const handleStartCourse = (courseId, lessonId = null) => {
    setPlayerCourseId(courseId);
    setPlayerLessonId(lessonId);
  };

  const handleOpenAssistantWithCourse = (courseId) => {
    setAssistantCourseId(courseId);
    setActivePage("AI Study Assistant");
  };

  // Dynamic Navigation depending on logged-in role
  const navigationItems = [
    { name: "Home", icon: Sparkles, roles: ["all"] },
    { name: "Explore Courses", icon: BookOpen, roles: ["all"] },
    { name: "My Learning", icon: GraduationCap, roles: ["student", "admin", "instructor"] },
    { name: "AI Study Assistant", icon: Brain, roles: ["all"] },
    {
      name: "Dashboard",
      icon: BarChart3,
      roles: ["all"],
      label: role === "admin" ? "Admin Dashboard" : role === "instructor" ? "Instructor Studio" : "My Dashboard",
    },
    { name: "Profile", icon: User, roles: ["all"] },
  ];

  const visibleNav = navigationItems.filter(
    (item) => item.roles.includes("all") || (user && item.roles.includes(role))
  );

  const renderContent = () => {
    // If a course player is active, render classroom player
    if (playerCourseId) {
      return (
        <CoursePlayerView
          courseId={playerCourseId}
          initialLessonId={playerLessonId}
          onBack={() => {
            setPlayerCourseId(null);
            setPlayerLessonId(null);
          }}
        />
      );
    }

    switch (activePage) {
      case "Home":
        return (
          <HomeView
            onNavigate={(page) => setActivePage(page)}
            onSelectCourse={(course) => handleStartCourse(course.id)}
          />
        );
      case "Explore Courses":
        return (
          <ExploreCoursesView
            onStartCourse={(cId, lId) => handleStartCourse(cId, lId)}
            onOpenAssistantWithCourse={handleOpenAssistantWithCourse}
          />
        );
      case "My Learning":
        return (
          <MyLearningView
            onResumeCourse={(cId, lId) => handleStartCourse(cId, lId)}
            onExplore={() => setActivePage("Explore Courses")}
          />
        );
      case "AI Study Assistant":
        return <AiStudyAssistantView initialCourseId={assistantCourseId} />;
      case "Dashboard":
        return (
          <Dashboards
            onResumeCourse={(cId, lId) => handleStartCourse(cId, lId)}
            onExplore={() => setActivePage("Explore Courses")}
          />
        );
      case "Profile":
        return <ProfileView onOpenAuth={() => setAuthModalOpen(true)} />;
      default:
        return <HomeView onNavigate={(page) => setActivePage(page)} />;
    }
  };

  return (
    <div className="app-shell">
      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand" onClick={() => { setActivePage("Home"); setPlayerCourseId(null); }}>
          <div className="brand-icon">
            <Brain size={21} />
          </div>
          <div className="brand-text-wrap">
            <span className="brand-main">Note<span className="brand-purple">Sense</span></span>
            <span className="brand-sub">E-LEARNING & AI</span>
          </div>
          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-label">PLATFORM NAVIGATION</div>

        <nav>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isSelected = activePage === item.name && !playerCourseId;
            return (
              <button
                key={item.name}
                className={`nav-link ${isSelected ? "active" : ""}`}
                onClick={() => {
                  setPlayerCourseId(null);
                  setActivePage(item.name);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label || item.name}</span>
                {isSelected && <span className="active-dot" />}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom / Quick Role Preview */}
        <div className="sidebar-bottom">
          {user ? (
            <div className="profile-sidebar-card">
              <div className="avatar">
                {user.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="profile-sidebar-meta">
                <strong>{user.full_name}</strong>
                <span className={`role-text ${role}`}>
                  {role === "admin" && "🛡️ Admin"}
                  {role === "instructor" && "👨‍🏫 Instructor"}
                  {role === "student" && "🎓 Student"}
                </span>
              </div>
            </div>
          ) : (
            <div className="guest-sidebar-card">
              <div>
                <strong>Guest Mode</strong>
                <p>Sign in to unlock full features</p>
              </div>
              <button
                className="secondary-button-sm"
                onClick={() => setAuthModalOpen(true)}
              >
                <LogIn size={13} /> Sign In
              </button>
            </div>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* MAIN CONTENT AREA */}
      <main className="main-area">
        {/* TOPBAR */}
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>

          <div className="breadcrumb">
            NoteSense <ChevronRight size={14} />
            <span>{playerCourseId ? "Classroom Player" : activePage}</span>
          </div>

          <div className="topbar-right">
            {/* Live Health Indicator */}
            <span className="system-status" title="FastAPI backend status">
              <i className={healthStatus === "ready" ? "status-ready" : "status-warn"} />
              {healthStatus === "ready" ? "System online" : "System initializing"}
            </span>

            {/* Quick Switch Dropdown / Role Pill */}
            {user ? (
              <div className="top-role-switcher">
                <span className={`top-role-badge ${role}`}>
                  {role.toUpperCase()}
                </span>
                <select
                  value={role}
                  onChange={(e) => quickSwitchRole(e.target.value)}
                  className="quick-role-select"
                  title="Switch Persona"
                >
                  <option value="student">Student (Jane)</option>
                  <option value="instructor">Instructor (Dr. Alan)</option>
                  <option value="admin">Admin (System)</option>
                </select>
                <div className="top-avatar" onClick={() => setActivePage("Profile")}>
                  {user.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
              </div>
            ) : (
              <button
                className="primary-button-sm"
                onClick={() => setAuthModalOpen(true)}
              >
                <LogIn size={14} /> Sign In / Demo
              </button>
            )}
          </div>
        </header>

        {/* DYNAMIC CONTENT */}
        <div className="content-area">{renderContent()}</div>

        {/* FOOTER */}
        <footer className="footer">
          <span>© 2026 NoteSense — AI-Powered E-Learning and Content Management Platform</span>
          <span>FastAPI • Sentence Transformers • FAISS • Gemini • DevOps Ready</span>
        </footer>
      </main>

      {/* AUTH & DEMO MODAL */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

export default App;