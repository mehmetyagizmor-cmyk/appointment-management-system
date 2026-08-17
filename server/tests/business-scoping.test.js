// Faz 2: kaynaklar/hizmetler taraması + işletmeye özel herkese açık sayfalar.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createTestApp, startServer, adminLogin, createSecondBusiness } = require("./helpers/app");

function futureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

test("bir işletmenin admin'i başka işletmenin kaynaklarını/hizmetlerini göremez ve değiştiremez", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const biz2 = createSecondBusiness(ta.db);
  const biz2Token = await adminLogin(baseUrl, biz2.adminUsername, biz2.adminPassword);
  const biz2Headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${biz2Token}`,
  };

  // Liste: işletme 1'in seed kaynakları/hizmetleri görünmemeli, sadece kendisininki.
  const resourcesRes = await fetch(`${baseUrl}/api/resources`, { headers: biz2Headers });
  const resources = await resourcesRes.json();
  assert.equal(resources.length, 1);
  assert.equal(resources[0].id, biz2.resourceId);

  const servicesRes = await fetch(`${baseUrl}/api/services`, { headers: biz2Headers });
  const services = await servicesRes.json();
  assert.equal(services.length, 1);
  assert.equal(services[0].id, biz2.serviceId);

  // İşletme 1'in bootstrap kaynağının id'si (seed'den 1) — doğrudan tahmin ederek erişim denemesi.
  const updateRes = await fetch(`${baseUrl}/api/resources/1`, {
    method: "PUT",
    headers: biz2Headers,
    body: JSON.stringify({ name: "Ele Geçirilmeye Çalışıldı" }),
  });
  assert.equal(updateRes.status, 404);

  const deleteRes = await fetch(`${baseUrl}/api/resources/1`, {
    method: "DELETE",
    headers: biz2Headers,
  });
  assert.equal(deleteRes.status, 404);

  const serviceUpdateRes = await fetch(`${baseUrl}/api/services/1`, {
    method: "PUT",
    headers: biz2Headers,
    body: JSON.stringify({ name: "Ele Geçirilmeye Çalışıldı" }),
  });
  assert.equal(serviceUpdateRes.status, 404);
});

test("admin başka işletmenin kaynağıyla randevu oluşturamaz (kaynak sahiplik kontrolü)", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const biz2 = createSecondBusiness(ta.db);
  const biz1Token = await adminLogin(baseUrl);

  const res = await fetch(`${baseUrl}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${biz1Token}` },
    body: JSON.stringify({
      name: "Yanlış İşletme Denemesi",
      phone: "05551239999",
      date: futureDate(15),
      time: "10:00",
      resourceId: biz2.resourceId, // başka işletmenin kaynağı
      serviceId: biz2.serviceId,
    }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.errors.some((e) => e.includes("işletmeye ait değil")));
});

test("/api/public/business/:slug doğru işletmenin verisini döner, olmayan slug 404", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const biz2 = createSecondBusiness(ta.db);

  const res = await fetch(`${baseUrl}/api/public/business/${biz2.slug}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.businessName, "İkinci İşletme");
  assert.equal(body.resources.length, 1);
  assert.equal(body.resources[0].id, biz2.resourceId);

  const notFoundRes = await fetch(`${baseUrl}/api/public/business/olmayan-slug`);
  assert.equal(notFoundRes.status, 404);

  // Varsayılan (slug'sız) uç hâlâ işletme 1'i döndürüyor — geriye dönük uyum.
  const defaultRes = await fetch(`${baseUrl}/api/public/business`);
  const defaultBody = await defaultRes.json();
  assert.equal(defaultBody.businessName, "Vitrin Kuaför Stüdyosu");
});

test("ikinci işletmenin sayfasından alınan misafir randevusu doğru işletmeye yazılır ve ilk işletmeyi etkilemez", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const biz2 = createSecondBusiness(ta.db);
  const date = futureDate(16);

  const bookRes = await fetch(`${baseUrl}/api/public/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "İkinci İşletme Müşterisi",
      phone: "05559991111",
      date,
      time: "09:00",
      resourceId: biz2.resourceId,
      serviceId: biz2.serviceId,
    }),
  });
  assert.equal(bookRes.status, 201);

  const biz2Token = await adminLogin(baseUrl, biz2.adminUsername, biz2.adminPassword);
  const biz2List = await (
    await fetch(`${baseUrl}/api/appointments`, {
      headers: { Authorization: `Bearer ${biz2Token}` },
    })
  ).json();
  assert.equal(biz2List.length, 1);
  assert.equal(biz2List[0].phone, "05559991111");

  const biz1Token = await adminLogin(baseUrl);
  const biz1List = await (
    await fetch(`${baseUrl}/api/appointments`, {
      headers: { Authorization: `Bearer ${biz1Token}` },
    })
  ).json();
  assert.ok(!biz1List.some((a) => a.phone === "05559991111"));
});

test("aynı telefon numarası farklı işletmelerde aynı anda aktif randevuya sahip olabilir", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const biz2 = createSecondBusiness(ta.db);
  const biz1 = await (await fetch(`${baseUrl}/api/public/business`)).json();
  const phone = "05553332222";
  const date = futureDate(17);

  const firstBiz1 = await fetch(`${baseUrl}/api/public/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Çift İşletme Müşterisi",
      phone,
      date,
      time: "09:00",
      resourceId: biz1.resources[0].id,
      serviceId: biz1.services[0].id,
    }),
  });
  assert.equal(firstBiz1.status, 201);

  // Aynı telefon, İKİNCİ işletmede de aktif randevu alabilmeli (farklı işletme, farklı hesap).
  const secondBiz2 = await fetch(`${baseUrl}/api/public/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Çift İşletme Müşterisi",
      phone,
      date,
      time: "11:00",
      resourceId: biz2.resourceId,
      serviceId: biz2.serviceId,
    }),
  });
  assert.equal(secondBiz2.status, 201);
});
