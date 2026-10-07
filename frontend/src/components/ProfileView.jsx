import { useState } from "react";
import { User, Shield, GraduationCap, Award, LogOut, CheckCircle2, Key, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ProfileView({ onOpenAuth }) {
  const { user, role, logout, quickSwitchRole } = useAuth();
  const [switching, setSwitching] = useState(false);

  const handleRoleSwitch = async (targetRole) => {
    try {
      setSwitching(true);
      await quickSwitchRole(targetRole);
    } catch (err) {
      alert("Failed to switch role.");
    } finally {
      setSwitching(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-container">
        <section className="welcome-section">
          <div className="eyebrow"><User size={14} /> USER PROFILE</div>
          <h1>Account <span>Access.</span></h1>
          <p className="welcome-description">
            You are currently browsing as a guest. Sign in to access personal enrollments, 
            authored courses, and role dashboards.
          </p>
          <button className="primary-button" onClick={onOpenAuth}>
            Sign In / Register
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <section className="welcome-section">
        <div className="eyebrow"><User size={14} /> USER PROFILE & ACCESS CONTROL</div>
        <h1>Account <span>Settings.</span></h1>
        <p className="welcome-description">
          Manage your role privileges, inspect authentication status, and switch between role profiles.
        </p>
      </section>

      <div className="profile-card-layout">
        {/* User Card */}
        <div className="profile-main-card">
          <div className="profile-avatar-large">
            {user.full_name?.charAt(0).toUpperCase() || "U"}
          </div>

          <div className="profile-details-info">
            <h2>{user.full_name}</h2>
            <span className="profile-username-tag">@{user.username}</span>
            <p className="profile-email-text">{user.email}</p>

            <div className="profile-role-status-badge">
              {role === "admin" && <Shield size={14} />}
              {role === "instructor" && <Award size={14} />}
              {role === "student" && <GraduationCap size={14} />}
              <span>Current Role: <strong>{role.toUpperCase()}</strong></span>
            </div>
          </div>

          <button className="logout-button" onClick={logout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Quick Role Switcher for Academic Evaluation / DevOps Demonstration */}
        <div className="profile-role-switcher-card">
          <div className="eyebrow"><RefreshCw size={13} /> ONE-CLICK ROLE SWITCHER</div>
          <h3>Simulate Platform Personas</h3>
          <p className="welcome-description">
            Quickly switch active personas to test role-based access control, course authoring, 
            and administrative dashboards in real-time.
          </p>

          <div className="role-switch-grid">
            <button
              className={`role-choice-card ${role === "student" ? "active" : ""}`}
              onClick={() => handleRoleSwitch("student")}
              disabled={switching}
            >
              <div className="role-icon-wrap student"><GraduationCap size={22} /></div>
              <h4>Student Persona</h4>
              <p>Jane Student — Browse catalog, enroll in courses, complete lessons, and query NoteSense AI.</p>
              {role === "student" && <span className="active-tag"><CheckCircle2 size={13} /> Active</span>}
            </button>

            <button
              className={`role-choice-card ${role === "instructor" ? "active" : ""}`}
              onClick={() => handleRoleSwitch("instructor")}
              disabled={switching}
            >
              <div className="role-icon-wrap instructor"><Award size={22} /></div>
              <h4>Instructor Persona</h4>
              <p>Dr. Alan Turing — Create courses, manage syllabus modules, and upload PDF lecture notes.</p>
              {role === "instructor" && <span className="active-tag"><CheckCircle2 size={13} /> Active</span>}
            </button>

            <button
              className={`role-choice-card ${role === "admin" ? "active" : ""}`}
              onClick={() => handleRoleSwitch("admin")}
              disabled={switching}
            >
              <div className="role-icon-wrap admin"><Shield size={22} /></div>
              <h4>Admin Persona</h4>
              <p>System Administrator — Platform governance, user role modification, and system health oversight.</p>
              {role === "admin" && <span className="active-tag"><CheckCircle2 size={13} /> Active</span>}
            </button>
          </div>
        </div>

        {/* Permissions Table */}
        <div className="profile-permissions-card">
          <h3>Active Role Permissions</h3>
          <ul className="permissions-list">
            <li className={role === "admin" || role === "instructor" || role === "student" ? "granted" : "denied"}>
              ✓ Browse published courses and modules
            </li>
            <li className={role === "admin" || role === "student" ? "granted" : "denied"}>
              ✓ Enroll in courses & track lesson completion
            </li>
            <li className={role === "admin" || role === "instructor" || role === "student" ? "granted" : "denied"}>
              ✓ Access NoteSense AI semantic search, Q&A, summaries, and flashcards
            </li>
            <li className={role === "admin" || role === "instructor" ? "granted" : "denied"}>
              {role === "admin" || role === "instructor" ? "✓" : "✗"} Create, edit, and publish academic courses
            </li>
            <li className={role === "admin" || role === "instructor" ? "granted" : "denied"}>
              {role === "admin" || role === "instructor" ? "✓" : "✗"} Upload PDF notes to trigger FAISS vectorization
            </li>
            <li className={role === "admin" ? "granted" : "denied"}>
              {role === "admin" ? "✓" : "✗"} System administrative dashboard & user role governance
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
