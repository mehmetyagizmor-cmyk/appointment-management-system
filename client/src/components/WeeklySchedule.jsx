import { useState } from "react";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const hours = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

function WeeklySchedule({ appointments }) {
  const [chair, setChair] = useState(1);

  const getAppointment = (day, hour) => {
    return appointments.find((appointment) => {
      const appointmentDay = new Date(appointment.date).toLocaleDateString(
        "en-US",
        { weekday: "long" }
      );

      return (
        appointmentDay === day &&
        appointment.time === hour &&
        appointment.chair === chair
      );
    });
  };

  const handleClick = (appointment) => {
    if (!appointment) return;

    alert(
      `Name: ${appointment.name}
Date: ${appointment.date}
Time: ${appointment.time}
Chair: ${appointment.chair}`
    );
  };

  return (
    <div style={{ marginTop: "40px" }}>
      <h2
        style={{
          textAlign: "center",
          marginBottom: "20px",
          color: "#2c3e50",
          fontSize: "32px",
        }}
      >
        💈 Weekly Appointment Schedule
      </h2>

      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <button
          onClick={() => setChair(1)}
          style={{
            backgroundColor: chair === 1 ? "#3498db" : "#ddd",
            color: chair === 1 ? "white" : "black",
            padding: "10px 20px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          💺 Chair 1
        </button>

        <button
          onClick={() => setChair(2)}
          style={{
            marginLeft: "10px",
            backgroundColor: chair === 2 ? "#3498db" : "#ddd",
            color: chair === 2 ? "white" : "black",
            padding: "10px 20px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          💺 Chair 2
        </button>
      </div>

      <table
        cellPadding="10"
        style={{
          borderCollapse: "collapse",
          margin: "0 auto",
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                backgroundColor: "#2c3e50",
                color: "white",
                padding: "12px",
              }}
            >
              Day
            </th>

            {hours.map((hour) => (
              <th
                key={hour}
                style={{
                  backgroundColor: "#2c3e50",
                  color: "white",
                  padding: "12px",
                }}
              >
                {hour}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {days.map((day) => (
            <tr key={day}>
              <td
                style={{
                  backgroundColor: "#ecf0f1",
                  fontWeight: "bold",
                  textAlign: "center",
                  width: "120px",
                }}
              >
                {day}
              </td>

              {hours.map((hour) => {
                const appointment = getAppointment(day, hour);

                return (
                  <td
                    key={hour}
                    onClick={() => handleClick(appointment)}
                    style={{
                      backgroundColor: appointment ? "#ff6b6b" : "#90ee90",
                      textAlign: "center",
                      fontWeight: "bold",
                      minWidth: "80px",
                      height: "60px",
                      cursor: "pointer",
                      transition: "0.2s",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.opacity = "0.8";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.opacity = "1";
                    }}
                  >
                    {appointment ? appointment.name : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WeeklySchedule;