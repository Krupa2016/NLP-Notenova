import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("notesense_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("notesense_token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we have token, verify with /auth/me
    if (token) {
      api.getMe()
        .then((res) => {
          setUser(res.user);
          localStorage.setItem("notesense_user", JSON.stringify(res.user));
        })
        .catch(() => {
          // If expired, clear
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      // Default to guest or auto-login default student for convenience if nothing set
      setLoading(false);
    }
  }, [token]);

  const login = async (username_or_email, password) => {
    const res = await api.login(username_or_email, password);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem("notesense_token", res.access_token);
    localStorage.setItem("notesense_user", JSON.stringify(res.user));
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem("notesense_token", res.access_token);
    localStorage.setItem("notesense_user", JSON.stringify(res.user));
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("notesense_token");
    localStorage.removeItem("notesense_user");
  };

  const quickSwitchRole = async (targetRole) => {
    let creds = { username: "student", pass: "student123" };
    if (targetRole === "instructor") {
      creds = { username: "dralan", pass: "instructor123" };
    } else if (targetRole === "admin") {
      creds = { username: "admin", pass: "admin123" };
    }
    return login(creds.username, creds.pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || "guest",
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        quickSwitchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
