const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");
const { slugify } = require("./slugify");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Testlerin gerçek veritabanına dokunmadan çalışabilmesi için DB_PATH env
// değişkeniyle override edilebilir (ör. ":memory:" ya da geçici bir dosya).
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "database.sqlite");
if (DB_PATH !== ":memory:") {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA foreign_keys = ON;");

// ---------- Şema ----------
// Taze kurulumlarda tablolar doğrudan aşağıdaki (çok işletmeli) final şekliyle
// oluşur. Var olan (bu değişiklikten önce kurulmuş) veritabanlarında bu
// CREATE TABLE IF NOT EXISTS ifadeleri no-op'tur — o kurulumlar aşağıdaki
// "Çok işletmeli göç" bölümünde eski tek işletmeli şekilden göç eder.

db.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL DEFAULT '',
    subscription_status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id),
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (business_id, username)
  );

  CREATE TABLE IF NOT EXISTS settings (
    business_id INTEGER PRIMARY KEY REFERENCES businesses(id),
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
    business_id INTEGER REFERENCES businesses(id),
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    working_hours TEXT
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER REFERENCES businesses(id),
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    price REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER REFERENCES businesses(id),
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    email TEXT NOT NULL DEFAULT '',
    reminder_sent INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (business_id, phone)
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

// ---------- Basit şema göçleri (bu değişiklikten önceki eski kurulumlar için) ----------
// Yukarıdaki CREATE TABLE IF NOT EXISTS zaten tüm sütunları içerdiğinden, bu
// bloklar yalnızca gerçekten eski (bu sütunlardan önce oluşturulmuş) bir
// veritabanında devreye girer.

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

const customerColumnsLegacy = db
  .prepare("PRAGMA table_info(customers)")
  .all()
  .map((c) => c.name);
if (!customerColumnsLegacy.includes("email")) {
  db.exec("ALTER TABLE customers ADD COLUMN email TEXT NOT NULL DEFAULT ''");
}

const resourceColumnsLegacy = db
  .prepare("PRAGMA table_info(resources)")
  .all()
  .map((c) => c.name);
if (!resourceColumnsLegacy.includes("working_hours")) {
  // NULL = işletme geneli çalışma saatlerini kullan (varsayılan davranış).
  db.exec("ALTER TABLE resources ADD COLUMN working_hours TEXT");
}

// ---------- Çok işletmeli (multi-tenant) göç ----------
// Bu blok sistemi "tek işletme" varsayımından "her satır bir işletmeye ait"
// modeline taşır. Yalnızca bu değişiklikten önce kurulmuş (settings tablosu
// hâlâ eski CHECK(id=1) şeklinde olan) veritabanlarında devreye girer — taze
// kurulumlarda yukarıdaki CREATE TABLE zaten final şekli oluşturduğu için bu
// blok tamamen atlanır.

const settingsColumns = db
  .prepare("PRAGMA table_info(settings)")
  .all()
  .map((c) => c.name);
const needsMultiTenantMigration = !settingsColumns.includes("business_id");

if (needsMultiTenantMigration) {
  console.log(
    "> Çok işletmeli şemaya göç ediliyor (mevcut veriler business_id = 1 olarak korunacak)..."
  );

  const oldSettings = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  const oldAdmins = db.prepare("SELECT * FROM admin_users").all();
  const oldCustomers = db.prepare("SELECT * FROM customers").all();
  const businessName = oldSettings ? oldSettings.business_name : "İşletmem";

  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO businesses (id, slug, name, owner_email, subscription_status) VALUES (1, ?, ?, '', 'active')"
    ).run(slugify(businessName), businessName);

    db.exec("ALTER TABLE settings RENAME TO settings_old");
    db.exec(`
      CREATE TABLE settings (
        business_id INTEGER PRIMARY KEY REFERENCES businesses(id),
        business_name TEXT NOT NULL DEFAULT 'İşletmem',
        resource_label TEXT NOT NULL DEFAULT 'Koltuk',
        resource_label_plural TEXT NOT NULL DEFAULT 'Koltuklar',
        phone TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        slot_minutes INTEGER NOT NULL DEFAULT 60,
        working_hours TEXT NOT NULL DEFAULT '{}'
      );
    `);
    if (oldSettings) {
      db.prepare(
        `INSERT INTO settings (business_id, business_name, resource_label, resource_label_plural, phone, address, slot_minutes, working_hours)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        oldSettings.business_name,
        oldSettings.resource_label,
        oldSettings.resource_label_plural,
        oldSettings.phone,
        oldSettings.address,
        oldSettings.slot_minutes,
        oldSettings.working_hours
      );
    }
    db.exec("DROP TABLE settings_old");

    db.exec("ALTER TABLE admin_users RENAME TO admin_users_old");
    db.exec(`
      CREATE TABLE admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (business_id, username)
      );
    `);
    const insertAdmin = db.prepare(
      "INSERT INTO admin_users (id, business_id, username, password_hash, created_at) VALUES (?, 1, ?, ?, ?)"
    );
    for (const a of oldAdmins) insertAdmin.run(a.id, a.username, a.password_hash, a.created_at);
    db.exec("DROP TABLE admin_users_old");

    db.exec("ALTER TABLE customers RENAME TO customers_old");
    db.exec(`
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL REFERENCES businesses(id),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (business_id, phone)
      );
    `);
    const insertCustomer = db.prepare(
      "INSERT INTO customers (id, business_id, name, phone, password_hash, email, created_at) VALUES (?, 1, ?, ?, ?, ?, ?)"
    );
    for (const c of oldCustomers) {
      insertCustomer.run(c.id, c.name, c.phone, c.password_hash, c.email || "", c.created_at);
    }
    db.exec("DROP TABLE customers_old");

    // resources / services / appointments: sadece sütun ekleme + doldurma yeterli
    // (constraint değişikliği yok, tablo yeniden inşasına gerek yok).
    db.exec("ALTER TABLE resources ADD COLUMN business_id INTEGER REFERENCES businesses(id)");
    db.exec("ALTER TABLE services ADD COLUMN business_id INTEGER REFERENCES businesses(id)");
    db.exec("ALTER TABLE appointments ADD COLUMN business_id INTEGER REFERENCES businesses(id)");
    db.exec("UPDATE resources SET business_id = 1 WHERE business_id IS NULL");
    db.exec("UPDATE services SET business_id = 1 WHERE business_id IS NULL");
    db.exec("UPDATE appointments SET business_id = 1 WHERE business_id IS NULL");

    db.exec("COMMIT");
    console.log("> Çok işletmeli göç tamamlandı.");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
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
// Bu fonksiyon yalnızca ilk (bootstrap) işletmeyi oluşturur — Faz 3'te
// eklenecek kendi kendine kayıt akışı, yeni işletmeleri bu fonksiyona
// dokunmadan doğrudan `businesses` tablosuna ekleyecek.

function seedIfEmpty() {
  let business = db.prepare("SELECT id FROM businesses ORDER BY id LIMIT 1").get();
  if (!business) {
    const name = "Vitrin Kuaför Stüdyosu";
    const result = db
      .prepare(
        "INSERT INTO businesses (slug, name, owner_email, subscription_status) VALUES (?, ?, '', 'active')"
      )
      .run(slugify(name), name);
    business = { id: Number(result.lastInsertRowid) };
  }
  const businessId = business.id;

  const settingsRow = db
    .prepare("SELECT COUNT(*) AS c FROM settings WHERE business_id = ?")
    .get(businessId);
  if (settingsRow.c === 0) {
    db.prepare(
      `INSERT INTO settings (business_id, business_name, resource_label, resource_label_plural, phone, address, slot_minutes, working_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      businessId,
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
      "INSERT INTO resources (business_id, name, active, sort_order) VALUES (?, ?, 1, ?)"
    );
    const r1 = insert.run(businessId, "1. Koltuk", 0);
    const r2 = insert.run(businessId, "2. Koltuk", 1);
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
      "INSERT INTO services (business_id, name, duration_minutes, price, active) VALUES (?, ?, ?, ?, 1)"
    );
    const s1 = insert.run(businessId, "Saç Kesimi", 30, 350);
    const s2 = insert.run(businessId, "Sakal Tıraşı", 20, 200);
    const s3 = insert.run(businessId, "Saç & Sakal", 45, 500);
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
      `INSERT INTO appointments (business_id, customer_name, phone, note, service_id, resource_id, date, time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`
    );
    const today = new Date();
    const iso = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().slice(0, 10);
    };
    const demo = [
      [businessId, "Ahmet Yılmaz", "0532 111 22 33", "", serviceIds[0], resourceIds[0], iso(0), "10:00"],
      [businessId, "Mehmet Kaya", "0533 222 33 44", "Düzenli müşteri", serviceIds[2], resourceIds[1], iso(0), "11:00"],
      [businessId, "Ece Demir", "0534 333 44 55", "", serviceIds[1], resourceIds[0], iso(1), "14:00"],
      [businessId, "Yağız Mor", "0535 444 55 66", "İlk ziyaret", serviceIds[0], resourceIds[1], iso(2), "16:00"],
    ];
    for (const row of demo) insert.run(...row);
  }

  const adminCount = db.prepare("SELECT COUNT(*) AS c FROM admin_users").get();
  if (adminCount.c === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      "INSERT INTO admin_users (business_id, username, password_hash) VALUES (?, ?, ?)"
    ).run(businessId, username, hash);
    console.log(
      `\n> İlk yönetici hesabı oluşturuldu → kullanıcı adı: "${username}", şifre: "${password}"\n> Lütfen .env dosyasında ADMIN_USERNAME / ADMIN_PASSWORD değerlerini değiştirip sunucuyu yeniden başlatın.\n`
    );
  }
}

seedIfEmpty();

module.exports = { db, DEFAULT_WORKING_HOURS };
