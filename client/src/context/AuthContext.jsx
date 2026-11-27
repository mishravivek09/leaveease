import { createContext, useContext, useEffect, useState } from "react";
import API from "@/lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("token")));

  const refreshUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const res = await API.get("/auth/me");
      const emp = res.data.employee;
      localStorage.setItem("user", JSON.stringify(emp));
      setUser(emp);
      return emp;
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    API.get("/auth/me")
      .then((res) => {
        const emp = res.data.employee;
        localStorage.setItem("user", JSON.stringify(emp));
        setUser(emp);
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (data) => {
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    const emp = data.employee || data.user;
    if (emp) {
      localStorage.setItem("user", JSON.stringify(emp));
      setUser(emp);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const roleName = user?.roleId?.roleName || user?.role || null;

  return (
    <AuthContext.Provider value={{ user, roleName, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
