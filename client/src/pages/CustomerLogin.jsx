import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../hooks/useCustomerAuth";
import { ApiError } from "../api/client";
import { isValidPhone } from "../utils/phone";
import { isValidEmail } from "../utils/email";

function CustomerLogin() {
  const { login, register } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login"); // "login" | "register"

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/randevu-al";

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (mode === "register" && !isValidPhone(phone)) {
      setError("Geçerli bir cep telefonu numarası giriniz (05xx xxx xx xx).");
      return;
    }
    if (mode === "register" && email.trim() && !isValidEmail(email)) {
      setError("Geçerli bir e-posta adresi giriniz.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await login(phone.trim(), password);
      } else {
        await register(name.trim(), phone.trim(), password, email.trim());
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "İşlem gerçekleştirilemedi, tekrar deneyin."
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

        <h1>{mode === "login" ? "Müşteri Girişi" : "Hesap Oluştur"}</h1>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Giriş yapın, bilgilerinizi tekrar yazmadan gün ve saat seçip randevunuzu alın."
            : "Bir kereliğine hesap oluşturun, sonraki randevularınızda bilgilerinizi tekrar yazmayın."}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            Giriş yap
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              setError(null);
            }}
          >
            Kayıt ol
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <label>
              Ad Soyad
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            Telefon
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xx xxx xx xx"
              autoFocus={mode === "login"}
              autoComplete="tel"
              required
            />
          </label>

          {mode === "register" && (
            <label>
              E-posta <span className="auth-optional">(opsiyonel — randevu hatırlatması için)</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@eposta.com"
                autoComplete="email"
              />
            </label>
          )}

          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "register" ? 6 : undefined}
              required
            />
          </label>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading
              ? "İşleniyor…"
              : mode === "login"
              ? "Giriş yap"
              : "Hesap oluştur"}
          </button>
        </form>

        <Link to="/randevu-al" className="auth-back">
          ← Hesapsız randevu almak istiyorum
        </Link>
      </div>
    </div>
  );
}

export default CustomerLogin;
