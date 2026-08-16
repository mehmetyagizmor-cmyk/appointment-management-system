import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useCustomerAuth } from "../hooks/useCustomerAuth";
import { formatDateLabelLong } from "../utils/date";

function isUpcoming(appointment) {
  if (appointment.status === "cancelled") return false;
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
  return appointment.date > todayISO || (appointment.date === todayISO && appointment.time >= nowTime);
}

function AppointmentCard({ appointment, onCancel, onRebook, cancelling }) {
  const upcoming = isUpcoming(appointment);
  return (
    <article className="panel my-appointment-card">
      <div className="my-appointment-info">
        <p className="my-appointment-date">
          {formatDateLabelLong(appointment.date)} · {appointment.time}
        </p>
        <p className="my-appointment-meta">
          {appointment.serviceName || "Hizmet belirtilmedi"}
          {appointment.resourceName ? ` · ${appointment.resourceName}` : ""}
        </p>
        {appointment.note && <p className="my-appointment-note">"{appointment.note}"</p>}
        <span className={`status-pill ${appointment.status === "cancelled" ? "" : "active"}`}>
          {appointment.status === "cancelled" ? "İptal edildi" : upcoming ? "Yaklaşan" : "Tamamlandı"}
        </span>
      </div>
      <div className="my-appointment-actions">
        {upcoming && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => onCancel(appointment.id)}
            disabled={cancelling === appointment.id}
          >
            {cancelling === appointment.id ? "İptal ediliyor…" : "İptal Et"}
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={() => onRebook(appointment)}>
          Tekrar randevu al
        </button>
      </div>
    </article>
  );
}

function MyAppointments() {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get("/api/customer/appointments", { auth: "customer" });
      setAppointments(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Randevularınız yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel(id) {
    if (!window.confirm("Bu randevuyu iptal etmek istediğinize emin misiniz?")) return;
    setCancelling(id);
    try {
      await api.delete(`/api/customer/appointments/${id}`, { auth: "customer" });
      await load();
    } catch {
      setLoadError("Randevu iptal edilemedi. Lütfen tekrar deneyin.");
    } finally {
      setCancelling(null);
    }
  }

  function handleRebook(appointment) {
    navigate("/randevu-al", {
      state: {
        rebook: { serviceId: appointment.serviceId, resourceId: appointment.resourceId },
      },
    });
  }

  const upcoming = appointments.filter(isUpcoming);
  const history = appointments.filter((a) => !isUpcoming(a));

  return (
    <div className="booking-page">
      <header className="booking-header">
        <Link to="/" className="landing-logo">
          <span className="admin-brand-mark">R</span>
          Randevu Yönetim Sistemi
        </Link>
        <p>
          Merhaba {customer?.name}, geçmiş ve yaklaşan randevularınızı buradan
          yönetebilirsiniz.
        </p>
        <div className="booking-account-strip">
          <Link to="/randevu-al" className="link-btn">
            + Yeni randevu al
          </Link>
        </div>
      </header>

      <div className="my-appointments-page">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Yükleniyor…</p>
          </div>
        ) : (
          <>
            {loadError && <div className="alert alert-error">{loadError}</div>}

            <section>
              <h2>Yaklaşan Randevular</h2>
              {upcoming.length === 0 ? (
                <p className="empty-state">Yaklaşan bir randevunuz yok.</p>
              ) : (
                <div className="my-appointments-list">
                  {upcoming.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appointment={a}
                      onCancel={handleCancel}
                      onRebook={handleRebook}
                      cancelling={cancelling}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2>Geçmiş Randevular</h2>
              {history.length === 0 ? (
                <p className="empty-state">Henüz geçmiş bir randevunuz yok.</p>
              ) : (
                <div className="my-appointments-list">
                  {history.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appointment={a}
                      onCancel={handleCancel}
                      onRebook={handleRebook}
                      cancelling={cancelling}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default MyAppointments;
