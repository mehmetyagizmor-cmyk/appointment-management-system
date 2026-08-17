require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const { db, DEFAULT_WORKING_HOURS } = require("./db");
const {
  signToken,
  signCustomerToken,
  requireAuth,
  requireCustomerAuth,
} = require("./auth");
const { sendBookingConfirmationEmail, sendReminderEmail } = require("./mailer");

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
const PHONE_PATTERN = /^0?5\d{9}$/; // 05XXXXXXXXX ya da 5XXXXXXXXX (TR cep telefonu)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REMINDER_HOURS_BEFORE = 24;
const REMINDER_CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 dakikada bir kontrol

// Bir günü/haftayı otomatik betiklerle (bot) sahte randevuyla doldurmayı
// zorlaştırmak için: herkese açık randevu/kayıt uçlarına IP bazlı hız sınırı.
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin." },
});

const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin." },
});

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length === 10 ? `0${digits}` : digits;
}

function isValidPhone(raw) {
  return PHONE_PATTERN.test(String(raw || "").replace(/\D/g, ""));
}

function isValidEmail(raw) {
  return EMAIL_PATTERN.test(String(raw || "").trim());
}

function normalizeEmail(raw) {
  return String(raw || "").trim().toLowerCase();
}

// ---------- Yardımcı fonksiyonlar ----------

// Henüz kendi kendine kayıt akışı (Faz 3) olmadığından, işletme kimliği
// URL/slug üzerinden gelmeyen uçlar (herkese açık randevu sayfası, misafir
// randevusu vb.) ilk (bootstrap) işletmeyi kullanır. Faz 2, bunu gerçek
// slug tabanlı bir aramayla değiştirecek.
function getDefaultBusinessId() {
  return db.prepare("SELECT id FROM businesses ORDER BY id LIMIT 1").get()?.id;
}

function getSettings(businessId) {
  const bizId = businessId || getDefaultBusinessId();
  if (!bizId) return null;
  const row = db.prepare("SELECT * FROM settings WHERE business_id = ?").get(bizId);
  if (!row) return null;
  let workingHours;
  try {
    workingHours = JSON.parse(row.working_hours);
  } catch {
    workingHours = DEFAULT_WORKING_HOURS;
  }
  return {
    businessId: row.business_id,
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

function generateSlotsForDay(dateISO, workingHours, slotMinutes) {
  const key = weekdayKeyForDate(dateISO);
  const day = workingHours[key];
  if (!day || day.closed || !day.open || !day.close) return [];

  const [openH, openM] = day.open.split(":").map(Number);
  const [closeH, closeM] = day.close.split(":").map(Number);
  const step = slotMinutes || 60;

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

// Bir kaynağın (personelin) o gün için geçerli çalışma saatlerini döndürür:
// kaynağa özel bir program tanımlıysa onu, yoksa işletme geneli programı kullanır.
function getEffectiveWorkingHours(resource, businessWorkingHours) {
  if (resource.working_hours) {
    try {
      return JSON.parse(resource.working_hours);
    } catch {
      return businessWorkingHours;
    }
  }
  return businessWorkingHours;
}

// Bir kaynağın belirli bir tarihte izinli olup olmadığını kontrol eder.
function isResourceOnLeave(resourceId, dateISO) {
  const row = db
    .prepare(
      `SELECT 1 FROM resource_time_off
       WHERE resource_id = ? AND ? BETWEEN start_date AND end_date
       LIMIT 1`
    )
    .get(resourceId, dateISO);
  return !!row;
}

// Bir kaynağı, yalnızca belirtilen işletmeye aitse döndürür — admin uçlarında
// tekrar eden "id ile bul + işletme sahipliğini doğrula" deseni için.
function getOwnedResource(id, businessId) {
  return db.prepare("SELECT * FROM resources WHERE id = ? AND business_id = ?").get(id, businessId);
}

// Bir kaynağın verebildiği hizmetlerin id listesini döndürür. Kaynağın hiç
// eşleşme satırı yoksa (yapılandırılmamışsa) o işletmenin tüm aktif
// hizmetlerini verebildiği varsayılır (geriye dönük uyumluluk için).
function getResourceServiceIds(resourceId, businessId) {
  const rows = db
    .prepare("SELECT service_id FROM resource_services WHERE resource_id = ?")
    .all(resourceId);
  if (rows.length === 0) {
    return db
      .prepare("SELECT id FROM services WHERE active = 1 AND business_id = ?")
      .all(businessId)
      .map((s) => s.id);
  }
  return rows.map((r) => r.service_id);
}

// serviceIds listesini, yalnızca gerçekten o işletmeye ait hizmetlerle
// sınırlayarak kaydeder (başka bir işletmenin hizmet id'si sessizce elenir).
function setResourceServiceIds(resourceId, serviceIds, businessId) {
  db.prepare("DELETE FROM resource_services WHERE resource_id = ?").run(resourceId);
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) return;
  const ownServiceIds = new Set(
    db.prepare("SELECT id FROM services WHERE business_id = ?").all(businessId).map((s) => s.id)
  );
  const insert = db.prepare(
    "INSERT OR IGNORE INTO resource_services (resource_id, service_id) VALUES (?, ?)"
  );
  for (const serviceId of serviceIds) {
    const id = Number(serviceId);
    if (id && ownServiceIds.has(id)) insert.run(resourceId, id);
  }
}

function rowToAppointment(row) {
  return {
    id: row.id,
    name: row.customer_name,
    phone: row.phone,
    email: row.email || "",
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

// expectedBusinessId verilirse (admin/müşteri uçlarında olduğu gibi, kimin
// randevu aldığı zaten biliniyorsa) seçilen kaynağın o işletmeye ait olduğu
// da doğrulanır. Herkese açık (misafir) uçta bu parametre verilmez — orada
// işletme, doğrulamadan SONRA seçilen kaynaktan çözülür (çağıran taraf işi).
function validateAppointmentPayload(body, expectedBusinessId = null) {
  const errors = [];
  const { name, date, time, resourceId, serviceId } = body;

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
      .prepare("SELECT * FROM resources WHERE id = ? AND active = 1")
      .get(resourceIdNum);
    if (!resource) {
      errors.push("Seçilen kaynak bulunamadı veya pasif.");
    } else if (expectedBusinessId && resource.business_id !== expectedBusinessId) {
      errors.push("Seçilen kaynak bu işletmeye ait değil.");
    } else {
      if (date && DATE_PATTERN.test(date) && isResourceOnLeave(resourceIdNum, date)) {
        errors.push("Seçilen kaynak bu tarihte izinli.");
      }
      const serviceIdNum = Number(serviceId);
      if (
        serviceIdNum &&
        !getResourceServiceIds(resourceIdNum, resource.business_id).includes(serviceIdNum)
      ) {
        errors.push("Seçilen kaynak bu hizmeti vermiyor.");
      }
    }
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

// Bir gün/haftayı sahte randevularla doldurmayı zorlaştırmak için: aynı telefon
// numarasının aynı anda yalnızca bir "aktif" (iptal edilmemiş, tarihi henüz
// geçmemiş) randevusu olabilir. Hem hesaplı müşteriler hem de misafir randevusu
// için geçerlidir.
function findActiveAppointmentForPhone(phone, businessId, excludeId = null) {
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  return db
    .prepare(
      `SELECT * FROM appointments
       WHERE phone = ? AND business_id = ? AND status != 'cancelled'
       AND (date > ? OR (date = ? AND time >= ?))
       ${excludeId ? "AND id != ?" : ""}`
    )
    .get(
      ...(excludeId
        ? [phone, businessId, todayISO, todayISO, nowTime, excludeId]
        : [phone, businessId, todayISO, todayISO, nowTime])
    );
}

// Randevu oluşturulduktan sonra e-posta bildirimini arka planda gönderir
// (yanıtı bekletmemek için "fire and forget"; hata olursa mailer içinde loglanır).
function sendConfirmationEmailForAppointment(appointmentId) {
  const row = db
    .prepare(
      `SELECT a.*, s.name AS service_name, r.name AS resource_name
       FROM appointments a
       LEFT JOIN services s ON s.id = a.service_id
       LEFT JOIN resources r ON r.id = a.resource_id
       WHERE a.id = ?`
    )
    .get(appointmentId);
  if (!row) return;

  sendBookingConfirmationEmail(
    { ...rowToAppointment(row), serviceName: row.service_name, resourceName: row.resource_name },
    getSettings(row.business_id)
  );
}

// Randevu saatine belirli bir süre kala, henüz hatırlatma gönderilmemiş ve
// e-posta adresi bulunan randevular için hatırlatma e-postası gönderir.
function checkAndSendReminders() {
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  const candidates = db
    .prepare(
      `SELECT a.*, s.name AS service_name, r.name AS resource_name
       FROM appointments a
       LEFT JOIN services s ON s.id = a.service_id
       LEFT JOIN resources r ON r.id = a.resource_id
       WHERE a.status != 'cancelled' AND a.reminder_sent = 0
       AND a.email != '' AND a.date >= ?`
    )
    .all(todayISO);

  if (!candidates.length) return;

  const windowMs = REMINDER_HOURS_BEFORE * 60 * 60 * 1000;

  for (const row of candidates) {
    const apptDateTime = new Date(`${row.date}T${row.time}:00`);
    const msUntil = apptDateTime.getTime() - now.getTime();
    if (msUntil <= 0 || msUntil > windowMs) continue;

    sendReminderEmail(
      { ...rowToAppointment(row), serviceName: row.service_name, resourceName: row.resource_name },
      getSettings(row.business_id)
    ).then((sent) => {
      if (sent) {
        db.prepare("UPDATE appointments SET reminder_sent = 1 WHERE id = ?").run(row.id);
      }
    });
  }
}

// ---------- Genel ----------

app.get("/", (req, res) => {
  res.send("Server is running!");
});

// ---------- Auth ----------

app.post("/api/auth/login", accountLimiter, (req, res) => {
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

// ---------- Müşteri hesapları ----------

function customerToPublic(row) {
  return { id: row.id, name: row.name, phone: row.phone, email: row.email || "" };
}

app.post("/api/customer/register", accountLimiter, (req, res) => {
  const { name, phone, email, password } = req.body || {};
  const errors = [];

  if (!name || !String(name).trim()) errors.push("İsim gerekli.");
  if (!phone || !isValidPhone(phone)) {
    errors.push("Geçerli bir cep telefonu numarası giriniz (05xx xxx xx xx).");
  }
  if (email && !isValidEmail(email)) {
    errors.push("Geçerli bir e-posta adresi giriniz.");
  }
  if (!password || String(password).length < 6) {
    errors.push("Şifre en az 6 karakter olmalı.");
  }
  if (errors.length) {
    return res.status(400).json({ message: "Doğrulama hatası", errors });
  }

  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = email ? normalizeEmail(email) : "";
  // Şimdilik tüm misafir/müşteri hesapları ilk (bootstrap) işletmeye bağlanır
  // — Faz 2, işletmeye özel URL'ler (/:slug) geldiğinde gerçek işletmeyi
  // istekten çözecek. Bu yüzden telefon eşsizliği de o işletmeyle sınırlı.
  const businessId = getDefaultBusinessId();
  const existing = db
    .prepare("SELECT id FROM customers WHERE phone = ? AND business_id = ?")
    .get(normalizedPhone, businessId);
  if (existing) {
    return res.status(409).json({
      message: "Bu telefon numarasıyla zaten bir hesap var. Lütfen giriş yapın.",
    });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare(
      "INSERT INTO customers (business_id, name, phone, email, password_hash) VALUES (?, ?, ?, ?, ?)"
    )
    .run(businessId, name.trim(), normalizedPhone, normalizedEmail, hash);

  const customer = {
    id: Number(result.lastInsertRowid),
    business_id: businessId,
    name: name.trim(),
    phone: normalizedPhone,
    email: normalizedEmail,
  };
  const token = signCustomerToken(customer);
  res.status(201).json({ token, ...customerToPublic(customer) });
});

app.post("/api/customer/login", accountLimiter, (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) {
    return res.status(400).json({ message: "Telefon numarası ve şifre gerekli." });
  }

  const businessId = getDefaultBusinessId();
  const customer = db
    .prepare("SELECT * FROM customers WHERE phone = ? AND business_id = ?")
    .get(normalizePhone(phone), businessId);

  if (!customer || !bcrypt.compareSync(password, customer.password_hash)) {
    return res.status(401).json({ message: "Telefon numarası veya şifre hatalı." });
  }

  const token = signCustomerToken(customer);
  res.json({ token, ...customerToPublic(customer) });
});

app.get("/api/customer/me", requireCustomerAuth, (req, res) => {
  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(req.user.sub);
  if (!customer) return res.status(404).json({ message: "Hesap bulunamadı." });
  res.json(customerToPublic(customer));
});

app.post("/api/customer/appointments", bookingLimiter, requireCustomerAuth, (req, res) => {
  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(req.user.sub);
  if (!customer) return res.status(404).json({ message: "Hesap bulunamadı." });

  const errors = validateAppointmentPayload(
    { ...req.body, name: customer.name },
    req.user.businessId
  );
  if (errors.length) {
    return res.status(400).json({ message: "Doğrulama hatası", errors });
  }

  const payload = {
    business_id: req.user.businessId,
    customer_id: customer.id,
    customer_name: customer.name,
    phone: customer.phone,
    email: customer.email || "",
    note: (req.body.note || "").trim(),
    service_id: req.body.serviceId ? Number(req.body.serviceId) : null,
    resource_id: Number(req.body.resourceId),
    date: req.body.date,
    time: req.body.time,
  };

  const activeAppointment = findActiveAppointmentForPhone(payload.phone, req.user.businessId);
  if (activeAppointment) {
    return res.status(409).json({
      message:
        "Zaten bekleyen bir randevunuz var. Yeni randevu alabilmek için önce mevcut randevunuzu iptal etmelisiniz.",
      activeAppointmentId: activeAppointment.id,
    });
  }

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
      `INSERT INTO appointments (business_id, customer_name, phone, email, note, service_id, resource_id, date, time, status, customer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`
    )
    .run(
      payload.business_id,
      payload.customer_name,
      payload.phone,
      payload.email,
      payload.note,
      payload.service_id,
      payload.resource_id,
      payload.date,
      payload.time,
      payload.customer_id
    );

  const newId = Number(result.lastInsertRowid);
  sendConfirmationEmailForAppointment(newId);

  res.status(201).json({
    message: "Randevunuz oluşturuldu.",
    id: newId,
  });
});

app.delete("/api/customer/appointments/:id", requireCustomerAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);

  if (
    !existing ||
    existing.customer_id !== req.user.sub ||
    existing.business_id !== req.user.businessId
  ) {
    return res.status(404).json({ message: "Randevu bulunamadı." });
  }

  db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(id);
  res.json({ message: "Randevunuz iptal edildi." });
});

app.get("/api/customer/appointments", requireCustomerAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, s.name AS service_name, r.name AS resource_name
       FROM appointments a
       LEFT JOIN services s ON s.id = a.service_id
       LEFT JOIN resources r ON r.id = a.resource_id
       WHERE a.customer_id = ? AND a.business_id = ?`
    )
    .all(req.user.sub, req.user.businessId)
    .map((row) => ({
      ...rowToAppointment(row),
      serviceName: row.service_name,
      resourceName: row.resource_name,
    }));

  res.json(sortedAppointments(rows));
});

// ---------- Ayarlar (admin) ----------

app.get("/api/settings", requireAuth, (req, res) => {
  res.json(getSettings(req.user.businessId));
});

app.put("/api/settings", requireAuth, (req, res) => {
  const current = getSettings(req.user.businessId);
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
     phone = ?, address = ?, slot_minutes = ?, working_hours = ? WHERE business_id = ?`
  ).run(
    next.businessName,
    next.resourceLabel,
    next.resourceLabelPlural,
    next.phone,
    next.address,
    next.slotMinutes,
    JSON.stringify(next.workingHours),
    req.user.businessId
  );

  res.json(getSettings(req.user.businessId));
});

// ---------- Kaynaklar (koltuk / personel / oda...) ----------

function resourceToAdminJson(row) {
  let workingHours = null;
  if (row.working_hours) {
    try {
      workingHours = JSON.parse(row.working_hours);
    } catch {
      workingHours = null;
    }
  }
  return {
    id: row.id,
    name: row.name,
    active: !!row.active,
    workingHours,
    serviceIds: getResourceServiceIds(row.id, row.business_id),
  };
}

app.get("/api/resources", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM resources WHERE business_id = ? ORDER BY sort_order, id")
    .all(req.user.businessId);
  res.json(rows.map(resourceToAdminJson));
});

app.post("/api/resources", requireAuth, (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ message: "İsim gerekli." });

  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM resources WHERE business_id = ?")
    .get(req.user.businessId).m;
  const workingHours =
    req.body?.workingHours && typeof req.body.workingHours === "object"
      ? JSON.stringify(req.body.workingHours)
      : null;
  const result = db
    .prepare(
      "INSERT INTO resources (business_id, name, active, sort_order, working_hours) VALUES (?, ?, 1, ?, ?)"
    )
    .run(req.user.businessId, name, maxOrder + 1, workingHours);
  const id = Number(result.lastInsertRowid);

  if (Array.isArray(req.body?.serviceIds)) {
    setResourceServiceIds(id, req.body.serviceIds, req.user.businessId);
  }

  const row = getOwnedResource(id, req.user.businessId);
  res.status(201).json(resourceToAdminJson(row));
});

app.put("/api/resources/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = getOwnedResource(id, req.user.businessId);
  if (!existing) return res.status(404).json({ message: "Kaynak bulunamadı." });

  const name = req.body?.name?.trim() || existing.name;
  const active = req.body?.active === undefined ? existing.active : req.body.active ? 1 : 0;
  const workingHours =
    req.body?.workingHours === undefined
      ? existing.working_hours
      : req.body.workingHours && typeof req.body.workingHours === "object"
      ? JSON.stringify(req.body.workingHours)
      : null;

  db.prepare(
    "UPDATE resources SET name = ?, active = ?, working_hours = ? WHERE id = ?"
  ).run(name, active, workingHours, id);

  if (Array.isArray(req.body?.serviceIds)) {
    setResourceServiceIds(id, req.body.serviceIds, req.user.businessId);
  }

  const row = getOwnedResource(id, req.user.businessId);
  res.json(resourceToAdminJson(row));
});

app.delete("/api/resources/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = getOwnedResource(id, req.user.businessId);
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

// ---------- Kaynak izin günleri ----------

app.get("/api/resources/:id/time-off", requireAuth, (req, res) => {
  const resourceId = Number(req.params.id);
  const resource = getOwnedResource(resourceId, req.user.businessId);
  if (!resource) return res.status(404).json({ message: "Kaynak bulunamadı." });

  const rows = db
    .prepare(
      "SELECT * FROM resource_time_off WHERE resource_id = ? ORDER BY start_date"
    )
    .all(resourceId);
  res.json(
    rows.map((r) => ({
      id: r.id,
      resourceId: r.resource_id,
      startDate: r.start_date,
      endDate: r.end_date,
      reason: r.reason,
    }))
  );
});

app.post("/api/resources/:id/time-off", requireAuth, (req, res) => {
  const resourceId = Number(req.params.id);
  const resource = getOwnedResource(resourceId, req.user.businessId);
  if (!resource) return res.status(404).json({ message: "Kaynak bulunamadı." });

  const { startDate, endDate, reason } = req.body || {};
  if (!startDate || !DATE_PATTERN.test(startDate) || !endDate || !DATE_PATTERN.test(endDate)) {
    return res.status(400).json({ message: "Geçerli bir başlangıç/bitiş tarihi giriniz." });
  }
  if (startDate > endDate) {
    return res.status(400).json({ message: "Başlangıç tarihi bitiş tarihinden sonra olamaz." });
  }

  const result = db
    .prepare(
      "INSERT INTO resource_time_off (resource_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)"
    )
    .run(resourceId, startDate, endDate, (reason || "").trim());

  res.status(201).json({
    id: Number(result.lastInsertRowid),
    resourceId,
    startDate,
    endDate,
    reason: (reason || "").trim(),
  });
});

app.delete("/api/resources/:id/time-off/:timeOffId", requireAuth, (req, res) => {
  const resourceId = Number(req.params.id);
  const timeOffId = Number(req.params.timeOffId);
  const resource = getOwnedResource(resourceId, req.user.businessId);
  if (!resource) return res.status(404).json({ message: "Kaynak bulunamadı." });

  const existing = db
    .prepare("SELECT * FROM resource_time_off WHERE id = ? AND resource_id = ?")
    .get(timeOffId, resourceId);
  if (!existing) return res.status(404).json({ message: "İzin kaydı bulunamadı." });

  db.prepare("DELETE FROM resource_time_off WHERE id = ?").run(timeOffId);
  res.json({ message: "İzin kaydı silindi." });
});

// ---------- Hizmetler ----------

app.get("/api/services", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM services WHERE business_id = ? ORDER BY id")
    .all(req.user.businessId);
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
      "INSERT INTO services (business_id, name, duration_minutes, price, active) VALUES (?, ?, ?, ?, 1)"
    )
    .run(req.user.businessId, name.trim(), duration, priceNum);

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
  const existing = db
    .prepare("SELECT * FROM services WHERE id = ? AND business_id = ?")
    .get(id, req.user.businessId);
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
  const existing = db
    .prepare("SELECT * FROM services WHERE id = ? AND business_id = ?")
    .get(id, req.user.businessId);
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
  const rows = db
    .prepare("SELECT * FROM appointments WHERE business_id = ?")
    .all(req.user.businessId);
  res.json(sortedAppointments(rows.map(rowToAppointment)));
});

app.post("/api/appointments", requireAuth, (req, res) => {
  const errors = validateAppointmentPayload(req.body, req.user.businessId);
  if (errors.length) {
    return res.status(400).json({ message: "Doğrulama hatası", errors });
  }

  const payload = {
    business_id: req.user.businessId,
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
      `INSERT INTO appointments (business_id, customer_name, phone, note, service_id, resource_id, date, time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`
    )
    .run(
      payload.business_id,
      payload.customer_name,
      payload.phone,
      payload.note,
      payload.service_id,
      payload.resource_id,
      payload.date,
      payload.time
    );

  const row = db
    .prepare("SELECT * FROM appointments WHERE id = ? AND business_id = ?")
    .get(Number(result.lastInsertRowid), req.user.businessId);
  res.status(201).json(rowToAppointment(row));
});

app.put("/api/appointments/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db
    .prepare("SELECT * FROM appointments WHERE id = ? AND business_id = ?")
    .get(id, req.user.businessId);
  if (!existing) return res.status(404).json({ message: "Randevu bulunamadı." });

  const errors = validateAppointmentPayload(req.body, req.user.businessId);
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
     resource_id = ?, date = ?, time = ?, status = ? WHERE id = ? AND business_id = ?`
  ).run(
    payload.customer_name,
    payload.phone,
    payload.note,
    payload.service_id,
    payload.resource_id,
    payload.date,
    payload.time,
    payload.status,
    id,
    req.user.businessId
  );

  const row = db
    .prepare("SELECT * FROM appointments WHERE id = ? AND business_id = ?")
    .get(id, req.user.businessId);
  res.json({ message: "Randevu güncellendi.", appointment: rowToAppointment(row) });
});

app.delete("/api/appointments/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db
    .prepare("SELECT * FROM appointments WHERE id = ? AND business_id = ?")
    .get(id, req.user.businessId);
  if (!existing) return res.status(404).json({ message: "Randevu bulunamadı." });

  db.prepare("DELETE FROM appointments WHERE id = ? AND business_id = ?").run(
    id,
    req.user.businessId
  );

  const rows = db
    .prepare("SELECT * FROM appointments WHERE business_id = ?")
    .all(req.user.businessId);
  res.status(200).json({
    message: "Randevu silindi.",
    appointments: sortedAppointments(rows.map(rowToAppointment)),
  });
});

// ---------- İstatistikler (admin dashboard) ----------

app.get("/api/stats", requireAuth, (req, res) => {
  const businessId = req.user.businessId;
  const todayISO = new Date().toISOString().slice(0, 10);
  const weekAheadISO = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const todayCount = db
    .prepare(
      "SELECT COUNT(*) AS c FROM appointments WHERE business_id = ? AND date = ? AND status != 'cancelled'"
    )
    .get(businessId, todayISO).c;

  const weekCount = db
    .prepare(
      "SELECT COUNT(*) AS c FROM appointments WHERE business_id = ? AND date >= ? AND date <= ? AND status != 'cancelled'"
    )
    .get(businessId, todayISO, weekAheadISO).c;

  const totalCustomers = db
    .prepare("SELECT COUNT(DISTINCT customer_name) AS c FROM appointments WHERE business_id = ?")
    .get(businessId).c;

  const monthPrefix = todayISO.slice(0, 7);
  const monthRevenue = db
    .prepare(
      `SELECT COALESCE(SUM(s.price), 0) AS total
       FROM appointments a JOIN services s ON s.id = a.service_id
       WHERE a.business_id = ? AND a.date LIKE ? AND a.status != 'cancelled'`
    )
    .get(businessId, `${monthPrefix}%`).total;

  const byService = db
    .prepare(
      `SELECT s.name AS name, COUNT(*) AS count
       FROM appointments a JOIN services s ON s.id = a.service_id
       WHERE a.business_id = ? AND a.status != 'cancelled'
       GROUP BY s.id ORDER BY count DESC LIMIT 5`
    )
    .all(businessId);

  const upcoming = db
    .prepare(
      `SELECT a.*, s.name AS service_name, r.name AS resource_name
       FROM appointments a
       LEFT JOIN services s ON s.id = a.service_id
       LEFT JOIN resources r ON r.id = a.resource_id
       WHERE a.business_id = ? AND a.date >= ? AND a.status != 'cancelled'
       ORDER BY a.date, a.time LIMIT 5`
    )
    .all(businessId, todayISO)
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

// Herkese açık işletme sayfası yükünü (ayarlar + aktif kaynaklar + aktif
// hizmetler) belirli bir işletme için hazırlar. Hem varsayılan (/api/public/business)
// hem slug'a özel (/api/public/business/:slug) uç bunu paylaşır.
function buildPublicBusinessPayload(businessId) {
  const settings = getSettings(businessId);
  if (!settings) return null;

  const resourceRows = db
    .prepare("SELECT * FROM resources WHERE active = 1 AND business_id = ? ORDER BY sort_order, id")
    .all(businessId);
  const resources = resourceRows.map((r) => ({
    id: r.id,
    name: r.name,
    serviceIds: getResourceServiceIds(r.id, businessId),
    workingHours: getEffectiveWorkingHours(r, settings.workingHours),
  }));
  const services = db
    .prepare(
      "SELECT id, name, duration_minutes AS durationMinutes, price FROM services WHERE active = 1 AND business_id = ? ORDER BY id"
    )
    .all(businessId);

  return { ...settings, resources, services };
}

// Geriye dönük uyumluluk: mevcut /randevu-al ve /book sayfaları hâlâ bu uca
// slug vermeden istek atıyor, bu yüzden ilk (bootstrap) işletmeyi döndürmeye
// devam eder.
app.get("/api/public/business", (req, res) => {
  const payload = buildPublicBusinessPayload(getDefaultBusinessId());
  if (!payload) return res.status(404).json({ message: "İşletme bulunamadı." });
  res.json(payload);
});

// Faz 3'te açılacak kendi kendine kayıt akışıyla oluşacak her işletme,
// kendi randevu sayfasına bu uç üzerinden ulaşır.
app.get("/api/public/business/:slug", (req, res) => {
  const business = db
    .prepare("SELECT id FROM businesses WHERE slug = ?")
    .get(req.params.slug);
  if (!business) return res.status(404).json({ message: "İşletme bulunamadı." });

  const payload = buildPublicBusinessPayload(business.id);
  if (!payload) return res.status(404).json({ message: "İşletme bulunamadı." });
  res.json(payload);
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

  const resource = db.prepare("SELECT * FROM resources WHERE id = ? AND active = 1").get(resIdNum);
  if (!resource) {
    return res.status(404).json({ message: "Kaynak bulunamadı." });
  }

  const settings = getSettings();

  if (isResourceOnLeave(resIdNum, date)) {
    return res.json({ slots: [] });
  }

  const effectiveHours = getEffectiveWorkingHours(resource, settings.workingHours);
  const allSlots = generateSlotsForDay(date, effectiveHours, settings.slotMinutes);

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

app.post("/api/public/appointments", bookingLimiter, (req, res) => {
  const errors = validateAppointmentPayload(req.body);
  if (errors.length) {
    return res.status(400).json({ message: "Doğrulama hatası", errors });
  }
  if (!req.body.phone || !isValidPhone(req.body.phone)) {
    errors.push("Geçerli bir cep telefonu numarası giriniz (05xx xxx xx xx).");
  }
  if (req.body.email && !isValidEmail(req.body.email)) {
    errors.push("Geçerli bir e-posta adresi giriniz.");
  }
  if (errors.length) {
    return res.status(400).json({ message: "Doğrulama hatası", errors });
  }

  // Misafir randevusunda işletme kimliği önceden bilinmiyor (giriş yok) —
  // doğrulamadan geçen kaynağın kendi business_id'si kullanılır. Bu sayede
  // Faz 2'nin işletmeye özel randevu sayfaları herhangi bir ek parametre
  // olmadan doğru işletmeye yazar.
  const resourceForBusiness = db
    .prepare("SELECT business_id FROM resources WHERE id = ?")
    .get(Number(req.body.resourceId));

  const payload = {
    business_id: resourceForBusiness?.business_id,
    customer_name: req.body.name.trim(),
    phone: normalizePhone(req.body.phone),
    email: req.body.email ? normalizeEmail(req.body.email) : "",
    note: (req.body.note || "").trim(),
    service_id: req.body.serviceId ? Number(req.body.serviceId) : null,
    resource_id: Number(req.body.resourceId),
    date: req.body.date,
    time: req.body.time,
  };

  const activeAppointment = findActiveAppointmentForPhone(payload.phone, payload.business_id);
  if (activeAppointment) {
    const businessPhone = getSettings(payload.business_id)?.phone;
    return res.status(409).json({
      message: businessPhone
        ? `Bu telefon numarasıyla zaten bekleyen bir randevu var. Mevcut randevunuzu iptal ettirip yenisini alabilmek için ${businessPhone} numarasını arayabilirsiniz.`
        : "Bu telefon numarasıyla zaten bekleyen bir randevu var. Yeni randevu alabilmek için önce mevcut randevunun iptal edilmesi gerekiyor.",
    });
  }

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
      `INSERT INTO appointments (business_id, customer_name, phone, email, note, service_id, resource_id, date, time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`
    )
    .run(
      payload.business_id,
      payload.customer_name,
      payload.phone,
      payload.email,
      payload.note,
      payload.service_id,
      payload.resource_id,
      payload.date,
      payload.time
    );

  const newId = Number(result.lastInsertRowid);
  sendConfirmationEmailForAppointment(newId);

  res.status(201).json({
    message: "Randevunuz oluşturuldu.",
    id: newId,
  });
});

// Testler bu dosyayı `require` ederek app'i doğrudan (ağ dinlemeden) kullanır;
// arka plan hatırlatma işi ve gerçek port dinleme yalnızca `node server.js`
// ile normal çalıştırmada devreye girer.
if (require.main === module) {
  checkAndSendReminders();
  setInterval(checkAndSendReminders, REMINDER_CHECK_INTERVAL_MS);

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = { app };
