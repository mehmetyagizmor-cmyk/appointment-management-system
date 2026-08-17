import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../api/client";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      const data = await register({
        businessName: businessName.trim(),
        username: username.trim(),
        password,
        ownerEmail: ownerEmail.trim(),
      });
      navigate("/panel", {
        replace: true,
        state: { justRegistered: true, slug: data.business.slug },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors?.length ? err.errors : [err.message]);
      } else {
        setErrors(["Kayıt oluşturulamadı, tekrar deneyin."]);
      }
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

        <h1>İşletmenizi oluşturun</h1>
        <p className="auth-subtitle">
          Birkaç saniyede kendi randevu sayfanız ve yönetim paneliniz hazır olsun.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            İşletme adı
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              autoFocus
              autoComplete="organization"
              placeholder="Örn. Vitrin Kuaför Stüdyosu"
              required
            />
          </label>

          <label>
            Kullanıcı adı
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Panel girişinde kullanacağınız kullanıcı adı"
              required
            />
          </label>

          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <label>
            E-posta <span className="auth-optional">(opsiyonel)</span>
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              autoComplete="email"
              placeholder="Hesap bildirimleri için"
            />
          </label>

          {errors.length > 0 && (
            <ul className="form-errors">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Oluşturuluyor…" : "İşletmemi oluştur"}
          </button>
        </form>

        <p className="auth-hint">
          Zaten hesabınız var mı? <Link to="/giris">Giriş yapın</Link>
        </p>
        <Link to="/" className="auth-back">
          ← Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}

export default Register;
