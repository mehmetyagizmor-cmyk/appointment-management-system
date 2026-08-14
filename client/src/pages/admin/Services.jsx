import { useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import { useToast } from "../../hooks/useToast";

const EMPTY = { name: "", durationMinutes: 30, price: 0 };

function Services() {
  const showToast = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get("/api/services");
      setServices(data);
    } catch {
      setError("Hizmetler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      durationMinutes: Number(form.durationMinutes),
      price: Number(form.price),
    };
    try {
      if (editingId) {
        await api.put(`/api/services/${editingId}`, payload);
        showToast("Hizmet güncellendi.");
      } else {
        await api.post("/api/services", payload);
        showToast("Hizmet eklendi.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Bir hata oluştu.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(service) {
    try {
      await api.put(`/api/services/${service.id}`, { active: !service.active });
      load();
    } catch {
      showToast("Durum güncellenemedi.", "error");
    }
  }

  async function handleDelete(service) {
    if (!window.confirm(`"${service.name}" silinsin mi?`)) return;
    try {
      const res = await api.delete(`/api/services/${service.id}`);
      showToast(res.message, res.archived ? "info" : "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Silinemedi.", "error");
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Hizmetler</h1>
          <p>Sunduğunuz hizmetleri süre ve fiyatlarıyla tanımlayın.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + Hizmet Ekle
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
          </div>
        ) : services.length === 0 ? (
          <p className="empty-state">Henüz hizmet eklenmedi.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Hizmet</th>
                <th>Süre</th>
                <th>Fiyat</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.durationMinutes} dk</td>
                  <td>{s.price}₺</td>
                  <td>
                    <button
                      className={`status-pill ${s.active ? "active" : ""}`}
                      onClick={() => toggleActive(s)}
                    >
                      {s.active ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="data-table-actions">
                    <button className="btn btn-ghost" onClick={() => openEdit(s)}>
                      Düzenle
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(s)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Hizmeti Düzenle" : "Hizmet Ekle"}</h2>
            <form onSubmit={handleSubmit} className="appointment-form">
              <label>
                Hizmet Adı
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Örn: Saç Kesimi"
                  autoFocus
                />
              </label>
              <div className="form-row">
                <label>
                  Süre (dakika)
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={form.durationMinutes}
                    onChange={(e) =>
                      setForm({ ...form, durationMinutes: e.target.value })
                    }
                  />
                </label>
                <label>
                  Fiyat (₺)
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </label>
              </div>
              <div className="modal-actions">
                <div className="modal-actions-right">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setModalOpen(false)}
                  >
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

export default Services;
