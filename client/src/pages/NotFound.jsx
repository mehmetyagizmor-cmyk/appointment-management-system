import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <h1>404</h1>
        <p className="auth-subtitle">Aradığınız sayfa bulunamadı.</p>
        <Link to="/" className="btn btn-primary">
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
