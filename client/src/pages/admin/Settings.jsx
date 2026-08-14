import { useEffect, useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { api, ApiError } from "../../api/client";
import { useToast } from "../../hooks/useToast";

const DAY_LABELS = {
  mon: "Pazartesi",
  tue: "Salı",
  wed: "Çarşamba",
  thu: "Perşembe",
  fri: "Cuma",
  sat: "Cumartesi",
  sun: "Pazar",
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function Settings() {
  const { settings, loading, setSettings } = useSettings();
  const showToast = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(structuredClone(settings));
  }, [settings]);

  if (loading || !form) {
    return (
      <div className="admin-page">
        <div className="loading-state">
          <div className="spinner" />
        </div>
      </div>
    );
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

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put("/api/settings", form);
      setSettings(updated);
      showToast("Ayarlar kaydedildi.");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordSaving(true);
    try {
      await api.post("/api/auth/change-password", passwordForm);
      showToast("Şifreniz güncellendi.");
      setPasswordForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Şifre güncellenemedi.", "error");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Ayarlar</h1>
          <p>İşletme bilgilerinizi ve çalışma saatlerinizi düzenleyin.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="panel">
          <h2>İşletme Bilgileri</h2>
          <div className="form-row">
            <label>
              İşletme Adı
              <input
                type="text"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              />
            </label>
            <label>
              Telefon
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
          </div>
          <label>
            Adres
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>
          <div className="form-row">
            <label>
              Kaynak Etiketi (tekil)
              <input
                type="text"
                value={form.resourceLabel}
                onChange={(e) => setForm({ ...form, resourceLabel: e.target.value })}
                placeholder="Koltuk, Uzman, Oda…"
              />
            </label>
            <label>
              Kaynak Etiketi (çoğul)
              <input
                type="text"
                value={form.resourceLabelPlural}
                onChange={(e) =>
                  setForm({ ...form, resourceLabelPlural: e.target.value })
                }
                placeholder="Koltuklar, Uzmanlar, Odalar…"
              />
            </label>
          </div>
          <label className="settings-slot-label">
            Randevu Aralığı (dakika)
            <select
              value={form.slotMinutes}
              onChange={(e) => setForm({ ...form, slotMinutes: Number(e.target.value) })}
            >
              {[15, 20, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} dakika
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="panel">
          <h2>Çalışma Saatleri</h2>
          <div className="hours-grid">
            {DAY_ORDER.map((day) => {
              const d = form.workingHours[day] || { open: "09:00", close: "18:00", closed: true };
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
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Kaydediliyor…" : "Ayarları Kaydet"}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="settings-form">
        <div className="panel">
          <h2>Şifre Değiştir</h2>
          <div className="form-row">
            <label>
              Mevcut Şifre
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
              />
            </label>
            <label>
              Yeni Şifre
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
              />
            </label>
          </div>
          <button type="submit" className="btn btn-ghost" disabled={passwordSaving}>
            {passwordSaving ? "Güncelleniyor…" : "Şifreyi Güncelle"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Settings;
