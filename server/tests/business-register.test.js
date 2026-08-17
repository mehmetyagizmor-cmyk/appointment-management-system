// Faz 3: kendi kendine işletme kaydı.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { createTestApp, startServer } = require("./helpers/app");

async function register(baseUrl, overrides = {}) {
  return fetch(`${baseUrl}/api/business/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessName: "Yeni Kuaför",
      username: "yenikuafor",
      password: "gizli123",
      ...overrides,
    }),
  });
}

test("yeni işletme kaydı başarılı olur ve doğrudan giriş yapılmış token döner", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const res = await register(baseUrl);
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.username, "yenikuafor");
  assert.equal(body.business.name, "Yeni Kuaför");
  assert.equal(body.business.slug, "yeni-kuafor");

  const payload = jwt.decode(body.token);
  assert.equal(payload.role, "admin");
  assert.equal(payload.businessId, body.business.id);

  // Yeni işletmenin herkese açık sayfası hemen kullanılabilir olmalı.
  const publicRes = await fetch(`${baseUrl}/api/public/business/yeni-kuafor`);
  assert.equal(publicRes.status, 200);
  const publicBody = await publicRes.json();
  assert.equal(publicBody.businessName, "Yeni Kuaför");

  // Dönen token gerçekten bu işletmenin panelinde işe yarıyor mu?
  const meRes = await fetch(`${baseUrl}/api/settings`, {
    headers: { Authorization: `Bearer ${body.token}` },
  });
  assert.equal(meRes.status, 200);
  const settings = await meRes.json();
  assert.equal(settings.businessName, "Yeni Kuaför");
});

test("aynı isimli iki işletme farklı slug alır", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const first = await register(baseUrl, { username: "kullanici1" });
  const second = await register(baseUrl, { username: "kullanici2" });
  const firstBody = await first.json();
  const secondBody = await second.json();

  assert.equal(firstBody.business.slug, "yeni-kuafor");
  assert.equal(secondBody.business.slug, "yeni-kuafor-2");
});

test("kullanıcı adı sistemde başka bir işletmede zaten varsa kayıt reddedilir", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  await register(baseUrl, { username: "ortakisim" });
  const res = await register(baseUrl, {
    businessName: "Başka İşletme",
    username: "ortakisim",
  });
  assert.equal(res.status, 409);
});

test("seed admin kullanıcı adıyla ('admin') yeni kayıt açılamaz", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const res = await register(baseUrl, { username: "admin" });
  assert.equal(res.status, 409);
});

test("eksik/geçersiz alanlarla kayıt 400 döner", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const res = await register(baseUrl, {
    businessName: "A",
    username: "ab",
    password: "123",
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.errors.length, 3);
});

test("yeni işletmenin admin'i sadece kendi verisini görür (mevcut izolasyonla uyumlu)", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const res = await register(baseUrl);
  const { token } = await res.json();

  const listRes = await fetch(`${baseUrl}/api/appointments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await listRes.json();
  assert.equal(list.length, 0, "yeni işletmenin randevu listesi boş başlamalı");
});
