const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { createTestApp, startServer, adminLogin } = require("./helpers/app");

test("admin doğru kullanıcı adı/şifre ile giriş yapabilir ve token businessId taşır", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const token = await adminLogin(baseUrl);
  const payload = jwt.decode(token);
  assert.equal(payload.role, "admin");
  assert.equal(typeof payload.businessId, "number");
  assert.ok(payload.businessId > 0);
});

test("admin yanlış şifreyle giriş yapamaz", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "yanlis-sifre" }),
  });
  assert.equal(res.status, 401);
});

test("token olmadan /api/auth/me 401 döner", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const res = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(res.status, 401);
});

test("geçerli token ile /api/auth/me kullanıcı adını döner", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const token = await adminLogin(baseUrl);
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.username, "admin");
});

test("businessId claim'i olmayan (göç öncesi) token reddedilir", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const staleToken = jwt.sign(
    { sub: 1, username: "admin", role: "admin" }, // businessId yok
    process.env.JWT_SECRET
  );
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${staleToken}` },
  });
  assert.equal(res.status, 401);
});

test("uydurma/bozuk token reddedilir", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: "Bearer bozuk.bir.token" },
  });
  assert.equal(res.status, 401);
});

test("müşteri kayıt olup aynı bilgilerle giriş yapabilir", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const registerRes = await fetch(`${baseUrl}/api/customer/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Müşteri",
      phone: "05551234567",
      password: "sifre123",
    }),
  });
  assert.equal(registerRes.status, 201);
  const registerBody = await registerRes.json();
  const registerPayload = jwt.decode(registerBody.token);
  assert.equal(registerPayload.role, "customer");
  assert.equal(typeof registerPayload.businessId, "number");

  const loginRes = await fetch(`${baseUrl}/api/customer/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "05551234567", password: "sifre123" }),
  });
  assert.equal(loginRes.status, 200);
});

test("geçersiz telefonla müşteri kaydı reddedilir", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const res = await fetch(`${baseUrl}/api/customer/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", phone: "123", password: "sifre123" }),
  });
  assert.equal(res.status, 400);
});
