const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createTestApp, startServer, adminLogin, createSecondBusiness } = require("./helpers/app");

function futureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

async function getBusinessFixtures(baseUrl) {
  return (await fetch(`${baseUrl}/api/public/business`)).json();
}

test("admin randevu oluşturabilir, günceller, siler", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const token = await adminLogin(baseUrl);
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const business = await getBusinessFixtures(baseUrl);
  const date = futureDate(10);

  const createRes = await fetch(`${baseUrl}/api/appointments`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Panelden Eklenen",
      phone: "05559990000",
      date,
      time: "09:00",
      resourceId: business.resources[0].id,
      serviceId: business.services[0].id,
    }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();

  const listRes = await fetch(`${baseUrl}/api/appointments`, { headers: authHeaders });
  const list = await listRes.json();
  assert.ok(list.some((a) => a.id === created.id));

  const updateRes = await fetch(`${baseUrl}/api/appointments/${created.id}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Güncellenmiş İsim",
      date,
      time: "09:00",
      resourceId: business.resources[0].id,
      status: "confirmed",
    }),
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.appointment.name, "Güncellenmiş İsim");

  const deleteRes = await fetch(`${baseUrl}/api/appointments/${created.id}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  assert.equal(deleteRes.status, 200);
  const afterDelete = await deleteRes.json();
  assert.ok(!afterDelete.appointments.some((a) => a.id === created.id));
});

test("aynı kaynak+tarih+saat için admin panelinden ikinci ekleme 409 döner", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const token = await adminLogin(baseUrl);
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const business = await getBusinessFixtures(baseUrl);
  const date = futureDate(11);
  const payload = {
    date,
    time: "14:00",
    resourceId: business.resources[0].id,
    serviceId: business.services[0].id,
  };

  const first = await fetch(`${baseUrl}/api/appointments`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ ...payload, name: "İlk", phone: "05551230001" }),
  });
  assert.equal(first.status, 201);

  const second = await fetch(`${baseUrl}/api/appointments`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ ...payload, name: "İkinci", phone: "05551230002" }),
  });
  assert.equal(second.status, 409);
});

// ---------- Çok işletmeli izolasyon ----------
// Faz 1'in en kritik testi: bir işletmenin admin'i, başka bir işletmenin
// randevularını hiçbir şekilde göremez/değiştiremez/silemez.

test("bir işletmenin admin'i başka işletmenin randevu listesinde hiçbir şey görmez", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  // İşletme #1 (bootstrap/seed) için bir randevu oluştur.
  const biz1Token = await adminLogin(baseUrl);
  const biz1 = await getBusinessFixtures(baseUrl);
  const date = futureDate(12);
  const createRes = await fetch(`${baseUrl}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${biz1Token}` },
    body: JSON.stringify({
      name: "İşletme 1 Müşterisi",
      phone: "05557770000",
      date,
      time: "10:00",
      resourceId: biz1.resources[0].id,
      serviceId: biz1.services[0].id,
    }),
  });
  assert.equal(createRes.status, 201);
  const biz1Appointment = await createRes.json();

  // İkinci işletmeyi ve admin'ini oluştur, onunla giriş yap.
  createSecondBusiness(ta.db);
  const biz2Token = await adminLogin(baseUrl, "admin2", "ikinci123");
  const biz2Headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${biz2Token}`,
  };

  // 1) Liste: işletme 1'in randevusu görünmemeli.
  const listRes = await fetch(`${baseUrl}/api/appointments`, { headers: biz2Headers });
  const list = await listRes.json();
  assert.equal(list.length, 0, "ikinci işletmenin randevu listesi boş olmalı");
  assert.ok(!list.some((a) => a.id === biz1Appointment.id));

  // 2) Doğrudan id ile güncelleme: 404 dönmeli (var olduğunu bile söylememeli).
  const updateRes = await fetch(`${baseUrl}/api/appointments/${biz1Appointment.id}`, {
    method: "PUT",
    headers: biz2Headers,
    body: JSON.stringify({
      name: "Ele Geçirilmeye Çalışıldı",
      date,
      time: "10:00",
      resourceId: biz1.resources[0].id,
    }),
  });
  assert.equal(updateRes.status, 404);

  // 3) Doğrudan id ile silme: 404 dönmeli.
  const deleteRes = await fetch(`${baseUrl}/api/appointments/${biz1Appointment.id}`, {
    method: "DELETE",
    headers: biz2Headers,
  });
  assert.equal(deleteRes.status, 404);

  // 4) İstatistikler: işletme 2'nin sayıları işletme 1'den etkilenmemeli.
  const statsRes = await fetch(`${baseUrl}/api/stats`, { headers: biz2Headers });
  const stats = await statsRes.json();
  assert.equal(stats.totalCustomers, 0);

  // 5) Randevu hâlâ işletme 1'de sapasağlam duruyor (silinmedi/değişmedi).
  const biz1Headers = { Authorization: `Bearer ${biz1Token}` };
  const biz1ListRes = await fetch(`${baseUrl}/api/appointments`, { headers: biz1Headers });
  const biz1List = await biz1ListRes.json();
  const stillThere = biz1List.find((a) => a.id === biz1Appointment.id);
  assert.ok(stillThere);
  assert.equal(stillThere.name, "İşletme 1 Müşterisi");
});

test("ayarlar (settings) da işletmeye göre izole", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  createSecondBusiness(ta.db);
  const biz2Token = await adminLogin(baseUrl, "admin2", "ikinci123");

  const settingsRes = await fetch(`${baseUrl}/api/settings`, {
    headers: { Authorization: `Bearer ${biz2Token}` },
  });
  const settings = await settingsRes.json();
  assert.equal(settings.businessName, "İkinci İşletme");
  assert.notEqual(settings.businessName, "Vitrin Kuaför Stüdyosu");
});
