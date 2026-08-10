import { useEffect, useMemo, useState } from "react";
import WeeklySchedule from "./components/WeeklySchedule";
import "./App.css";

const API_URL = "http://localhost:5000/appointments";

const EMPTY_FORM = { name: "", date: "", time: "", chair: 1 };

function App() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null); // { message, type }

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  async function loadAppointments() {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Sunucudan yanıt alınamadı.");
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error(error);
      setLoadError(
        "Randevular yüklenemedi. Sunucunun (localhost:5000) çalıştığından emin olun."
      );
    } finally {
      setLoading(false);
    }
  }

  function openAddModal(prefill = {}) {
    setEditingId(null);
    setFormErrors([]);
    setForm({ ...EMPTY_FORM, ...prefill });
    setModalOpen(true);
  }

  function openEditModal(appointment) {
    setEditingId(appointment.id);
    setFormErrors([]);
    setForm({
      name: appointment.name,
      date: appointment.date,
      time: appointment.time,
      chair: appointment.chair,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors([]);
  }

  function handleSlotClick(date, hour, chair) {
    openAddModal({ date, time: hour, chair });
  }

  function validateForm() {
    const errors = [];
    if (!form.name.trim()) errors.push("İsim boş olamaz.");
    if (!form.date) errors.push("Tarih seçiniz.");
    if (!form.time) errors.push("Saat seçiniz.");
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
      date: form.date,
      time: form.time,
      chair: Number(form.chair),
    };

    try {
      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setFormErrors(data.errors || [data.message] || ["Bir hata oluştu."]);
        return;
      }

      await loadAppointments();
      showToast(
        editingId ? "Randevu güncellendi." : "Randevu eklendi.",
        "success"
      );
      closeModal();
    } catch (error) {
      console.error(error);
      setFormErrors(["Sunucuya ulaşılamadı."]);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Bu randevuyu silmek istediğinize emin misiniz?")) {
      return;
    }
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Silme işlemi başarısız.");
      await loadAppointments();
      showToast("Randevu silindi.", "info");
      if (editingId === id) closeModal();
    } catch (error) {
      console.error(error);
      showToast("Randevu silinemedi.", "error");
    }
  }

  const filteredAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();
    const sorted = [...appointments].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
    if (!term) return sorted;
    return sorted.filter((a) => a.name.toLowerCase().includes(term));
  }, [appointments, search]);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-inner">
          <span className="eyebrow">Randevu Defteri</span>
          <h1>Berber &amp; Kuaför Randevu Sistemi</h1>
          <p className="subtitle">
            Koltukları takip edin, boş saatlere tek tıkla randevu ekleyin.
          </p>
        </div>
      </header>

      <main className="page-body">
        <section className="panel schedule-panel">
          {loadError && (
            <div className="alert alert-error">
              {loadError}
              <button className="btn btn-ghost" onClick={loadAppointments}>
                Tekrar dene
              </button>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Randevular yükleniyor…</p>
            </div>
          ) : (
            <WeeklySchedule
              appointments={appointments}
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
            placeholder="İsme göre ara…"
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
                <div className={`chair-tag chair-${appointment.chair}`}>
                  {appointment.chair}. Koltuk
                </div>
                <div className="appointment-card-body">
                  <h3>{appointment.name}</h3>
                  <p className="appointment-meta">
                    {appointment.date} · {appointment.time}
                  </p>
                </div>
                <div className="appointment-card-actions">
                  <button
                    className="btn btn-ghost"
                    onClick={() => openEditModal(appointment)}
                  >
                    Düzenle
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(appointment.id)}
                  >
                    Sil
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

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

              <label>
                Koltuk
                <select
                  value={form.chair}
                  onChange={(e) =>
                    setForm({ ...form, chair: Number(e.target.value) })
                  }
                >
                  <option value={1}>1. Koltuk</option>
                  <option value={2}>2. Koltuk</option>
                </select>
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

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default App;
