import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

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

/**
 * Müşteri tarafı için berber panelindeki "gün / saat" haftalık program
 * görünümünün aynısı: satırlarda saatler, sütunlarda günler. Boş bir hücreye
 * tıklanınca ilgili tarih ve saat seçilir.
 */
function PublicWeeklySchedule({ resourceId, workingHours, slotMinutes, value, onSelect }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(false);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const hours = useMemo(
    () => buildHourGrid(workingHours, slotMinutes),
    [workingHours, slotMinutes]
  );

  const todayISO = toISODate(new Date());
  const currentMonday = useMemo(() => getMonday(new Date()), []);
  const isCurrentWeek = weekDates.some((d) => toISODate(d) === todayISO);
  const canGoPrev = weekStart > currentMonday;

  useEffect(() => {
    if (!resourceId) return;
    let cancelled = false;

    async function loadWeek() {
      setLoading(true);
      try {
        const results = await Promise.all(
          weekDates.map((d) => {
            const iso = toISODate(d);
            return api
              .get(`/api/public/slots?date=${iso}&resourceId=${resourceId}`, { auth: false })
              .then((data) => [iso, new Set(data.slots || [])])
              .catch(() => [iso, new Set()]);
          })
        );
        if (!cancelled) {
          const map = {};
          results.forEach(([iso, set]) => {
            map[iso] = set;
          });
          setAvailability(map);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWeek();
    return () => {
      cancelled = true;
    };
  }, [resourceId, weekStart, weekDates]);

  function getStatus(dateISO, hour) {
    if (!isWithinWorkingHours(dateISO, hour, workingHours)) return "closed";
    const free = availability[dateISO]?.has(hour);
    return free ? "free" : "booked";
  }

  function handleCellClick(dateISO, hour) {
    if (getStatus(dateISO, hour) !== "free") return;
    onSelect?.(dateISO, hour);
  }

  return (
    <div className="schedule public-schedule">
      <div className="schedule-header">
        <div>
          <p className="week-range">{formatWeekRange(weekStart)}</p>
        </div>

        <div className="schedule-controls">
          <div className="week-nav">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              disabled={!canGoPrev}
              aria-label="Önceki hafta"
            >
              ‹
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setWeekStart(getMonday(new Date()))}
              disabled={isCurrentWeek}
            >
              Bugün
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              aria-label="Sonraki hafta"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {hours.length === 0 ? (
        <p className="empty-state">Çalışma saatleri tanımlı değil.</p>
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
                    const status = getStatus(iso, hour);
                    const isToday = iso === todayISO;
                    const isSelected = value?.date === iso && value?.time === hour;
                    return (
                      <td
                        key={iso}
                        onClick={() => handleCellClick(iso, hour)}
                        className={`slot-cell ${status} ${isSelected ? "selected" : ""} ${
                          isToday ? "today-col" : ""
                        }`}
                        title={
                          status === "closed"
                            ? "Bu saat müsait değil"
                            : status === "booked"
                            ? "Bu saat dolu"
                            : "Bu saati seçmek için tıklayın"
                        }
                      >
                        {status === "free" ? (
                          <span className="slot-plus">{isSelected ? "✓" : "+"}</span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <p className="empty-state schedule-loading">Müsaitlik yükleniyor…</p>
          )}
        </div>
      )}
    </div>
  );
}

export default PublicWeeklySchedule;
