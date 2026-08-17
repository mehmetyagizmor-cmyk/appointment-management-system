// Her test dosyası, gerçek server/data/database.sqlite dosyasına dokunmayan,
// kendine özel geçici bir veritabanıyla çalışır. `node --test` her test
// dosyasını ayrı bir process'te çalıştırdığından, dosya başına bir kez
// createTestApp() çağırmak yeterlidir.

const path = require("path");
const fs = require("fs");
const os = require("os");

function createTestApp(envOverrides = {}) {
  const dbFile = path.join(
    os.tmpdir(),
    `rys-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`
  );

  process.env.DB_PATH = dbFile;
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  process.env.ADMIN_USERNAME = envOverrides.adminUsername || "admin";
  process.env.ADMIN_PASSWORD = envOverrides.adminPassword || "admin123";

  // Modül önbelleğini temizle ki her çağrı taze bir db bağlantısı ve app alsın.
  delete require.cache[require.resolve("../../db")];
  delete require.cache[require.resolve("../../server")];

  const { app } = require("../../server");
  const { db } = require("../../db");

  return {
    app,
    db,
    dbFile,
    cleanup() {
      delete require.cache[require.resolve("../../db")];
      delete require.cache[require.resolve("../../server")];
      try {
        fs.unlinkSync(dbFile);
      } catch {
        // dosya zaten yoksa sorun değil
      }
    },
  };
}

function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

// Test yardımcıları: varsayılan seed admin'iyle giriş yapıp token döndürür.
async function adminLogin(baseUrl, username = "admin", password = "admin123") {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`admin login failed: ${JSON.stringify(body)}`);
  return body.token;
}

module.exports = { createTestApp, startServer, adminLogin };
