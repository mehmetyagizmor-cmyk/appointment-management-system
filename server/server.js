const express = require("express");
const cors = require("cors");

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
  },
];

app.get("/", (req, res) => {
  res.send("Server is running!");
});
app.get("/appointments", (req, res) => {
  res.json(appointments);
});
app.post("/appointments", (req, res) => {
  const newAppointment = req.body;

  appointments.push(newAppointment);

  res.status(201).json({
    message: "Appointment added successfully!",
    appointment: newAppointment,
  });
});
app.delete("/appointments/:id", (req, res) => {
  const id = parseInt(req.params.id);

  appointments = appointments.filter(
    (appointment) => appointment.id !== id
  );

  res.json({
    message: "Appointment deleted successfully!",
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