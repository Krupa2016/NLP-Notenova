import { useState } from "react";
import { X, Sparkles, LogIn, UserPlus, Shield, GraduationCap, Award } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, quickSwitchRole } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!email || !username || !fullName || !password) {
          throw new Error("Please fill in all fields.");
        }
        await register({ email, username, full_name: fullName, password, role });
      } else {
        if (!username || !password) {
          throw new Error("Please enter your username/email and password.");
        }
        await login(username, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = async (targetRole) => {
    setLoading(true);
    setError("");
    try {
      await quickSwitchRole(targetRole);
      onClose();
    } catch (err) {
      setError("Failed to sign in as " + targetRole);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="eyebrow">
              <Sparkles size={13} /> {isRegister ? "CREATE ACCOUNT" : "WELCOME BACK"}
            </div>
            <h2>{isRegister ? "Join NoteSense" : "Sign In to NoteSense"}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Demo Fast Login Pills */}
        <div className="quick-roles-panel">
          <span className="quick-roles-title">⚡ Instant Demo Switcher:</span>
          <div className="quick-roles-buttons">
            <button
              type="button"
              className="quick-role-btn student"
              onClick={() => handleQuickRole("student")}
              disabled={loading}
            >
              <GraduationCap size={14} /> Student
            </button>
            <button
              type="button"
              className="quick-role-btn instructor"
              onClick={() => handleQuickRole("instructor")}
              disabled={loading}
            >
              <Award size={14} /> Instructor
            </button>
            <button
              type="button"
              className="quick-role-btn admin"
              onClick={() => handleQuickRole("admin")}
              disabled={loading}
            >
              <Shield size={14} /> Admin
            </button>
          </div>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Marie Curie"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. marie@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>{isRegister ? "Username" : "Username or Email"}</label>
            <input
              type="text"
              placeholder={isRegister ? "e.g. mcurie" : "student or student@notesense.ai"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label>Select Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="student">Student (Learn & Revise)</option>
                <option value="instructor">Instructor (Create & Publish)</option>
              </select>
            </div>
          )}

          <button type="submit" className="primary-button auth-submit-btn" disabled={loading}>
            {loading ? "Processing..." : isRegister ? (
              <>
                <UserPlus size={16} /> Create Account
              </>
            ) : (
              <>
                <LogIn size={16} /> Sign In
              </>
            )}
          </button>
        </form>

        <div className="auth-switch-prompt">
          {isRegister ? (
            <p>
              Already have an account?{" "}
              <button type="button" onClick={() => setIsRegister(false)}>
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Need a new account?{" "}
              <button type="button" onClick={() => setIsRegister(true)}>
                Sign Up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
