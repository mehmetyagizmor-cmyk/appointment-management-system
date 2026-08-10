import { useMemo, useState } from "react";

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

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

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Pazar
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDayNumber(date) {
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function formatWeekRange(monday) {
  const sunday = addDays(monday, 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const startLabel = monday.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
  });
  const endLabel = sunday.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

function WeeklySchedule({ appointments, onSlotClick, onAppointmentClick }) {
  const [chair, setChair] = useState(1);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const todayISO = toISODate(new Date());
  const isCurrentWeek = weekDates.some((d) => toISODate(d) === todayISO);

  const getAppointment = (dateISO, hour) => {
    return appointments.find(
      (a) =>
        a.date === dateISO && a.time === hour && Number(a.chair) === chair
    );
  };

  const handleCellClick = (dateISO, hour) => {
    const appointment = getAppointment(dateISO, hour);
    if (appointment) {
      onAppointmentClick?.(appointment);
    } else {
      onSlotClick?.(dateISO, hour, chair);
    }
  };

  return (
    <div className="schedule">
      <div className="schedule-header">
        <div>
          <h2>Haftalık Program</h2>
          <p className="week-range">{formatWeekRange(weekStart)}</p>
        </div>

        <div className="schedule-controls">
          <div className="chair-tabs">
            <button
              className={`chair-tab ${chair === 1 ? "active" : ""}`}
              onClick={() => setChair(1)}
            >
              1. Koltuk
            </button>
            <button
              className={`chair-tab ${chair === 2 ? "active" : ""}`}
              onClick={() => setChair(2)}
            >
              2. Koltuk
            </button>
          </div>

          <div className="week-nav">
            <button
              className="btn btn-ghost"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              aria-label="Önceki hafta"
            >
              ‹
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setWeekStart(getMonday(new Date()))}
              disabled={isCurrentWeek}
            >
              Bugün
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              aria-label="Sonraki hafta"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="schedule-scroll">
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="corner-cell" />
              {weekDates.map((date, i) => {
                const iso = toISODate(date);
                const isToday = iso === todayISO;
                return (
                  <th key={iso} className={isToday ? "day-header today" : "day-header"}>
                    <span className="day-name">{DAY_LABELS[i]}</span>
                    <span className="day-number">{formatDayNumber(date)}</span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <td className="hour-cell">{hour}</td>
                {weekDates.map((date) => {
                  const iso = toISODate(date);
                  const appointment = getAppointment(iso, hour);
                  const isToday = iso === todayISO;
                  return (
                    <td
                      key={iso}
                      onClick={() => handleCellClick(iso, hour)}
                      className={`slot-cell ${appointment ? "booked" : "free"} ${
                        isToday ? "today-col" : ""
                      }`}
                      title={
                        appointment
                          ? `${appointment.name} — düzenlemek için tıklayın`
                          : "Randevu eklemek için tıklayın"
                      }
                    >
                      {appointment ? (
                        <span className="slot-name">{appointment.name}</span>
                      ) : (
                        <span className="slot-plus">+</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WeeklySchedule;
