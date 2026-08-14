import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useSettings } from "../../hooks/useSettings";

function formatCurrency(n) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function Dashboard() {
  const { settings } = useSettings();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.get("/api/stats");
        setStats(data);
      } catch {
        setError("İstatistikler yüklenemedi.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Genel Bakış</h1>
          <p>{settings?.businessName || "İşletmeniz"} için özet bilgiler.</p>
        </div>
        <Link to="/panel/randevular" className="btn btn-primary">
          + Yeni Randevu
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Yükleniyor…</p>
        </div>
      ) : (
        stats && (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-label">Bugünkü Randevular</span>
                <span className="stat-value">{stats.todayCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Önümüzdeki 7 Gün</span>
                <span className="stat-value">{stats.weekCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Toplam Müşteri</span>
                <span className="stat-value">{stats.totalCustomers}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Bu Ay Tahmini Ciro</span>
                <span className="stat-value">{formatCurrency(stats.monthRevenue)}</span>
              </div>
            </div>

            <div className="dashboard-columns">
              <div className="panel">
                <h2>Yaklaşan Randevular</h2>
                {stats.upcoming.length === 0 ? (
                  <p className="empty-state">Yaklaşan randevu yok.</p>
                ) : (
                  <div className="appointment-list">
                    {stats.upcoming.map((a) => (
                      <article className="appointment-card" key={a.id}>
                        <div className="chair-tag">{a.resourceName}</div>
                        <div className="appointment-card-body">
                          <h3>{a.name}</h3>
                          <p className="appointment-meta">
                            {a.date} · {a.time}
                            {a.serviceName ? ` · ${a.serviceName}` : ""}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel">
                <h2>En Çok Tercih Edilen Hizmetler</h2>
                {stats.byService.length === 0 ? (
                  <p className="empty-state">Henüz veri yok.</p>
                ) : (
                  <div className="bar-list">
                    {stats.byService.map((s) => {
                      const max = stats.byService[0].count || 1;
                      const pct = Math.max(8, Math.round((s.count / max) * 100));
                      return (
                        <div className="bar-row" key={s.name}>
                          <span className="bar-label">{s.name}</span>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="bar-count">{s.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}

export default Dashboard;
