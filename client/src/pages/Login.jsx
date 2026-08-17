import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../api/client";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/panel";

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Giriş yapılamadı, tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <span className="admin-brand-mark">R</span>
          Randevu Yönetim Sistemi
        </Link>

        <h1>Yönetici Girişi</h1>
        <p className="auth-subtitle">
          Randevularınızı, hizmetlerinizi ve ekibinizi yönetmek için giriş yapın.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Kullanıcı adı
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              required
            />
          </label>

          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>

        <p className="auth-hint">
          Demo hesap: <code>admin</code> / <code>admin123</code>
        </p>
        <p className="auth-hint">
          Henüz hesabınız yok mu? <Link to="/kayit">İşletmenizi oluşturun</Link>
        </p>
        <Link to="/" className="auth-back">
          ← Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}

export default Login;
