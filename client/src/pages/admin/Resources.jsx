import { useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import { useToast } from "../../hooks/useToast";
import { useSettings } from "../../hooks/useSettings";

const EMPTY = { name: "" };

function Resources() {
  const showToast = useToast();
  const { settings } = useSettings();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const label = settings?.resourceLabelPlural || "Kaynaklar";
  const singularLabel = settings?.resourceLabel || "Kaynak";

  async function load() {
    setLoading(true);
    try {
      const data = await api.get("/api/resources");
      setResources(data);
    } catch {
      setError("Kaynaklar yüklenemedi.");
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

  function openEdit(resource) {
    setEditingId(resource.id);
    setForm({ name: resource.name });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/resources/${editingId}`, { name: form.name.trim() });
        showToast(`${singularLabel} güncellendi.`);
      } else {
        await api.post("/api/resources", { name: form.name.trim() });
        showToast(`${singularLabel} eklendi.`);
      }
      setModalOpen(false);
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

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>{label}</h1>
          <p>İşletmenizdeki koltuk, personel, oda ya da ekipmanları yönetin.</p>
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
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
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

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? `${singularLabel} Düzenle` : `${singularLabel} Ekle`}</h2>
            <form onSubmit={handleSubmit} className="appointment-form">
              <label>
                Ad
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ name: e.target.value })}
                  placeholder={`Örn: 1. ${singularLabel}`}
                  autoFocus
                />
              </label>
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

export default Resources;
