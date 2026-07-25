const express = require("express");
const cors = require("cors");

console.log("SERVER DOSYASI ÇALIŞTI");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
let appointments = [
  {
    id: 1,
    name: "Yağız",
    date: "2026-07-21",
    time: "14:00",
    chair: 1,
  },
];
app.get("/", (req, res) => {
  res.send("Server is running!");
});
app.get("/appointments", (req, res) => {
  res.json(appointments);
});
app.post("/appointments", (req, res) => {
  console.log("REQ BODY:", req.body);
  const newAppointment = {
    id: appointments.length + 1,
    ...req.body,
  };

  appointments.push(newAppointment);

  res.status(201).json(newAppointment);
});

app.delete("/appointments/:id", (req, res) => {
  const id = parseInt(req.params.id);

  console.log("Deleting ID:", id);

  appointments = appointments.filter(
    (appointment) => appointment.id !== id
  );

  console.log("Remaining appointments:", appointments);

  res.status(200).json({
    message: "Appointment deleted successfully!",
    appointments,
  });
});
app.put("/appointments/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const updatedAppointment = req.body;

  const index = appointments.findIndex(
    (appointment) => appointment.id === id
  );

  if (index === -1) {
    return res.status(404).json({
      message: "Appointment not found!",
    });
  }

  appointments[index] = {
    ...appointments[index],
    ...updatedAppointment,
  };

  res.json({
    message: "Appointment updated successfully!",
    appointment: appointments[index],
  });
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});