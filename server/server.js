require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const { db, DEFAULT_WORKING_HOURS } = require("./db");
const { signToken, requireAuth } = require("./auth");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basit istek günlüğü
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString("tr-TR")}  ${req.method} ${req.url}`);
  next();
});

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// ---------- Yardımcı fonksiyonlar ----------

function getSettings() {
  const row = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  if (!row) return null;
  let workingHours;
  try {
    workingHours = JSON.parse(row.working_hours);
  } catch {
    workingHours = DEFAULT_WORKING_HOURS;
  }
  return {
    businessName: row.business_name,
    resourceLabel: row.resource_label,
    resourceLabelPlural: row.resource_label_plural,
    phone: row.phone,
    address: row.address,
    slotMinutes: row.slot_minutes,
    workingHours,
  };
}

function weekdayKeyForDate(dateISO) {
  const d = new Date(`${dateISO}T00:00:00`);
  return WEEKDAY_KEYS[d.getDay()];
}

function generateSlotsForDay(dateISO, settings) {
  const key = weekdayKeyForDate(dateISO);
  const day = settings.workingHours[key];
  if (!day || day.closed || !day.open || !day.close) return [];

  const [openH, openM] = day.open.split(":").map(Number);
  const [closeH, closeM] = day.close.split(":").map(Number);
  const step = settings.slotMinutes || 60;

  const slots = [];
  let minutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  while (minutes + step <= closeMinutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, "0");
    const m = String(minutes % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
    minutes += step;
  }
  return slots;
}

function rowToAppointment(row) {
  return {
    id: row.id,
    name: row.customer_name,
    phone: row.phone,
    note: row.note,
    serviceId: row.service_id,
    resourceId: row.resource_id,
    date: row.date,
    time: row.time,
    status: row.status,
    createdAt: row.created_at,
  };
}

function sortedAppointments(rows) {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
}

function validateAppointmentPayload(body) {
  const errors = [];
  const { name, date, time, resourceId } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    errors.push("İsim boş olamaz.");
  }
  if (!date || !DATE_PATTERN.test(date) || isNaN(new Date(date).getTime())) {
    errors.push("Geçerli bir tarih giriniz.");
  }
  if (!time || !TIME_PATTERN.test(time)) {
    errors.push("Saat HH:MM formatında olmalı.");
  }

  const resourceIdNum = Number(resourceId);
  if (!resourceIdNum) {
    errors.push("Kaynak/personel seçiniz.");
  } else {
    const resource = db
      .prepare("SELECT id FROM resources WHERE id = ? AND active = 1")
      .get(resourceIdNum);
    if (!resource) errors.push("Seçilen kaynak bulunamadı veya pasif.");
  }

  return errors;
}

function findConflict({ date, time, resourceId }, excludeId = null) {
  return db
    .prepare(
      `SELECT * FROM appointments
       WHERE date = ? AND time = ? AND resource_id = ? AND status != 'cancelled'
       ${excludeId ? "AND id != ?" : ""}`
    )
    .get(...(excludeId ? [date, time, resourceId, excludeId] : [date, time, resourceId]));
}

// ---------- Genel ----------

app.get("/", (req, res) => {
  res.send("Server is running!");
});

// ---------- Auth ----------

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: "Kullanıcı adı ve şifre gerekli." });
  }

  const user = db
    .prepare("SELECT * FROM admin_users WHERE username = ?")
    .get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Kullanıcı adı veya şifre hatalı." });
  }

  const token = signToken(user);
  res.json({ token, username: user.username });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});

app.post("/api/auth/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({
      message: "Mevcut şifre ve en az 6 karakterli yeni şifre gerekli.",
    });
  }

  const user = db
    .prepare("SELECT * FROM admin_users WHERE id = ?")
    .get(req.user.sub);

  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ message: "Mevcut şifre hatalı." });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?").run(
    hash,
    user.id
  );
  res.json({ message: "Şifre güncellendi." });
});

// ---------- Ayarlar (admin) ----------

app.get("/api/settings", requireAuth, (req, res) => {
  res.json(getSettings());
});

app.put("/api/settings", requireAuth, (req, res) => {
  const current = getSettings();
  if (!current) return res.status(404).json({ message: "Ayar bulunamadı." });

  const {
    businessName,
    resourceLabel,
    resourceLabelPlural,
    phone,
    address,
    slotMinutes,
    workingHours,
  } = req.body || {};

  const next = {
    businessName: businessName?.trim() || current.businessName,
    resourceLabel: resourceLabel?.trim() || current.resourceLabel,
    resourceLabelPlural: resourceLabelPlural?.trim() || current.resourceLabelPlural,
    phone: phone ?? current.phone,
    address: address ?? current.address,
    slotMinutes: Number(slotMinutes) > 0 ? Number(slotMinutes) : current.slotMinutes,
    workingHours: workingHours || current.workingHours,
  };

  db.prepare(
    `UPDATE settings SET business_name = ?, resource_label = ?, resource_label_plural = ?,
     phone = ?, address = ?, slot_minutes = ?, working_hours = ? WHERE id = 1`
  ).run(
    next.businessName,
    next.resourceLabel,
    next.resourceLabelPlural,
    next.phone,
    next.address,
    next.slotMinutes,
    JSON.stringify(next.workingHours)
  );

  res.json(getSettings());
});

// ---------- Kaynaklar (koltuk / personel / oda...) ----------

app.get("/api/resources", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM resources ORDER BY sort_order, id").all();
  res.json(rows.map((r) => ({ id: r.id, name: r.name, active: !!r.active })));
});

app.post("/api/resources", requireAuth, (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ message: "İsim gerekli." });

  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM resources")
    .get().m;
  const result = db
    .prepare("INSERT INTO resources (name, active, sort_order) VALUES (?, 1, ?)")
    .run(name, maxOrder + 1);

  res.status(201).json({ id: Number(result.lastInsertRowid), name, active: true });
});

app.put("/api/resources/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM resources WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ message: "Kaynak bulunamadı." });

  const name = req.body?.name?.trim() || existing.name;
  const active = req.body?.active === undefined ? existing.active : req.body.active ? 1 : 0;

  db.prepare("UPDATE resources SET name = ?, active = ? WHERE id = ?").run(
    name,
    active,
    id
  );
  res.json({ id, name, active: !!active });
});

app.delete("/api/resources/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM resources WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ message: "Kaynak bulunamadı." });

  const futureCount = db
    .prepare(
      "SELECT COUNT(*) AS c FROM appointments WHERE resource_id = ? AND status != 'cancelled'"
    )
    .get(id).c;

  if (futureCount > 0) {
    db.prepare("UPDATE resources SET active = 0 WHERE id = ?").run(id);
    return res.json({
      message: "Bu kaynağa ait randevular olduğu için silinmedi, pasif hale getirildi.",
      archived: true,
    });
  }

  db.prepare("DELETE FROM resources WHERE id = ?").run(id);
  res.json({ message: "Kaynak silindi.", archived: false });
});

// ---------- Hizmetler ----------

app.get("/api/services", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM services ORDER BY id").all();
  res.json(
    rows.map((s) => ({
      id: s.id,
      name: s.name,
      durationMinutes: s.duration_minutes,
      price: s.price,
      active: !!s.active,
    }))
  );
});

app.post("/api/services", requireAuth, (req, res) => {
  const { name, durationMinutes, price } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Hizmet adı gerekli." });
  }
  const duration = Number(durationMinutes) > 0 ? Number(durationMinutes) : 30;
  const priceNum = Number(price) >= 0 ? Number(price) : 0;

  const result = db
    .prepare(
      "INSERT INTO services (name, duration_minutes, price, active) VALUES (?, ?, ?, 1)"
    )
    .run(name.trim(), duration, priceNum);

  res.status(201).json({
    id: Number(result.lastInsertRowid),
    name: name.trim(),
    durationMinutes: duration,
    price: priceNum,
    active: true,
  });
});

app.put("/api/services/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM services WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ message: "Hizmet bulunamadı." });

  const name = req.body?.name?.trim() || existing.name;
  const duration =
    Number(req.body?.durationMinutes) > 0
      ? Number(req.body.durationMinutes)
      : existing.duration_minutes;
  const price =
    req.body?.price !== undefined && Number(req.body.price) >= 0
      ? Number(req.body.price)
      : existing.price;
  const active =
    req.body?.active === undefined ? existing.active : req.body.active ? 1 : 0;

  db.prepare(
    "UPDATE services SET name = ?, duration_minutes = ?, price = ?, active = ? WHERE id = ?"
  ).run(name, duration, price, active, id);

  res.json({ id, name, durationMinutes: duration, price, active: !!active });
});

app.delete("/api/services/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM services WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ message: "Hizmet bulunamadı." });

  const inUse = db
    .prepare("SELECT COUNT(*) AS c FROM appointments WHERE service_id = ?")
    .get(id).c;

  if (inUse > 0) {
    db.prepare("UPDATE services SET active = 0 WHERE id = ?").run(id);
    return res.json({
      message: "Bu hizmete ait randevular olduğu için silinmedi, pasif hale getirildi.",
      archived: true,
    });
  }

  db.prepare("DELETE FROM services WHERE id = ?").run(id);
  res.json({ message: "Hizmet silindi.", archived: false });
});

// ---------- Randevular (admin) ----------

app.get("/api/appointments", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM appointments").all();
  res.json(sortedAppointments(rows.map(rowToAppointment)));
});

app.post("/api/appointments", requireAuth, (req, res) => {
  const errors = validateAppointmentPayload(req.body);
  if (errors.length) {
    return res.status(400).json({ message: "Doğrulama hatası", errors });
  }

  const payload = {
    customer_name: req.body.name.trim(),
    phone: (req.body.phone || "").trim(),
    note: (req.body.note || "").trim(),
    service_id: req.body.serviceId ? Number(req.body.serviceId) : null,
    resource_id: Number(req.body.resourceId),
    date: req.body.date,
    time: req.body.time,
  };

  const conflict = findConflict({
    date: payload.date,
    time: payload.time,
    resourceId: payload.resource_id,
  });
  if (conflict) {
    return res.status(409).json({
      message: `Bu kaynak ${payload.date} tarihinde saat ${payload.time} için zaten dolu.`,
    });
  }

  const result = db
    .prepare(
      `INSERT INTO appointments (customer_name, phone, note, service_id, resource_id, date, time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`
    )
    .run(
      payload.customer_name,
      payload.phone,
      payload.note,
      payload.service_id,
      payload.resource_id,
      payload.date,
      payload.time
    );

  const row = db
    .prepare("SELECT * FROM appointments WHERE id = ?")
    .get(Number(result.lastInsertRowid));
  res.status(201).json(rowToAppointment(row));
});

app.put("/api/appointments/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ message: "Randevu bulunamadı." });

  const errors = validateAppointmentPayload(req.body);
  if (errors.length) {
    return res.status(400).json({ message: "Doğrulama hatası", errors });
  }

  const payload = {
    customer_name: req.body.name.trim(),
    phone: (req.body.phone ?? existing.phone) || "",
    note: (req.body.note ?? existing.note) || "",
    service_id: req.body.serviceId ? Number(req.body.serviceId) : existing.service_id,
    resource_id: Number(req.body.resourceId),
    date: req.body.date,
    time: req.body.time,
    status: req.body.status || existing.status,
  };

  const conflict = findConflict(
    { date: payload.date, time: payload.time, resourceId: payload.resource_id },
    id
  );
  if (conflict) {
    return res.status(409).json({
      message: `Bu kaynak ${payload.date} tarihinde saat ${payload.time} için zaten dolu.`,
    });
  }

  db.prepare(
    `UPDATE appointments SET customer_name = ?, phone = ?, note = ?, service_id = ?,
     resource_id = ?, date = ?, time = ?, status = ? WHERE id = ?`
  ).run(
    payload.customer_name,
    payload.phone,
    payload.note,
    payload.service_id,
    payload.resource_id,
    payload.date,
    payload.time,
    payload.status,
    id
  );

  const row = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  res.json({ message: "Randevu güncellendi.", appointment: rowToAppointment(row) });
});

app.delete("/api/appointments/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ message: "Randevu bulunamadı." });

  db.prepare("DELETE FROM appointments WHERE id = ?").run(id);

  const rows = db.prepare("SELECT * FROM appointments").all();
  res.status(200).json({
    message: "Randevu silindi.",
    appointments: sortedAppointments(rows.map(rowToAppointment)),
  });
});

// ---------- İstatistikler (admin dashboard) ----------

app.get("/api/stats", requireAuth, (req, res) => {
  const todayISO = new Date().toISOString().slice(0, 10);
  const weekAheadISO = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const todayCount = db
    .prepare(
      "SELECT COUNT(*) AS c FROM appointments WHERE date = ? AND status != 'cancelled'"
    )
    .get(todayISO).c;

  const weekCount = db
    .prepare(
      "SELECT COUNT(*) AS c FROM appointments WHERE date >= ? AND date <= ? AND status != 'cancelled'"
    )
    .get(todayISO, weekAheadISO).c;

  const totalCustomers = db
    .prepare("SELECT COUNT(DISTINCT customer_name) AS c FROM appointments")
    .get().c;

  const monthPrefix = todayISO.slice(0, 7);
  const monthRevenue = db
    .prepare(
      `SELECT COALESCE(SUM(s.price), 0) AS total
       FROM appointments a JOIN services s ON s.id = a.service_id
       WHERE a.date LIKE ? AND a.status != 'cancelled'`
    )
    .get(`${monthPrefix}%`).total;

  const byService = db
    .prepare(
      `SELECT s.name AS name, COUNT(*) AS count
       FROM appointments a JOIN services s ON s.id = a.service_id
       WHERE a.status != 'cancelled'
       GROUP BY s.id ORDER BY count DESC LIMIT 5`
    )
    .all();

  const upcoming = db
    .prepare(
      `SELECT a.*, s.name AS service_name, r.name AS resource_name
       FROM appointments a
       LEFT JOIN services s ON s.id = a.service_id
       LEFT JOIN resources r ON r.id = a.resource_id
       WHERE a.date >= ? AND a.status != 'cancelled'
       ORDER BY a.date, a.time LIMIT 5`
    )
    .all(todayISO)
    .map((row) => ({
      ...rowToAppointment(row),
      serviceName: row.service_name,
      resourceName: row.resource_name,
    }));

  res.json({
    todayCount,
    weekCount,
    totalCustomers,
    monthRevenue,
    byService,
    upcoming,
  });
});

// ---------- Herkese açık (müşteri self-servis randevu) ----------

app.get("/api/public/business", (req, res) => {
  const settings = getSettings();
  const resources = db
    .prepare("SELECT id, name FROM resources WHERE active = 1 ORDER BY sort_order, id")
    .all();
  const services = db
    .prepare(
      "SELECT id, name, duration_minutes AS durationMinutes, price FROM services WHERE active = 1 ORDER BY id"
    )
    .all();

  res.json({ ...settings, resources, services });
});

app.get("/api/public/slots", (req, res) => {
  const { date, resourceId } = req.query;
  if (!date || !DATE_PATTERN.test(date)) {
    return res.status(400).json({ message: "Geçerli bir tarih (YYYY-MM-DD) gerekli." });
  }
  const resIdNum = Number(resourceId);
  if (!resIdNum) {
    return res.status(400).json({ message: "resourceId gerekli." });
  }

  const settings = getSettings();
  const allSlots = generateSlotsForDay(date, settings);

  const taken = new Set(
    db
      .prepare(
        "SELECT time FROM appointments WHERE date = ? AND resource_id = ? AND status != 'cancelled'"
      )
      .all(date, resIdNum)
      .map((r) => r.time)
  );

  const now = new Date();
  const isToday = date === now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots = allSlots
    .filter((t) => !taken.has(t))
    .filter((t) => {
      if (!isToday) return true;
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m > nowMinutes;
    });

  res.json({ slots });
});

app.post("/api/public/appointments", (req, res) => {
  const errors = validateAppointmentPayload(req.body);
  if (errors.length) {
    return res.status(400).json({ message: "Doğrulama hatası", errors });
  }
  if (!req.body.phone || !String(req.body.phone).trim()) {
    errors.push("Telefon numarası gerekli.");
  }
  if (errors.length) {
    return res.status(400).json({ message: "Doğrulama hatası", errors });
  }

  const payload = {
    customer_name: req.body.name.trim(),
    phone: String(req.body.phone).trim(),
    note: (req.body.note || "").trim(),
    service_id: req.body.serviceId ? Number(req.body.serviceId) : null,
    resource_id: Number(req.body.resourceId),
    date: req.body.date,
    time: req.body.time,
  };

  const conflict = findConflict({
    date: payload.date,
    time: payload.time,
    resourceId: payload.resource_id,
  });
  if (conflict) {
    return res.status(409).json({
      message: "Bu saat az önce başkası tarafından alındı. Lütfen başka bir saat seçin.",
    });
  }

  const result = db
    .prepare(
      `INSERT INTO appointments (customer_name, phone, note, service_id, resource_id, date, time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`
    )
    .run(
      payload.customer_name,
      payload.phone,
      payload.note,
      payload.service_id,
      payload.resource_id,
      payload.date,
      payload.time
    );

  res.status(201).json({
    message: "Randevunuz oluşturuldu.",
    id: Number(result.lastInsertRowid),
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
