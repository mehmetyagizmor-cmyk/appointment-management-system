import { useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import { useToast } from "../../hooks/useToast";
import { useSettings } from "../../hooks/useSettings";
import { DAY_LABELS, DAY_ORDER } from "../../constants/weekdays";

const FALLBACK_HOURS = Object.fromEntries(
  DAY_ORDER.map((d) => [d, { open: "09:00", close: "18:00", closed: false }])
);

function emptyForm(defaultHours, allServiceIds) {
  return {
    name: "",
    useCustomHours: false,
    workingHours: structuredClone(defaultHours),
    serviceIds: allServiceIds,
  };
}

function formatDateLabelTR(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function Resources() {
  const showToast = useToast();
  const { settings } = useSettings();
  const [resources, setResources] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [timeOffList, setTimeOffList] = useState([]);
  const [timeOffForm, setTimeOffForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [timeOffSaving, setTimeOffSaving] = useState(false);

  const label = settings?.resourceLabelPlural || "Kaynaklar";
  const singularLabel = settings?.resourceLabel || "Kaynak";
  const defaultHours = settings?.workingHours || FALLBACK_HOURS;

  async function load() {
    setLoading(true);
    try {
      const [resData, servData] = await Promise.all([
        api.get("/api/resources"),
        api.get("/api/services"),
      ]);
      setResources(resData);
      setServices(servData.filter((s) => s.active));
    } catch {
      setError("Kaynaklar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function loadTimeOff(resourceId) {
    try {
      const data = await api.get(`/api/resources/${resourceId}/time-off`);
      setTimeOffList(data);
    } catch {
      setTimeOffList([]);
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm(defaultHours, services.map((s) => s.id)));
    setTimeOffList([]);
    setTimeOffForm({ startDate: "", endDate: "", reason: "" });
    setModalOpen(true);
  }

  function openEdit(resource) {
    setEditingId(resource.id);
    setForm({
      name: resource.name,
      useCustomHours: !!resource.workingHours,
      workingHours: structuredClone(resource.workingHours || defaultHours),
      serviceIds: resource.serviceIds,
    });
    setTimeOffForm({ startDate: "", endDate: "", reason: "" });
    setModalOpen(true);
    loadTimeOff(resource.id);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(null);
  }

  function updateDay(day, field, value) {
    setForm({
      ...form,
      workingHours: {
        ...form.workingHours,
        [day]: { ...form.workingHours[day], [field]: value },
      },
    });
  }

  function toggleService(serviceId) {
    const next = form.serviceIds.includes(serviceId)
      ? form.serviceIds.filter((id) => id !== serviceId)
      : [...form.serviceIds, serviceId];
    setForm({ ...form, serviceIds: next });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        workingHours: form.useCustomHours ? form.workingHours : null,
        serviceIds: form.serviceIds,
      };
      if (editingId) {
        await api.put(`/api/resources/${editingId}`, payload);
        showToast(`${singularLabel} güncellendi.`);
      } else {
        await api.post("/api/resources", payload);
        showToast(`${singularLabel} eklendi.`);
      }
      closeModal();
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Bir hata oluştu.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(resource) {
    try {
      await api.put(`/api/resources/${resource.id}`, { active: !resource.active });
      load();
    } catch {
      showToast("Durum güncellenemedi.", "error");
    }
  }

  async function handleDelete(resource) {
    if (!window.confirm(`"${resource.name}" silinsin mi?`)) return;
    try {
      const res = await api.delete(`/api/resources/${resource.id}`);
      showToast(res.message, res.archived ? "info" : "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Silinemedi.", "error");
    }
  }

  async function handleAddTimeOff(e) {
    e.preventDefault();
    if (!timeOffForm.startDate || !timeOffForm.endDate) return;
    setTimeOffSaving(true);
    try {
      await api.post(`/api/resources/${editingId}/time-off`, timeOffForm);
      setTimeOffForm({ startDate: "", endDate: "", reason: "" });
      loadTimeOff(editingId);
      showToast("İzin günü eklendi.");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "İzin eklenemedi.", "error");
    } finally {
      setTimeOffSaving(false);
    }
  }

  async function handleDeleteTimeOff(timeOffId) {
    try {
      await api.delete(`/api/resources/${editingId}/time-off/${timeOffId}`);
      loadTimeOff(editingId);
    } catch {
      showToast("İzin silinemedi.", "error");
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>{label}</h1>
          <p>
            İşletmenizdeki koltuk, personel, oda ya da ekipmanları; çalışma
            saatlerini, izin günlerini ve verebildikleri hizmetleri yönetin.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + {singularLabel} Ekle
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
          </div>
        ) : resources.length === 0 ? (
          <p className="empty-state">Henüz {label.toLowerCase()} eklenmedi.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Program</th>
                <th>Hizmetler</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.workingHours ? "Özel saatler" : "Genel saatler"}</td>
                  <td>
                    {r.serviceIds.length === services.length
                      ? "Tüm hizmetler"
                      : `${r.serviceIds.length} hizmet`}
                  </td>
                  <td>
                    <button
                      className={`status-pill ${r.active ? "active" : ""}`}
                      onClick={() => toggleActive(r)}
                    >
                      {r.active ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="data-table-actions">
                    <button className="btn btn-ghost" onClick={() => openEdit(r)}>
                      Düzenle
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(r)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && form && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? `${singularLabel} Düzenle` : `${singularLabel} Ekle`}</h2>

            <form onSubmit={handleSubmit} className="appointment-form">
              <label>
                Ad
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={`Örn: 1. ${singularLabel}`}
                  autoFocus
                />
              </label>

              <div className="modal-section">
                <h3>Çalışma Saatleri</h3>
                <label className="hours-closed">
                  <input
                    type="checkbox"
                    checked={form.useCustomHours}
                    onChange={(e) => setForm({ ...form, useCustomHours: e.target.checked })}
                  />
                  Bu {singularLabel.toLowerCase()} işletme geneli saatlerden farklı çalışsın
                </label>

                {form.useCustomHours && (
                  <div className="hours-grid">
                    {DAY_ORDER.map((day) => {
                      const d = form.workingHours[day] || {
                        open: "09:00",
                        close: "18:00",
                        closed: true,
                      };
                      return (
                        <div className="hours-row" key={day}>
                          <span className="hours-day">{DAY_LABELS[day]}</span>
                          <label className="hours-closed">
                            <input
                              type="checkbox"
                              checked={!d.closed}
                              onChange={(e) => updateDay(day, "closed", !e.target.checked)}
                            />
                            Açık
                          </label>
                          <input
                            type="time"
                            value={d.open}
                            disabled={d.closed}
                            onChange={(e) => updateDay(day, "open", e.target.value)}
                          />
                          <span>–</span>
                          <input
                            type="time"
                            value={d.close}
                            disabled={d.closed}
                            onChange={(e) => updateDay(day, "close", e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="modal-section">
                <h3>Hizmetler</h3>
                <p className="modal-section-hint">
                  Hiçbiri işaretlenmezse (ya da hepsi işaretlenirse) tüm hizmetleri
                  verebilir sayılır.
                </p>
                {services.length === 0 ? (
                  <p className="empty-state">Henüz tanımlı hizmet yok.</p>
                ) : (
                  <div className="checkbox-list">
                    {services.map((s) => (
                      <label key={s.id} className="checkbox-list-item">
                        <input
                          type="checkbox"
                          checked={form.serviceIds.includes(s.id)}
                          onChange={() => toggleService(s.id)}
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {editingId && (
                <div className="modal-section">
                  <h3>İzin Günleri</h3>
                  {timeOffList.length > 0 && (
                    <ul className="time-off-list">
                      {timeOffList.map((t) => (
                        <li key={t.id}>
                          <span>
                            {formatDateLabelTR(t.startDate)}
                            {t.startDate !== t.endDate ? ` – ${formatDateLabelTR(t.endDate)}` : ""}
                            {t.reason ? ` · ${t.reason}` : ""}
                          </span>
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => handleDeleteTimeOff(t.id)}
                          >
                            Kaldır
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="time-off-form">
                    <input
                      type="date"
                      value={timeOffForm.startDate}
                      onChange={(e) =>
                        setTimeOffForm({ ...timeOffForm, startDate: e.target.value })
                      }
                    />
                    <input
                      type="date"
                      value={timeOffForm.endDate}
                      onChange={(e) =>
                        setTimeOffForm({ ...timeOffForm, endDate: e.target.value })
                      }
                    />
                    <input
                      type="text"
                      placeholder="Neden (opsiyonel)"
                      value={timeOffForm.reason}
                      onChange={(e) =>
                        setTimeOffForm({ ...timeOffForm, reason: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleAddTimeOff}
                      disabled={timeOffSaving}
                    >
                      + İzin Ekle
                    </button>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <div className="modal-actions-right">
                  <button type="button" className="btn btn-ghost" onClick={closeModal}>
                    Vazgeç
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Kaydediliyor…" : "Kaydet"}
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

export default Resources;
