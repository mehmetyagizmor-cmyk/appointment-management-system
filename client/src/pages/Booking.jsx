import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { useCustomerAuth } from "../hooks/useCustomerAuth";
import { isValidPhone } from "../utils/phone";
import { isValidEmail } from "../utils/email";
import { buildWhatsAppLink } from "../utils/whatsapp";
import { formatDateLabel } from "../utils/date";
import PublicWeeklySchedule from "../components/PublicWeeklySchedule";

const TEXT = {
  tr: {
    loading: "Yükleniyor…",
    loadError:
      "İşletme bilgileri yüklenemedi. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.",
    resourceLabelFallback: "Kaynak",
    validation: {
      name: "İsminizi giriniz.",
      phone: "Geçerli bir cep telefonu numarası giriniz (05xx xxx xx xx).",
      email: "Geçerli bir e-posta adresi giriniz.",
      resource: (label) => `${label} seçiniz.`,
      slot: "Tarih ve saat seçiniz.",
    },
    hasActive: {
      title: "Zaten bir randevunuz var",
      body: (date, time, serviceName, resourceName) => (
        <>
          <strong>{date}</strong> tarihinde saat <strong>{time}</strong> için
          {serviceName ? <> {serviceName},</> : null} {resourceName || ""}{" "}
          randevunuz bulunuyor.
        </>
      ),
      note: "Yeni bir randevu alabilmek için önce bu randevuyu iptal etmeniz gerekiyor.",
      cancelling: "İptal ediliyor…",
      cancel: "Randevuyu iptal et",
      backHome: "Ana sayfaya dön",
    },
    confirmed: {
      title: "Randevunuz oluşturuldu!",
      body: (date, time, serviceName, resourceName) => (
        <>
          <strong>{date}</strong> tarihinde saat <strong>{time}</strong> için{" "}
          {serviceName ? <>{serviceName} hizmeti,</> : null} {resourceName} için
          randevunuz alındı.
        </>
      ),
      note: (businessName, phone) => (
        <>
          {businessName} sizi bekliyor. Bir sorunuz olursa {phone || "işletmeyi"}{" "}
          üzerinden ulaşabilirsiniz.
        </>
      ),
      backHome: "Ana sayfaya dön",
      whatsapp: "WhatsApp'tan yazın",
      whatsappMessage: (date, time) =>
        `Merhaba, ${date} saat ${time} için aldığım randevu hakkında bir sorum var.`,
    },
    header: {
      subtitle: "Aşağıdan hizmet, uzman ve saat seçerek randevunuzu hemen oluşturun.",
      greeting: (name) => (
        <>
          Merhaba, <strong>{name}</strong>. Bilgilerinizi tekrar yazmanıza gerek
          yok.
        </>
      ),
      myAppointments: "Randevularım",
      logout: "Çıkış yap",
      haveAccount: "Hesabınız var mı?",
      login: "Giriş yapın",
      loginSuffix: ", bilgilerinizi tekrar yazmadan randevu alın.",
    },
    steps: {
      service: "1. Hizmet seçin",
      noServices: "Henüz tanımlı hizmet yok.",
      resource: (label) => `2. ${label} seçin`,
      noEligibleResources: "Bu hizmeti verebilecek uygun bir kaynak yok.",
      noResources: "Henüz tanımlı kaynak yok.",
      slot: "3. Tarih ve saat seçin",
      slotNeedsResource: (label) =>
        `Saat seçebilmek için önce ${label.toLowerCase()} seçin.`,
    },
    details: {
      title: "4. Bilgileriniz",
      name: "Ad Soyad",
      namePlaceholder: "Adınız Soyadınız",
      phone: "Telefon",
      phonePlaceholder: "05xx xxx xx xx",
      email: "E-posta",
      emailOptional: "(opsiyonel — hatırlatma için)",
      emailPlaceholder: "ornek@eposta.com",
      note: "Not (opsiyonel)",
      notePlaceholder: "Eklemek istediğiniz bir şey var mı?",
    },
    summary: {
      title: "Randevu Özeti",
      noService: "Hizmet seçilmedi",
      noSlot: "Tarih ve saat seçilmedi",
    },
    submit: {
      submitting: "Gönderiliyor…",
      idle: "Randevuyu Onayla",
    },
    durationUnit: "dk",
  },

  en: {
    loading: "Loading…",
    loadError:
      "Could not load business info. Please refresh the page or try again later.",
    resourceLabelFallback: "Resource",
    validation: {
      name: "Please enter your name.",
      phone: "Please enter a valid Turkish mobile number (05xx xxx xx xx).",
      email: "Please enter a valid email address.",
      resource: (label) => `Please choose a ${label.toLowerCase()}.`,
      slot: "Please choose a date and time.",
    },
    hasActive: {
      title: "You already have an appointment",
      body: (date, time, serviceName, resourceName) => (
        <>
          You have an appointment on <strong>{date}</strong> at{" "}
          <strong>{time}</strong>
          {serviceName ? <> for {serviceName}</> : null}
          {resourceName ? <>, {resourceName}</> : null}.
        </>
      ),
      note: "To book a new appointment, please cancel this one first.",
      cancelling: "Cancelling…",
      cancel: "Cancel appointment",
      backHome: "Back to home",
    },
    confirmed: {
      title: "Your appointment is confirmed!",
      body: (date, time, serviceName, resourceName) => (
        <>
          Your appointment
          {serviceName ? <> for {serviceName}</> : null}
          {resourceName ? <> with {resourceName}</> : null} on{" "}
          <strong>{date}</strong> at <strong>{time}</strong> is confirmed.
        </>
      ),
      note: (businessName, phone) => (
        <>
          {businessName} is expecting you. If you have any questions, you can
          reach them {phone ? <>at {phone}</> : "directly"}.
        </>
      ),
      backHome: "Back to home",
      whatsapp: "Message on WhatsApp",
      whatsappMessage: (date, time) =>
        `Hi, I have a question about my appointment on ${date} at ${time}.`,
    },
    header: {
      subtitle: "Choose a service, specialist and time below to book instantly.",
      greeting: (name) => (
        <>
          Hi, <strong>{name}</strong>. No need to re-enter your details.
        </>
      ),
      myAppointments: "My appointments",
      logout: "Log out",
      haveAccount: "Already have an account?",
      login: "Log in",
      loginSuffix: " to book without re-entering your details.",
    },
    steps: {
      service: "1. Choose a service",
      noServices: "No services defined yet.",
      resource: (label) => `2. Choose ${label.toLowerCase()}`,
      noEligibleResources: "No resource available offers this service.",
      noResources: "No resources defined yet.",
      slot: "3. Choose date & time",
      slotNeedsResource: (label) =>
        `Choose a ${label.toLowerCase()} first to see available times.`,
    },
    details: {
      title: "4. Your details",
      name: "Full name",
      namePlaceholder: "Your full name",
      phone: "Phone",
      phonePlaceholder: "05xx xxx xx xx",
      email: "Email",
      emailOptional: "(optional — for reminders)",
      emailPlaceholder: "you@example.com",
      note: "Note (optional)",
      notePlaceholder: "Anything you'd like to add?",
    },
    summary: {
      title: "Booking summary",
      noService: "No service selected",
      noSlot: "No date/time selected",
    },
    submit: {
      submitting: "Submitting…",
      idle: "Confirm booking",
    },
    durationUnit: "min",
  },
};

function Booking({ lang = "tr" }) {
  const t = TEXT[lang] || TEXT.tr;
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
        setLoadError(t.loadError);
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
  const resourceLabel = business?.resourceLabel || t.resourceLabelFallback;

  function validate() {
    const errors = [];
    if (!isCustomer) {
      if (!form.name.trim()) errors.push(t.validation.name);
      if (!isValidPhone(form.phone)) {
        errors.push(t.validation.phone);
      }
      if (form.email.trim() && !isValidEmail(form.email)) {
        errors.push(t.validation.email);
      }
    }
    if (!resourceId) errors.push(t.validation.resource(resourceLabel));
    if (!date || !time) errors.push(t.validation.slot);
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
        <p>{t.loading}</p>
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
        <p>{t.loading}</p>
      </div>
    );
  }

  if (isCustomer && activeAppointment) {
    return (
      <div className="booking-page">
        <div className="booking-confirm panel">
          <div className="confirm-icon">📅</div>
          <h1>{t.hasActive.title}</h1>
          <p>
            {t.hasActive.body(
              formatDateLabel(activeAppointment.date, lang),
              activeAppointment.time,
              activeAppointment.serviceName,
              activeAppointment.resourceName
            )}
          </p>
          <p className="confirm-note">{t.hasActive.note}</p>

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
              {cancelling ? t.hasActive.cancelling : t.hasActive.cancel}
            </button>
            <Link to="/" className="btn btn-ghost">
              {t.hasActive.backHome}
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
          <h1>{t.confirmed.title}</h1>
          <p>
            {t.confirmed.body(
              formatDateLabel(confirmed.date, lang),
              confirmed.time,
              confirmed.service?.name,
              confirmed.resource?.name
            )}
          </p>
          <p className="confirm-note">
            {t.confirmed.note(business.businessName, business.phone)}
          </p>
          <div className="hero-actions center">
            <Link to="/" className="btn btn-primary">
              {t.confirmed.backHome}
            </Link>
            {business.phone && (
              <a
                className="btn btn-whatsapp"
                href={buildWhatsAppLink(
                  business.phone,
                  t.confirmed.whatsappMessage(
                    formatDateLabel(confirmed.date, lang),
                    confirmed.time
                  )
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.confirmed.whatsapp}
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
        <p>{t.header.subtitle}</p>

        {!checkingCustomer && (
          <div className="booking-account-strip">
            {isCustomer ? (
              <>
                <span>{t.header.greeting(customer.name)}</span>
                <Link to="/randevularim" className="link-btn">
                  {t.header.myAppointments}
                </Link>
                <button type="button" className="link-btn" onClick={logout}>
                  {t.header.logout}
                </button>
              </>
            ) : (
              <span>
                {t.header.haveAccount}{" "}
                <Link to="/musteri-giris">{t.header.login}</Link>
                {t.header.loginSuffix}
              </span>
            )}
          </div>
        )}
      </header>

      <form className="booking-grid" onSubmit={handleSubmit}>
        <div className="panel booking-panel">
          <h2>{t.steps.service}</h2>
          <div className="pill-grid">
            {business.services.length === 0 && (
              <p className="empty-state">{t.steps.noServices}</p>
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
                  {s.durationMinutes} {t.durationUnit} · {s.price}₺
                </span>
              </button>
            ))}
          </div>

          <h2>{t.steps.resource(resourceLabel)}</h2>
          <div className="pill-grid">
            {eligibleResources.length === 0 && (
              <p className="empty-state">
                {serviceId ? t.steps.noEligibleResources : t.steps.noResources}
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

          <h2>{t.steps.slot}</h2>
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
              lang={lang}
            />
          ) : (
            <p className="empty-state">{t.steps.slotNeedsResource(resourceLabel)}</p>
          )}
        </div>

        <div className="panel booking-panel">
          <h2>{t.details.title}</h2>
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
                {t.details.name}
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t.details.namePlaceholder}
                />
              </label>
              <label>
                {t.details.phone}
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder={t.details.phonePlaceholder}
                />
              </label>
              <label>
                {t.details.email}{" "}
                <span className="auth-optional">{t.details.emailOptional}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t.details.emailPlaceholder}
                />
              </label>
            </>
          )}
          <label>
            {t.details.note}
            <textarea
              rows={3}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder={t.details.notePlaceholder}
            />
          </label>

          <div className="booking-summary">
            <h3>{t.summary.title}</h3>
            <p>{selectedService ? selectedService.name : t.summary.noService}</p>
            <p>{selectedResource ? selectedResource.name : "—"}</p>
            <p>
              {date && time
                ? `${formatDateLabel(date, lang)} · ${time}`
                : t.summary.noSlot}
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
            {submitting ? t.submit.submitting : t.submit.idle}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Booking;
