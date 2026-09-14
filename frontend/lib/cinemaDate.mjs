const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

export function isDateId(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function cinemaToday(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addCinemaDays(dateId, offset) {
  if (!isDateId(dateId)) throw new RangeError("Invalid cinema date");
  const date = new Date(dateId + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function cinemaDateParts(dateId) {
  if (!isDateId(dateId)) throw new RangeError("Invalid cinema date");
  const date = new Date(dateId + "T00:00:00Z");
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), weekday: date.getUTCDay(), dayLabel: weekdays[date.getUTCDay()] };
}

export function formatCinemaDate(dateId, long = false) {
  const { year, month, day, dayLabel } = cinemaDateParts(dateId);
  return long ? year + "年" + month + "月" + day + "日（" + dayLabel + "）" : month + "/" + day + "(" + dayLabel + ")";
}

export function screeningEnd(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const total = hours * 60 + minutes + durationMinutes;
  return { endTime: String(Math.floor(total / 60) % 24).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0"), endDayOffset: Math.floor(total / 1440) };
}

export function calendarCells(monthId) {
  const first = monthId + "-01";
  const { year, month, weekday } = cinemaDateParts(first);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((weekday + daysInMonth) / 7) * 7 }, (_, index) => addCinemaDays(first, index - weekday));
}
