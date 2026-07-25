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
import { useState } from "react";
function WeeklySchedule() {
  const [chair, setChair] = useState(1);
  return (
    <div style={{ marginTop: "40px" }}>
      <h2>Weekly Schedule</h2>
       <div style={{ marginBottom: "20px" }}>
  <button onClick={() => setChair(1)}>
    Chair 1
  </button>

  <button
    onClick={() => setChair(2)}
    style={{ marginLeft: "10px" }}
  >
    Chair 2
  </button>

  <h3>Selected Chair: {chair}</h3>
</div>
      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Day</th>

            {hours.map((hour) => (
              <th key={hour}>{hour}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {days.map((day) => (
            <tr key={day}>
              <td><b>{day}</b></td>

              {hours.map((hour) => (
                <td key={hour}></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WeeklySchedule;