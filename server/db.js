const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "database.sqlite");
const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA foreign_keys = ON;");

// ---------- Şema ----------

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    business_name TEXT NOT NULL DEFAULT 'İşletmem',
    resource_label TEXT NOT NULL DEFAULT 'Koltuk',
    resource_label_plural TEXT NOT NULL DEFAULT 'Koltuklar',
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    slot_minutes INTEGER NOT NULL DEFAULT 60,
    working_hours TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    price REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Bir personelin/kaynağın belirli tarih aralığında izinli olduğunu belirtir.
  -- O aralıktaki tüm saatler, çalışma programı ne olursa olsun dolu gösterilir.
  CREATE TABLE IF NOT EXISTS resource_time_off (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Bir kaynağın hangi hizmetleri verebildiğini belirtir. Bir kaynağın hiç
  -- satırı yoksa "tüm hizmetleri verebilir" anlamına gelir (geriye dönük uyum).
  CREATE TABLE IF NOT EXISTS resource_services (
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (resource_id, service_id)
  );
`);

// ---------- Basit şema göçleri (mevcut veritabanları için) ----------

const appointmentColumns = db
  .prepare("PRAGMA table_info(appointments)")
  .all()
  .map((c) => c.name);
if (!appointmentColumns.includes("customer_id")) {
  db.exec(
    "ALTER TABLE appointments ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL"
  );
}
if (!appointmentColumns.includes("email")) {
  db.exec("ALTER TABLE appointments ADD COLUMN email TEXT NOT NULL DEFAULT ''");
}
if (!appointmentColumns.includes("reminder_sent")) {
  db.exec("ALTER TABLE appointments ADD COLUMN reminder_sent INTEGER NOT NULL DEFAULT 0");
}

const customerColumns = db
  .prepare("PRAGMA table_info(customers)")
  .all()
  .map((c) => c.name);
if (!customerColumns.includes("email")) {
  db.exec("ALTER TABLE customers ADD COLUMN email TEXT NOT NULL DEFAULT ''");
}

const resourceColumns = db
  .prepare("PRAGMA table_info(resources)")
  .all()
  .map((c) => c.name);
if (!resourceColumns.includes("working_hours")) {
  // NULL = işletme geneli çalışma saatlerini kullan (varsayılan davranış).
  db.exec("ALTER TABLE resources ADD COLUMN working_hours TEXT");
}

// ---------- Varsayılan çalışma saatleri ----------

const DEFAULT_WORKING_HOURS = {
  mon: { open: "09:00", close: "18:00", closed: false },
  tue: { open: "09:00", close: "18:00", closed: false },
  wed: { open: "09:00", close: "18:00", closed: false },
  thu: { open: "09:00", close: "18:00", closed: false },
  fri: { open: "09:00", close: "18:00", closed: false },
  sat: { open: "10:00", close: "16:00", closed: false },
  sun: { open: "10:00", close: "16:00", closed: true },
};

// ---------- İlk kurulum / seed ----------

function seedIfEmpty() {
  const settingsRow = db.prepare("SELECT COUNT(*) AS c FROM settings").get();
  if (settingsRow.c === 0) {
    db.prepare(
      `INSERT INTO settings (id, business_name, resource_label, resource_label_plural, phone, address, slot_minutes, working_hours)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "Vitrin Kuaför Stüdyosu",
      "Koltuk",
      "Koltuklar",
      "0555 000 00 00",
      "Merkez Mah. Randevu Cad. No:1",
      60,
      JSON.stringify(DEFAULT_WORKING_HOURS)
    );
  }

  const resourceCount = db.prepare("SELECT COUNT(*) AS c FROM resources").get();
  let resourceIds = [];
  if (resourceCount.c === 0) {
    const insert = db.prepare(
      "INSERT INTO resources (name, active, sort_order) VALUES (?, 1, ?)"
    );
    const r1 = insert.run("1. Koltuk", 0);
    const r2 = insert.run("2. Koltuk", 1);
    resourceIds = [Number(r1.lastInsertRowid), Number(r2.lastInsertRowid)];
  } else {
    resourceIds = db
      .prepare("SELECT id FROM resources ORDER BY sort_order")
      .all()
      .map((r) => r.id);
  }

  const serviceCount = db.prepare("SELECT COUNT(*) AS c FROM services").get();
  let serviceIds = [];
  if (serviceCount.c === 0) {
    const insert = db.prepare(
      "INSERT INTO services (name, duration_minutes, price, active) VALUES (?, ?, ?, 1)"
    );
    const s1 = insert.run("Saç Kesimi", 30, 350);
    const s2 = insert.run("Sakal Tıraşı", 20, 200);
    const s3 = insert.run("Saç & Sakal", 45, 500);
    serviceIds = [
      Number(s1.lastInsertRowid),
      Number(s2.lastInsertRowid),
      Number(s3.lastInsertRowid),
    ];
  } else {
    serviceIds = db.prepare("SELECT id FROM services").all().map((s) => s.id);
  }

  const appointmentCount = db
    .prepare("SELECT COUNT(*) AS c FROM appointments")
    .get();
  if (appointmentCount.c === 0 && resourceIds.length && serviceIds.length) {
    const insert = db.prepare(
      `INSERT INTO appointments (customer_name, phone, note, service_id, resource_id, date, time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`
    );
    const today = new Date();
    const iso = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().slice(0, 10);
    };
    const demo = [
      ["Ahmet Yılmaz", "0532 111 22 33", "", serviceIds[0], resourceIds[0], iso(0), "10:00"],
      ["Mehmet Kaya", "0533 222 33 44", "Düzenli müşteri", serviceIds[2], resourceIds[1], iso(0), "11:00"],
      ["Ece Demir", "0534 333 44 55", "", serviceIds[1], resourceIds[0], iso(1), "14:00"],
      ["Yağız Mor", "0535 444 55 66", "İlk ziyaret", serviceIds[0], resourceIds[1], iso(2), "16:00"],
    ];
    for (const row of demo) insert.run(...row);
  }

  const adminCount = db.prepare("SELECT COUNT(*) AS c FROM admin_users").get();
  if (adminCount.c === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)"
    ).run(username, hash);
    console.log(
      `\n> İlk yönetici hesabı oluşturuldu → kullanıcı adı: "${username}", şifre: "${password}"\n> Lütfen .env dosyasında ADMIN_USERNAME / ADMIN_PASSWORD değerlerini değiştirip sunucuyu yeniden başlatın.\n`
    );
  }
}

seedIfEmpty();

module.exports = { db, DEFAULT_WORKING_HOURS };
