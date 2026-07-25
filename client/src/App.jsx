import { useEffect, useState } from "react";
import WeeklySchedule from "./components/WeeklySchedule";

function App() {
  const [appointments, setAppointments] = useState([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [chair, setChair] = useState(1);

  useEffect(() => {
    fetch("http://localhost:5000/appointments")
      .then((response) => response.json())
      .then((data) => setAppointments(data))
      .catch((error) => console.error(error));
  }, []);

  const addAppointment = async () => {
    if (!name || !date || !time) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          date,
          time,
          chair,
        }),
      });

      const newAppointment = await response.json();

      console.log(newAppointment);

      setAppointments([...appointments, newAppointment]);

      setName("");
      setDate("");
      setTime("");
    } catch (error) {
      console.error(error);
    }
  };
const updateAppointment = async () => {
console.log(editingId);
const response = await fetch(
  `http://localhost:5000/appointments/${editingId}`,
  {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      date,
      time,
      chair,
    }),
  }
);
const updatedAppointment = await response.json();

console.log(updatedAppointment);
const getResponse = await fetch("http://localhost:5000/appointments");
const data = await getResponse.json();

setAppointments(data);
setEditingId(null);
setName("");
setDate("");
setTime("");
};
 const deleteAppointment = async (id) => {
  try {
    await fetch(`http://localhost:5000/appointments/${id}`, {
      method: "DELETE",
    });

    const response = await fetch("http://localhost:5000/appointments");
    const data = await response.json();

    setAppointments(data);
  } catch (error) {
    console.error(error);
  }
};

  return (
    <div>
      <h1>Appointment Management System</h1>

      <div>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <select
  value={chair}
  onChange={(e) => setChair(Number(e.target.value))}
>
  <option value={1}>Chair 1</option>
  <option value={2}>Chair 2</option>
</select>
       
        <button onClick={editingId ? updateAppointment : addAppointment}>
  {editingId ? "Update Appointment" : "Add Appointment"}
</button>
      </div>

      <h2>Appointments</h2>

      {appointments.map((appointment) => (
        <div key={appointment.id}>
          <h3>{appointment.name}</h3>
          <p>Date: {appointment.date}</p>
          <p>Time: {appointment.time}</p>
          <p>Chair: {appointment.chair}</p>
         <button
  onClick={() => {
    setEditingId(appointment.id);
    setName(appointment.name);
    setDate(appointment.date);
    setTime(appointment.time);
    setChair(appointment.chair);
  }}
>
  Edit
</button>
          <button onClick={() => deleteAppointment(appointment.id)}>
            Delete
          </button>

          <hr />
        </div>
      ))}
      <WeeklySchedule />
    </div>
  );
}
export default App;