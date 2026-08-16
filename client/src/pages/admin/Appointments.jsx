import { useEffect, useMemo, useState } from "react";
import WeeklySchedule from "../../components/WeeklySchedule";
import { api, ApiError } from "../../api/client";
import { useToast } from "../../hooks/useToast";
import { useSettings } from "../../hooks/useSettings";
import { buildWhatsAppLink } from "../../utils/whatsapp";

function formatDateLabelTR(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

const EMPTY_FORM = { name: "", phone: "", note: "", date: "", time: "", resourceId: null, serviceId: null };

function Appointments() {
  const showToast = useToast();
  const { settings } = useSettings();

  const [appointments, setAppointments] = useState([]);
  const [resources, setResources] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function loadAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const [appts, res, serv] = await Promise.all([
        api.get("/api/appointments"),
        api.get("/api/resources"),
        api.get("/api/services"),
      ]);
      setAppointments(appts);
      setResources(res.filter((r) => r.active));
      setServices(serv.filter((s) => s.active));
    } catch (error) {
      console.error(error);
      setLoadError("Randevular yüklenemedi. Sunucunun çalıştığından emin olun.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openAddModal(prefill = {}) {
    setEditingId(null);
    setFormErrors([]);
    setForm({
      ...EMPTY_FORM,
      resourceId: resources[0]?.id ?? null,
      serviceId: services[0]?.id ?? null,
      ...prefill,
    });
    setModalOpen(true);
  }

  function openEditModal(appointment) {
    setEditingId(appointment.id);
    setFormErrors([]);
    setForm({
      name: appointment.name,
      phone: appointment.phone || "",
      note: appointment.note || "",
      date: appointment.date,
      time: appointment.time,
      resourceId: appointment.resourceId,
      serviceId: appointment.serviceId,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors([]);
  }

  function handleSlotClick(date, hour, resourceId) {
    openAddModal({ date, time: hour, resourceId });
  }

  function validateForm() {
    const errors = [];
    if (!form.name.trim()) errors.push("İsim boş olamaz.");
    if (!form.date) errors.push("Tarih seçiniz.");
    if (!form.time) errors.push("Saat seçiniz.");
    if (!form.resourceId) errors.push(`${settings?.resourceLabel || "Kaynak"} seçiniz.`);
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setFormErrors([]);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      note: form.note.trim(),
      date: form.date,
      time: form.time,
      resourceId: form.resourceId,
      serviceId: form.serviceId,
    };

    try {
      if (editingId) {
        await api.put(`/api/appointments/${editingId}`, payload);
        showToast("Randevu güncellendi.");
      } else {
        await api.post("/api/appointments", payload);
        showToast("Randevu eklendi.");
      }
      await loadAll();
      closeModal();
    } catch (error) {
      if (error instanceof ApiError) {
        setFormErrors(error.errors || [error.message]);
      } else {
        setFormErrors(["Sunucuya ulaşılamadı."]);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Bu randevuyu silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/api/appointments/${id}`);
      await loadAll();
      showToast("Randevu silindi.", "info");
      if (editingId === id) closeModal();
    } catch (error) {
      console.error(error);
      showToast("Randevu silinemedi.", "error");
    }
  }

  const resourceNameById = useMemo(() => {
    const map = new Map();
    resources.forEach((r) => map.set(r.id, r.name));
    return map;
  }, [resources]);

  const serviceNameById = useMemo(() => {
    const map = new Map();
    services.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [services]);

  const filteredAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();
    const sorted = [...appointments].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
    if (!term) return sorted;
    return sorted.filter(
      (a) =>
        a.name.toLowerCase().includes(term) || (a.phone || "").toLowerCase().includes(term)
    );
  }, [appointments, search]);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Randevular</h1>
          <p>Haftalık programı görüntüleyin, boş saatlere tıklayarak randevu ekleyin.</p>
        </div>
      </div>

      {loadError && (
        <div className="alert alert-error">
          {loadError}
          <button className="btn btn-ghost" onClick={loadAll}>
            Tekrar dene
          </button>
        </div>
      )}

      <div className="appointments-layout">
        <section className="panel schedule-panel">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Randevular yükleniyor…</p>
            </div>
          ) : (
            <WeeklySchedule
              appointments={appointments}
              resources={resources}
              workingHours={settings?.workingHours}
              slotMinutes={settings?.slotMinutes}
              onSlotClick={handleSlotClick}
              onAppointmentClick={openEditModal}
            />
          )}
        </section>

        <section className="panel list-panel">
          <div className="list-panel-header">
            <h2>Randevu Listesi</h2>
            <button className="btn btn-primary" onClick={() => openAddModal()}>
              + Yeni Randevu
            </button>
          </div>

          <input
            type="text"
            className="search-input"
            placeholder="İsim veya telefona göre ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="appointment-list">
            {filteredAppointments.length === 0 && !loading && (
              <p className="empty-state">
                {search
                  ? "Aramanızla eşleşen randevu yok."
                  : "Henüz randevu eklenmedi. Takvimden bir saate tıklayın."}
              </p>
            )}

            {filteredAppointments.map((appointment) => (
              <article className="appointment-card" key={appointment.id}>
                <div className="chair-tag">
                  {resourceNameById.get(appointment.resourceId) || "—"}
                </div>
                <div className="appointment-card-body">
                  <h3>{appointment.name}</h3>
                  <p className="appointment-meta">
                    {appointment.date} · {appointment.time}
                    {appointment.serviceId
                      ? ` · ${serviceNameById.get(appointment.serviceId) || ""}`
                      : ""}
                  </p>
                  {appointment.phone && (
                    <p className="appointment-meta">{appointment.phone}</p>
                  )}
                </div>
                <div className="appointment-card-actions">
                  {appointment.phone && (
                    <a
                      className="btn btn-ghost btn-whatsapp"
                      href={buildWhatsAppLink(
                        appointment.phone,
                        `Merhaba ${appointment.name}, ${formatDateLabelTR(appointment.date)} tarihinde saat ${appointment.time} için randevunuz hatırlatılır. - ${settings?.businessName || ""}`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp'tan yaz"
                    >
                      WhatsApp
                    </a>
                  )}
                  <button className="btn btn-ghost" onClick={() => openEditModal(appointment)}>
                    Düzenle
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(appointment.id)}>
                    Sil
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Randevuyu Düzenle" : "Yeni Randevu"}</h2>

            <form onSubmit={handleSubmit} className="appointment-form">
              <label>
                İsim
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Müşteri adı"
                  autoFocus
                />
              </label>

              <label>
                Telefon
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="05xx xxx xx xx"
                />
              </label>

              <div className="form-row">
                <label>
                  Tarih
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>

                <label>
                  Saat
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  {settings?.resourceLabel || "Kaynak"}
                  <select
                    value={form.resourceId ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, resourceId: Number(e.target.value) || null })
                    }
                  >
                    <option value="">Seçilmedi</option>
                    {resources
                      .filter((r) => !form.serviceId || r.serviceIds.includes(form.serviceId))
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Hizmet
                  <select
                    value={form.serviceId ?? ""}
                    onChange={(e) => {
                      const newServiceId = Number(e.target.value) || null;
                      const currentResource = resources.find((r) => r.id === form.resourceId);
                      const stillEligible =
                        !newServiceId || currentResource?.serviceIds.includes(newServiceId);
                      setForm({
                        ...form,
                        serviceId: newServiceId,
                        resourceId: stillEligible ? form.resourceId : null,
                      });
                    }}
                  >
                    <option value="">Seçilmedi</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Not
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Opsiyonel not"
                />
              </label>

              {formErrors.length > 0 && (
                <ul className="form-errors">
                  {formErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}

              <div className="modal-actions">
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDelete(editingId)}
                  >
                    Sil
                  </button>
                )}
                <div className="modal-actions-right">
                  <button type="button" className="btn btn-ghost" onClick={closeModal}>
                    Vazgeç
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Kaydediliyor…" : editingId ? "Güncelle" : "Ekle"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;
