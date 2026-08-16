import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { useCustomerAuth } from "../hooks/useCustomerAuth";
import { isValidPhone } from "../utils/phone";
import { isValidEmail } from "../utils/email";
import { buildWhatsAppLink } from "../utils/whatsapp";
import { formatDateLabel } from "../utils/date";
import PublicWeeklySchedule from "../components/PublicWeeklySchedule";

function Booking() {
  const { customer, isAuthenticated: isCustomer, checking: checkingCustomer, logout } =
    useCustomerAuth();
  const location = useLocation();
  const rebook = location.state?.rebook || null;
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [serviceId, setServiceId] = useState(null);
  const [resourceId, setResourceId] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);

  const [form, setForm] = useState({ name: "", phone: "", email: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [confirmed, setConfirmed] = useState(null);

  const [activeAppointment, setActiveAppointment] = useState(null);
  const [checkingActive, setCheckingActive] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.get("/api/public/business", { auth: false });
        setBusiness(data);

        // "Tekrar randevu al" ile gelindiyse önceki hizmet/personeli ön doldur
        // (hâlâ aktiflerse); yoksa listedeki ilklere düş.
        const rebookService =
          rebook?.serviceId && data.services?.some((s) => s.id === rebook.serviceId)
            ? rebook.serviceId
            : null;
        const chosenService = rebookService ?? data.services?.[0]?.id ?? null;
        if (chosenService) setServiceId(chosenService);

        const eligibleResources = chosenService
          ? data.resources?.filter((r) => r.serviceIds.includes(chosenService))
          : data.resources;
        const rebookResource =
          rebook?.resourceId && eligibleResources?.some((r) => r.id === rebook.resourceId)
            ? rebook.resourceId
            : null;
        const chosenResource = rebookResource ?? eligibleResources?.[0]?.id ?? null;
        if (chosenResource) setResourceId(chosenResource);
      } catch {
        setLoadError(
          "İşletme bilgileri yüklenemedi. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
    // Sadece ilk yüklemede çalışsın; rebook bilgisi navigasyon anında sabitlenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Kaynak değişince önceden seçilmiş tarih/saat artık geçersiz olabilir.
    setDate(null);
    setTime(null);
  }, [resourceId]);

  const eligibleResources =
    business?.resources.filter((r) => !serviceId || r.serviceIds.includes(serviceId)) || [];

  useEffect(() => {
    // Hizmet değişince, seçili kaynak artık bu hizmeti veremiyorsa uygun bir
    // kaynağa geç (varsa ilkine, yoksa seçim boşalır).
    if (!business || !serviceId) return;
    const stillEligible = eligibleResources.some((r) => r.id === resourceId);
    if (!stillEligible) {
      setResourceId(eligibleResources[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, business]);

  const loadActiveAppointment = useCallback(async () => {
    setCheckingActive(true);
    try {
      const list = await api.get("/api/customer/appointments", { auth: "customer" });
      const now = new Date();
      const todayISO = now.toISOString().slice(0, 10);
      const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;
      const active = list.find(
        (a) =>
          a.status !== "cancelled" &&
          (a.date > todayISO || (a.date === todayISO && a.time >= nowTime))
      );
      setActiveAppointment(active || null);
    } catch {
      setActiveAppointment(null);
    } finally {
      setCheckingActive(false);
    }
  }, []);

  useEffect(() => {
    if (checkingCustomer) return;
    if (!isCustomer) {
      setActiveAppointment(null);
      setCheckingActive(false);
      return;
    }
    loadActiveAppointment();
  }, [isCustomer, checkingCustomer, loadActiveAppointment]);

  function handleSlotSelect(selectedDate, selectedTime) {
    setDate(selectedDate);
    setTime(selectedTime);
  }

  async function handleCancelActive() {
    if (!activeAppointment) return;
    setCancelling(true);
    try {
      await api.delete(`/api/customer/appointments/${activeAppointment.id}`, {
        auth: "customer",
      });
      setActiveAppointment(null);
    } catch (err) {
      setFormErrors([err.message]);
    } finally {
      setCancelling(false);
    }
  }

  const selectedService = business?.services.find((s) => s.id === serviceId);
  const selectedResource = business?.resources.find((r) => r.id === resourceId);

  function validate() {
    const errors = [];
    if (!isCustomer) {
      if (!form.name.trim()) errors.push("İsminizi giriniz.");
      if (!isValidPhone(form.phone)) {
        errors.push("Geçerli bir cep telefonu numarası giriniz (05xx xxx xx xx).");
      }
      if (form.email.trim() && !isValidEmail(form.email)) {
        errors.push("Geçerli bir e-posta adresi giriniz.");
      }
    }
    if (!resourceId) errors.push(`${business?.resourceLabel || "Kaynak"} seçiniz.`);
    if (!date || !time) errors.push("Tarih ve saat seçiniz.");
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
      if (isCustomer) {
        await api.post(
          "/api/customer/appointments",
          {
            note: form.note.trim(),
            serviceId,
            resourceId,
            date,
            time,
          },
          { auth: "customer" }
        );
      } else {
        await api.post(
          "/api/public/appointments",
          {
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            note: form.note.trim(),
            serviceId,
            resourceId,
            date,
            time,
          },
          { auth: false }
        );
      }
      setConfirmed({ date, time, service: selectedService, resource: selectedResource });
    } catch (err) {
      setFormErrors(err.errors || [err.message]);
      if (isCustomer && err.status === 409) {
        // Başka bir sekmeden/az önce zaten randevu alınmış olabilir; paneli güncelle.
        loadActiveAppointment();
      }
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

  if (isCustomer && checkingActive) {
    return (
      <div className="loading-state full-screen">
        <div className="spinner" />
        <p>Yükleniyor…</p>
      </div>
    );
  }

  if (isCustomer && activeAppointment) {
    return (
      <div className="booking-page">
        <div className="booking-confirm panel">
          <div className="confirm-icon">📅</div>
          <h1>Zaten bir randevunuz var</h1>
          <p>
            <strong>{formatDateLabel(activeAppointment.date)}</strong> tarihinde
            saat <strong>{activeAppointment.time}</strong> için
            {activeAppointment.serviceName ? <> {activeAppointment.serviceName},</> : null}{" "}
            {activeAppointment.resourceName || ""} randevunuz bulunuyor.
          </p>
          <p className="confirm-note">
            Yeni bir randevu alabilmek için önce bu randevuyu iptal etmeniz gerekiyor.
          </p>

          {formErrors.length > 0 && (
            <ul className="form-errors">
              {formErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}

          <div className="hero-actions center">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCancelActive}
              disabled={cancelling}
            >
              {cancelling ? "İptal ediliyor…" : "Randevuyu iptal et"}
            </button>
            <Link to="/" className="btn btn-ghost">
              Ana sayfaya dön
            </Link>
          </div>
        </div>
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
          <div className="hero-actions center">
            <Link to="/" className="btn btn-primary">
              Ana sayfaya dön
            </Link>
            {business.phone && (
              <a
                className="btn btn-whatsapp"
                href={buildWhatsAppLink(
                  business.phone,
                  `Merhaba, ${formatDateLabel(confirmed.date)} saat ${confirmed.time} için aldığım randevu hakkında bir sorum var.`
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp'tan yazın
              </a>
            )}
          </div>
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

        {!checkingCustomer && (
          <div className="booking-account-strip">
            {isCustomer ? (
              <>
                <span>
                  Merhaba, <strong>{customer.name}</strong>. Bilgilerinizi tekrar
                  yazmanıza gerek yok.
                </span>
                <Link to="/randevularim" className="link-btn">
                  Randevularım
                </Link>
                <button type="button" className="link-btn" onClick={logout}>
                  Çıkış yap
                </button>
              </>
            ) : (
              <span>
                Hesabınız var mı?{" "}
                <Link to="/musteri-giris">Giriş yapın</Link>, bilgilerinizi
                tekrar yazmadan randevu alın.
              </span>
            )}
          </div>
        )}
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
            {eligibleResources.length === 0 && (
              <p className="empty-state">
                {serviceId
                  ? "Bu hizmeti verebilecek uygun bir kaynak yok."
                  : "Henüz tanımlı kaynak yok."}
              </p>
            )}
            {eligibleResources.map((r) => (
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
          {resourceId ? (
            <PublicWeeklySchedule
              resourceId={resourceId}
              workingHours={
                eligibleResources.find((r) => r.id === resourceId)?.workingHours ||
                business.workingHours
              }
              slotMinutes={business.slotMinutes}
              value={{ date, time }}
              onSelect={handleSlotSelect}
            />
          ) : (
            <p className="empty-state">
              Saat seçebilmek için önce {(business.resourceLabel || "kaynak").toLowerCase()}{" "}
              seçin.
            </p>
          )}
        </div>

        <div className="panel booking-panel">
          <h2>4. Bilgileriniz</h2>
          {isCustomer ? (
            <div className="booking-customer-card">
              <p>
                <strong>{customer.name}</strong>
              </p>
              <p className="booking-customer-phone">{customer.phone}</p>
            </div>
          ) : (
            <>
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
                E-posta <span className="auth-optional">(opsiyonel — hatırlatma için)</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ornek@eposta.com"
                />
              </label>
            </>
          )}
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
              {date && time
                ? `${formatDateLabel(date)} · ${time}`
                : "Tarih ve saat seçilmedi"}
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
