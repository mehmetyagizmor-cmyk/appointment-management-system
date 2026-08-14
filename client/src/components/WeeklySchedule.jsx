import { useMemo, useState } from "react";

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

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

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function buildHourGrid(workingHours, slotMinutes) {
  let min = Infinity;
  let max = -Infinity;
  for (const key of WEEKDAY_KEYS) {
    const day = workingHours?.[key];
    if (!day || day.closed || !day.open || !day.close) continue;
    min = Math.min(min, toMinutes(day.open));
    max = Math.max(max, toMinutes(day.close));
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    // Varsayılan aralık
    min = 9 * 60;
    max = 18 * 60;
  }
  const step = slotMinutes || 60;
  const hours = [];
  for (let t = min; t < max; t += step) {
    const h = String(Math.floor(t / 60)).padStart(2, "0");
    const m = String(t % 60).padStart(2, "0");
    hours.push(`${h}:${m}`);
  }
  return hours;
}

function isWithinWorkingHours(dateISO, hour, workingHours) {
  const key = WEEKDAY_KEYS[(new Date(`${dateISO}T00:00:00`).getDay() + 6) % 7];
  const day = workingHours?.[key];
  if (!day || day.closed || !day.open || !day.close) return false;
  const t = toMinutes(hour);
  return t >= toMinutes(day.open) && t < toMinutes(day.close);
}

function WeeklySchedule({
  appointments,
  resources,
  workingHours,
  slotMinutes,
  onSlotClick,
  onAppointmentClick,
}) {
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? null);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));

  const activeResourceId = resources.some((r) => r.id === resourceId)
    ? resourceId
    : resources[0]?.id ?? null;

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const hours = useMemo(
    () => buildHourGrid(workingHours, slotMinutes),
    [workingHours, slotMinutes]
  );

  const todayISO = toISODate(new Date());
  const isCurrentWeek = weekDates.some((d) => toISODate(d) === todayISO);

  const getAppointment = (dateISO, hour) => {
    return appointments.find(
      (a) =>
        a.date === dateISO &&
        a.time === hour &&
        Number(a.resourceId) === Number(activeResourceId)
    );
  };

  const handleCellClick = (dateISO, hour) => {
    if (!isWithinWorkingHours(dateISO, hour, workingHours)) return;
    const appointment = getAppointment(dateISO, hour);
    if (appointment) {
      onAppointmentClick?.(appointment);
    } else {
      onSlotClick?.(dateISO, hour, activeResourceId);
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
            {resources.map((r) => (
              <button
                key={r.id}
                className={`chair-tab ${activeResourceId === r.id ? "active" : ""}`}
                onClick={() => setResourceId(r.id)}
              >
                {r.name}
              </button>
            ))}
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

      {resources.length === 0 ? (
        <p className="empty-state">
          Önce Kaynaklar sayfasından en az bir koltuk/personel eklemelisiniz.
        </p>
      ) : hours.length === 0 ? (
        <p className="empty-state">
          Çalışma saatleri tanımlı değil. Ayarlar sayfasından ekleyebilirsiniz.
        </p>
      ) : (
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
                    const withinHours = isWithinWorkingHours(iso, hour, workingHours);
                    return (
                      <td
                        key={iso}
                        onClick={() => handleCellClick(iso, hour)}
                        className={`slot-cell ${
                          !withinHours ? "closed" : appointment ? "booked" : "free"
                        } ${isToday ? "today-col" : ""}`}
                        title={
                          !withinHours
                            ? "Çalışma saatleri dışında"
                            : appointment
                            ? `${appointment.name} — düzenlemek için tıklayın`
                            : "Randevu eklemek için tıklayın"
                        }
                      >
                        {appointment ? (
                          <span className="slot-name">{appointment.name}</span>
                        ) : withinHours ? (
                          <span className="slot-plus">+</span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default WeeklySchedule;
