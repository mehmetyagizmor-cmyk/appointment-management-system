import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function Booking() {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [serviceId, setServiceId] = useState(null);
  const [resourceId, setResourceId] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [time, setTime] = useState(null);

  const [form, setForm] = useState({ name: "", phone: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.get("/api/public/business", { auth: false });
        setBusiness(data);
        if (data.resources?.length) setResourceId(data.resources[0].id);
        if (data.services?.length) setServiceId(data.services[0].id);
      } catch {
        setLoadError(
          "İşletme bilgileri yüklenemedi. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!resourceId || !date) return;
    let cancelled = false;
    async function loadSlots() {
      setSlotsLoading(true);
      setTime(null);
      try {
        const data = await api.get(
          `/api/public/slots?date=${date}&resourceId=${resourceId}`,
          { auth: false }
        );
        if (!cancelled) setSlots(data.slots || []);
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }
    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [resourceId, date]);

  const nextDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(todayISO(), i)),
    []
  );

  const selectedService = business?.services.find((s) => s.id === serviceId);
  const selectedResource = business?.resources.find((r) => r.id === resourceId);

  function validate() {
    const errors = [];
    if (!form.name.trim()) errors.push("İsminizi giriniz.");
    if (!form.phone.trim()) errors.push("Telefon numaranızı giriniz.");
    if (!resourceId) errors.push(`${business?.resourceLabel || "Kaynak"} seçiniz.`);
    if (!time) errors.push("Saat seçiniz.");
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (errors.length) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    setSubmitting(true);
    try {
      await api.post(
        "/api/public/appointments",
        {
          name: form.name.trim(),
          phone: form.phone.trim(),
          note: form.note.trim(),
          serviceId,
          resourceId,
          date,
          time,
        },
        { auth: false }
      );
      setConfirmed({ date, time, service: selectedService, resource: selectedResource });
    } catch (err) {
      setFormErrors(err.errors || [err.message]);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-state full-screen">
        <div className="spinner" />
        <p>Yükleniyor…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="booking-page">
        <div className="alert alert-error">{loadError}</div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="booking-page">
        <div className="booking-confirm panel">
          <div className="confirm-icon">✓</div>
          <h1>Randevunuz oluşturuldu!</h1>
          <p>
            <strong>{formatDateLabel(confirmed.date)}</strong> tarihinde saat{" "}
            <strong>{confirmed.time}</strong> için{" "}
            {confirmed.service ? <>{confirmed.service.name} hizmeti,</> : null}{" "}
            {confirmed.resource ? confirmed.resource.name : ""} için randevunuz
            alındı.
          </p>
          <p className="confirm-note">
            {business.businessName} sizi bekliyor. Bir sorunuz olursa{" "}
            {business.phone || "işletmeyi"} üzerinden ulaşabilirsiniz.
          </p>
          <Link to="/" className="btn btn-primary">
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <header className="booking-header">
        <Link to="/" className="landing-logo">
          <span className="admin-brand-mark">R</span>
          {business.businessName}
        </Link>
        <p>Aşağıdan hizmet, uzman ve saat seçerek randevunuzu hemen oluşturun.</p>
      </header>

      <form className="booking-grid" onSubmit={handleSubmit}>
        <div className="panel booking-panel">
          <h2>1. Hizmet seçin</h2>
          <div className="pill-grid">
            {business.services.length === 0 && (
              <p className="empty-state">Henüz tanımlı hizmet yok.</p>
            )}
            {business.services.map((s) => (
              <button
                type="button"
                key={s.id}
                className={`pill-option ${serviceId === s.id ? "active" : ""}`}
                onClick={() => setServiceId(s.id)}
              >
                <span>{s.name}</span>
                <span className="pill-meta">
                  {s.durationMinutes} dk · {s.price}₺
                </span>
              </button>
            ))}
          </div>

          <h2>
            2. {business.resourceLabel || "Kaynak"} seçin
          </h2>
          <div className="pill-grid">
            {business.resources.length === 0 && (
              <p className="empty-state">Henüz tanımlı kaynak yok.</p>
            )}
            {business.resources.map((r) => (
              <button
                type="button"
                key={r.id}
                className={`pill-option ${resourceId === r.id ? "active" : ""}`}
                onClick={() => setResourceId(r.id)}
              >
                {r.name}
              </button>
            ))}
          </div>

          <h2>3. Tarih ve saat seçin</h2>
          <div className="day-strip">
            {nextDays.map((d) => (
              <button
                type="button"
                key={d}
                className={`day-pill ${date === d ? "active" : ""}`}
                onClick={() => setDate(d)}
              >
                {formatDateLabel(d)}
              </button>
            ))}
          </div>

          {slotsLoading ? (
            <p className="empty-state">Saatler yükleniyor…</p>
          ) : slots.length === 0 ? (
            <p className="empty-state">Bu tarihte müsait saat yok, başka bir gün deneyin.</p>
          ) : (
            <div className="slot-grid">
              {slots.map((t) => (
                <button
                  type="button"
                  key={t}
                  className={`slot-pill ${time === t ? "active" : ""}`}
                  onClick={() => setTime(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="panel booking-panel">
          <h2>4. Bilgileriniz</h2>
          <label>
            Ad Soyad
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Adınız Soyadınız"
            />
          </label>
          <label>
            Telefon
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="05xx xxx xx xx"
            />
          </label>
          <label>
            Not (opsiyonel)
            <textarea
              rows={3}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Eklemek istediğiniz bir şey var mı?"
            />
          </label>

          <div className="booking-summary">
            <h3>Randevu Özeti</h3>
            <p>{selectedService ? selectedService.name : "Hizmet seçilmedi"}</p>
            <p>{selectedResource ? selectedResource.name : "—"}</p>
            <p>
              {formatDateLabel(date)}
              {time ? ` · ${time}` : ""}
            </p>
          </div>

          {formErrors.length > 0 && (
            <ul className="form-errors">
              {formErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Gönderiliyor…" : "Randevuyu Onayla"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Booking;
