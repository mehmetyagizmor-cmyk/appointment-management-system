import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function ProtectedRoute({ children }) {
  const { isAuthenticated, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div className="loading-state full-screen">
        <div className="spinner" />
        <p>Yükleniyor…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/giris" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
