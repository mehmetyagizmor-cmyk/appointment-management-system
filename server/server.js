const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Basit istek günlüğü
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString("tr-TR")}  ${req.method} ${req.url}`);
  next();
});

let appointments = [
  { id: 1, name: "Yağız", date: "2026-07-21", time: "14:00", chair: 1 },
];

const VALID_CHAIRS = [1, 2];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:MM

// ---------- Yardımcı fonksiyonlar ----------

function nextId() {
  return appointments.length === 0
    ? 1
    : Math.max(...appointments.map((a) => a.id)) + 1;
}

function sortAppointments(list) {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
}

function validateAppointmentPayload(body) {
  const errors = [];
  const { name, date, time, chair } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    errors.push("İsim boş olamaz.");
  }

  if (!date || isNaN(new Date(date).getTime())) {
    errors.push("Geçerli bir tarih giriniz.");
  }

  if (!time || !TIME_PATTERN.test(time)) {
    errors.push("Saat HH:MM formatında olmalı.");
  }

  const chairNum = Number(chair);
  if (!VALID_CHAIRS.includes(chairNum)) {
    errors.push("Koltuk 1 veya 2 olmalı.");
  }

  return errors;
}

function findConflict({ date, time, chair }, excludeId = null) {
  return appointments.find(
    (a) =>
      a.date === date &&
      a.time === time &&
      Number(a.chair) === Number(chair) &&
      a.id !== excludeId
  );
}

// ---------- Route'lar ----------

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.get("/appointments", (req, res) => {
  res.json(sortAppointments(appointments));
});

app.post("/appointments", (req, res) => {
  const errors = validateAppointmentPayload(req.body);
  if (errors.length) {
    return res.status(400).json({ message: "Doğrulama hatası", errors });
  }

  const payload = {
    name: req.body.name.trim(),
    date: req.body.date,
    time: req.body.time,
    chair: Number(req.body.chair),
  };

  const conflict = findConflict(payload);
  if (conflict) {
    return res.status(409).json({
      message: `Bu koltuk ${payload.date} tarihinde saat ${payload.time} için zaten dolu.`,
    });
  }

  const newAppointment = { id: nextId(), ...payload };
  appointments.push(newAppointment);

  res.status(201).json(newAppointment);
});

app.put("/appointments/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = appointments.findIndex((a) => a.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Randevu bulunamadı." });
  }

  const errors = validateAppointmentPayload(req.body);
  if (errors.length) {
    return res.status(400).json({ message: "Doğrulama hatası", errors });
  }

  const payload = {
    name: req.body.name.trim(),
    date: req.body.date,
    time: req.body.time,
    chair: Number(req.body.chair),
  };

  const conflict = findConflict(payload, id);
  if (conflict) {
    return res.status(409).json({
      message: `Bu koltuk ${payload.date} tarihinde saat ${payload.time} için zaten dolu.`,
    });
  }

  appointments[index] = { ...appointments[index], ...payload };

  res.json({
    message: "Randevu güncellendi.",
    appointment: appointments[index],
  });
});

app.delete("/appointments/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const exists = appointments.some((a) => a.id === id);

  if (!exists) {
    return res.status(404).json({ message: "Randevu bulunamadı." });
  }

  appointments = appointments.filter((a) => a.id !== id);

  res.status(200).json({
    message: "Randevu silindi.",
    appointments: sortAppointments(appointments),
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
