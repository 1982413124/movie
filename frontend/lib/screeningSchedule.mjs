import { cinemaToday, formatCinemaDate, isDateId } from "./cinemaDate.mjs";
import { findScreening, movieDetail } from "./seatSelection.mjs";

/** Keep the calendar inside both the published schedule and the film/booking window. */
export function getCalendarDays(screenings, { from, to, releaseDate, endDate } = {}) {
  const counts = new Map();
  for (const screening of screenings) {
    if (screening.movieId !== movieDetail.id || !isDateId(screening.dateId)) continue;
    counts.set(screening.dateId, (counts.get(screening.dateId) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dateId, screeningCount]) => ({
    dateId, screeningCount,
    selectable: (!from || dateId >= from) && (!to || dateId <= to) && (!releaseDate || dateId >= releaseDate) && (!endDate || dateId <= endDate),
  }));
}

export function getScreeningStatus(screening, remainingSeats, now = new Date()) {
  const startsAt = new Date(screening.dateId + "T" + screening.startTime + ":00+09:00");
  if (startsAt <= now) return { status: "closed", bookable: false, availabilityLabel: "受付終了", availabilitySymbol: "−" };
  if (screening.salesStartAt && new Date(screening.salesStartAt) > now) {
    return { status: "not-on-sale", bookable: false, availabilityLabel: "販売開始前", availabilitySymbol: "時計" };
  }
  if (remainingSeats <= 0) return { status: "sold-out", bookable: false, availabilityLabel: "完売", availabilitySymbol: "×" };
  if (remainingSeats <= Math.max(20, Math.floor(screening.capacity * 0.1))) {
    return { status: "few", bookable: true, availabilityLabel: "残り" + remainingSeats + "席", availabilitySymbol: "△" };
  }
  return { status: "available", bookable: true, availabilityLabel: "空席あり", availabilitySymbol: "○" };
}

/** @returns {import("./screeningScheduleTypes").ScheduleResponse} */
export function buildScheduleResponse({ catalog, dateId, reservedByScreening = {}, now = new Date(), movie = movieDetail }) {
  const today = cinemaToday(now);
  const sortedDates = [...new Set(catalog.map((screening) => screening.dateId))].sort();
  const bookingWindow = { from: today, to: sortedDates.at(-1) ?? today };
  const dates = getCalendarDays(catalog, { ...bookingWindow, releaseDate: movie.releaseDate, endDate: movie.endDate });
  const selectedDate = dateId || dates.find((date) => date.selectable)?.dateId || today;
  const selectable = dates.some((date) => date.dateId === selectedDate && date.selectable);
  const screenings = selectable ? catalog
    .filter((screening) => screening.movieId === movie.id && screening.dateId === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.screenId.localeCompare(b.screenId, undefined, { numeric: true }))
    .map((screening) => {
      const reserved = new Set(reservedByScreening[screening.id] ?? []);
      const remainingSeats = Math.max(0, screening.capacity - reserved.size);
      return { ...screening, remainingSeats, ...getScreeningStatus(screening, remainingSeats, now) };
    }) : [];
  return { today, selectedDate, bookingWindow, dates, screenings };
}

/** @param {import("./screeningScheduleTypes").ReservationDraft | null} draft */
export function restoreBookingSelection(draft, savedSelection) {
  if (savedSelection && isDateId(savedSelection.dateId)) {
    return { dateId: savedSelection.dateId, screeningId: typeof savedSelection.screeningId === "string" ? savedSelection.screeningId : null };
  }
  if (!draft?.screeningId || (draft.movieId && draft.movieId !== movieDetail.id)) return null;
  const screening = findScreening(draft.screeningId);
  const dateId = draft.screeningDate ?? screening?.dateId;
  if (!screening || !isDateId(dateId)) return null;
  const stableId = "scr-" + dateId + "-" + screening.screenId.replace("screen-", "s") + "-" + screening.startTime.replace(":", "");
  return { dateId, screeningId: stableId };
}

/** @param {import("./screeningScheduleTypes").Screening} screening
 * @param {import("./screeningScheduleTypes").ReservationDraft | null} previous */
export function buildScreeningDraft(screening, previous = null) {
  const restored = restoreBookingSelection(previous, null);
  const sameScreening = restored?.screeningId === screening.id && previous?.movieId === movieDetail.id;
  const base = sameScreening ? previous : { seatIds: [], ticketTypes: [], ticketCount: 0, ticketTotalPrice: 0, foodItems: [], foodTotalPrice: 0, totalPrice: 0 };
  return {
    ...base,
    movieId: movieDetail.id, movieTitle: movieDetail.title, movieDurationMinutes: movieDetail.durationMinutes,
    screeningId: screening.id, screeningDate: screening.dateId, selectedDate: screening.dateId,
    screeningTime: screening.startTime, startTime: screening.startTime, endTime: screening.endTime, endDayOffset: screening.endDayOffset,
    screenId: screening.screenId, screenName: screening.screenName, screenCapacity: screening.capacity, theaterName: screening.theaterName,
  };
}

export function bookingDateLabel(dateId) {
  return formatCinemaDate(dateId, true);
}
