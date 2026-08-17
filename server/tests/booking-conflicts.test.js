const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createTestApp, startServer } = require("./helpers/app");

function nextWeekdayISO(targetDow, minDaysAhead = 21) {
  const d = new Date();
  d.setDate(d.getDate() + minDaysAhead);
  while (d.getDay() !== targetDow) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function getBusiness(baseUrl) {
  return (await fetch(`${baseUrl}/api/public/business`)).json();
}

test("herkese açık randevu başarıyla oluşturulur", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const business = await getBusiness(baseUrl);
  const date = nextWeekdayISO(2); // Salı

  const res = await fetch(`${baseUrl}/api/public/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Ayşe Yılmaz",
      phone: "05551112233",
      date,
      time: "10:00",
      resourceId: business.resources[0].id,
      serviceId: business.services[0].id,
    }),
  });
  assert.equal(res.status, 201);
});

test("aynı kaynak+tarih+saat için ikinci randevu 409 ile reddedilir", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const business = await getBusiness(baseUrl);
  const date = nextWeekdayISO(2);
  const payload = {
    date,
    time: "11:00",
    resourceId: business.resources[0].id,
    serviceId: business.services[0].id,
  };

  const first = await fetch(`${baseUrl}/api/public/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, name: "Birinci Müşteri", phone: "05551110001" }),
  });
  assert.equal(first.status, 201);

  const second = await fetch(`${baseUrl}/api/public/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, name: "İkinci Müşteri", phone: "05551110002" }),
  });
  assert.equal(second.status, 409);
});

test("aynı telefonun ikinci aktif randevusu reddedilir (farklı saat olsa da)", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const business = await getBusiness(baseUrl);
  const date = nextWeekdayISO(3); // Çarşamba
  const phone = "05553334455";

  const first = await fetch(`${baseUrl}/api/public/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Tekrarlayan Müşteri",
      phone,
      date,
      time: "09:00",
      resourceId: business.resources[0].id,
      serviceId: business.services[0].id,
    }),
  });
  assert.equal(first.status, 201);

  const second = await fetch(`${baseUrl}/api/public/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Tekrarlayan Müşteri",
      phone,
      date,
      time: "13:00", // farklı saat, ama aynı telefonun zaten aktif randevusu var
      resourceId: business.resources[0].id,
      serviceId: business.services[0].id,
    }),
  });
  assert.equal(second.status, 409);
});

test("geçersiz telefon numarasıyla randevu reddedilir", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const business = await getBusiness(baseUrl);
  const date = nextWeekdayISO(4);

  const res = await fetch(`${baseUrl}/api/public/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Geçersiz Telefon",
      phone: "123",
      date,
      time: "10:00",
      resourceId: business.resources[0].id,
      serviceId: business.services[0].id,
    }),
  });
  assert.equal(res.status, 400);
});
