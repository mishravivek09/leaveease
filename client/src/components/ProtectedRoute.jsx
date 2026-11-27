import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, roleName, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading session...
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (user.mustChangePassword && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace />;
  }

  if (roles && !roles.includes(roleName)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
