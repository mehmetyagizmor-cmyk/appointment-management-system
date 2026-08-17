const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createTestApp, startServer } = require("./helpers/app");

// Seed randevularıyla çakışmayı önlemek için testler bugünden yeterince uzak,
// bilinen bir haftaiçi/haftasonu gününü hesaplayarak kullanır.
function nextWeekdayISO(targetDow, minDaysAhead = 14) {
  const d = new Date();
  d.setDate(d.getDate() + minDaysAhead);
  while (d.getDay() !== targetDow) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

test("boş saatler işletme çalışma saatlerine göre üretilir", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const business = await (await fetch(`${baseUrl}/api/public/business`)).json();
  const resourceId = business.resources[0].id;
  const monday = nextWeekdayISO(1); // Pazartesi, 09:00-18:00, 60 dk aralık -> 9 slot

  const res = await fetch(`${baseUrl}/api/public/slots?date=${monday}&resourceId=${resourceId}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.slots, [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
  ]);
});

test("kapalı gün (pazar) için boş liste döner", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const business = await (await fetch(`${baseUrl}/api/public/business`)).json();
  const resourceId = business.resources[0].id;
  const sunday = nextWeekdayISO(0);

  const res = await fetch(`${baseUrl}/api/public/slots?date=${sunday}&resourceId=${resourceId}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.slots, []);
});

test("randevu alınan saat sonraki sorguda boş saatler arasında görünmez", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const business = await (await fetch(`${baseUrl}/api/public/business`)).json();
  const resourceId = business.resources[0].id;
  const serviceId = business.services[0].id;
  const monday = nextWeekdayISO(1);

  const bookRes = await fetch(`${baseUrl}/api/public/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Slot Testi",
      phone: "05559998877",
      date: monday,
      time: "09:00",
      resourceId,
      serviceId,
    }),
  });
  assert.equal(bookRes.status, 201);

  const slotsRes = await fetch(
    `${baseUrl}/api/public/slots?date=${monday}&resourceId=${resourceId}`
  );
  const { slots } = await slotsRes.json();
  assert.ok(!slots.includes("09:00"), "dolu saat listede olmamalı");
  assert.equal(slots.length, 8);
});

test("geçersiz tarih formatı 400 döner", async (t) => {
  const ta = createTestApp();
  const { server, baseUrl } = await startServer(ta.app);
  t.after(() => {
    server.close();
    ta.cleanup();
  });

  const business = await (await fetch(`${baseUrl}/api/public/business`)).json();
  const resourceId = business.resources[0].id;

  const res = await fetch(`${baseUrl}/api/public/slots?date=gecersiz&resourceId=${resourceId}`);
  assert.equal(res.status, 400);
});
