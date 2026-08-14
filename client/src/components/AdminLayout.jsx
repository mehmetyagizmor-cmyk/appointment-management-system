import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSettings } from "../hooks/useSettings";

const NAV_ITEMS = [
  { to: "/panel", label: "Genel Bakış", end: true, icon: "◎" },
  { to: "/panel/randevular", label: "Randevular", icon: "🗓" },
  { to: "/panel/hizmetler", label: "Hizmetler", icon: "✂" },
  { to: "/panel/kaynaklar", label: "Kaynaklar", icon: "▤" },
  { to: "/panel/ayarlar", label: "Ayarlar", icon: "⚙" },
];

function AdminLayout() {
  const { username, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/giris", { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">R</span>
          <div>
            <strong>{settings?.businessName || "İşletmem"}</strong>
            <span>Randevu Yönetimi</span>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? "active" : ""}`
              }
            >
              <span className="admin-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <NavLink to="/randevu-al" target="_blank" className="admin-nav-link ghost">
            <span className="admin-nav-icon" aria-hidden="true">↗</span>
            Müşteri sayfasını gör
          </NavLink>
          <div className="admin-user">
            <span>{username}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Çıkış yap
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
