import { Navigate, useLocation } from "react-router-dom";
import { useCustomerAuth } from "../hooks/useCustomerAuth";

function CustomerProtectedRoute({ children }) {
  const { isAuthenticated, checking } = useCustomerAuth();
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
    return <Navigate to="/musteri-giris" state={{ from: location }} replace />;
  }

  return children;
}

export default CustomerProtectedRoute;
