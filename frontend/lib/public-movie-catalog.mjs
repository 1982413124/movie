import { cinemaToday, formatCinemaDate } from "./cinemaDate.mjs";
import { getScreeningStatus } from "./screeningSchedule.mjs";

const releaseStatuses = { NOW_SHOWING: "showing", COMING_SOON: "upcoming", ENDED: "ended", UNSCHEDULED: "unscheduled" };

/** @param {import("./cinema-types").Showing} showing */
export function showingHasStarted(showing, now = new Date()) {
  return new Date(`${showing.show_date}T${showing.start_time}+09:00`).getTime() <= now.getTime();
}

/** @param {import("./cinema-types").Movie} movie
 * @param {import("./cinema-types").Showing[]} showings
 * @returns {import("../app/data/movieCatalog").MovieCardData} */
export function toMovieCard(movie, showings = [], now = new Date()) {
  const future = showings.filter(showing => showing.movie_id === movie.id && !showingHasStarted(showing, now));
  const timeBands = [...new Set(future.map(showing => {
    const hour = Number(showing.start_time.slice(0, 2));
    return hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 20 ? "evening" : "late";
  }))];
  const detailHref = `/movie-detail?movieId=${encodeURIComponent(movie.id)}`;
  return {
    id: movie.id, title: movie.title, genre: movie.genre || "ジャンル未設定", runtime: `${movie.duration_minutes}min`,
    rating: "", schedule: movie.screening_start || "上映期間未設定", screen: "", accent: "#d92323",
    imageSrc: movie.poster_image || "", imageAlt: `${movie.title}のポスター`, ageRating: movie.age_rating || "",
    releaseStatus: releaseStatuses[movie.status], format: null, timeBand: timeBands[0] ?? null, timeBands,
    isToday: future.some(showing => showing.show_date === cinemaToday(now)), foodPreorder: future.length > 0,
    detailHref, bookingHref: future.length ? detailHref : undefined,
  };
}

/** @param {import("./cinema-types").Showing} showing
 * @returns {import("./screeningScheduleTypes").Screening} */
export function toScreening(showing, now = new Date()) {
  const remainingSeats = Math.max(0, showing.capacity - showing.reserved_count);
  const screening = {
    id: showing.id, movieId: showing.movie_id, label: showing.start_time.slice(0, 5),
    startTime: showing.start_time.slice(0, 5), endTime: showing.end_time.slice(0, 5), endDayOffset: 0,
    dateId: showing.show_date, dateLabel: formatCinemaDate(showing.show_date, true),
    screenId: showing.screen_id, screenName: showing.screen_name, theaterName: showing.theater_name,
    capacity: showing.capacity, remainingSeats,
  };
  return { ...screening, ...getScreeningStatus(screening, remainingSeats, now) };
}

/** @param {{ movie: import("./cinema-types").Movie, showings: import("./cinema-types").Showing[] }} detail
 * @returns {import("./screeningScheduleTypes").ScheduleResponse} */
export function toMovieSchedule(detail, dateId, now = new Date()) {
  const today = cinemaToday(now);
  const screenings = detail.showings.filter(showing => showing.movie_id === detail.movie.id && showing.show_date >= today)
    .map(showing => toScreening(showing, now)).sort((a, b) => a.dateId.localeCompare(b.dateId) || a.startTime.localeCompare(b.startTime));
  const dates = [...new Set(screenings.map(screening => screening.dateId))].map(dateId => ({
    dateId, screeningCount: screenings.filter(screening => screening.dateId === dateId).length, selectable: true,
  }));
  const selectedDate = dateId || dates[0]?.dateId || today;
  return { movie: detail.movie, today, selectedDate, bookingWindow: { from: today, to: dates.at(-1)?.dateId || today },
    dates, screenings: screenings.filter(screening => screening.dateId === selectedDate) };
}

/** @param {import("./screeningScheduleTypes").Screening} screening
 * @param {import("./cinema-types").Movie} movie
 * @param {import("./screeningScheduleTypes").ReservationDraft | null} previous */
export function buildCatalogScreeningDraft(screening, movie, previous = null) {
  const same = previous?.screeningId === screening.id && previous.movieId === movie.id;
  return {
    ...(same ? previous : { seatIds: [], seatLabels: [], ticketTypes: [], ticketCount: 0, ticketTotalPrice: 0, foodItems: [], foodTotalPrice: 0, totalPrice: 0 }),
    movieId: movie.id, movieTitle: movie.title, movieDurationMinutes: movie.duration_minutes, moviePoster: movie.poster_image,
    screeningId: screening.id, screeningDate: screening.dateId, selectedDate: screening.dateId,
    screeningTime: screening.startTime, startTime: screening.startTime, endTime: screening.endTime, endDayOffset: screening.endDayOffset,
    screenId: screening.screenId, screenName: screening.screenName, screenCapacity: screening.capacity, theaterName: screening.theaterName,
  };
}
