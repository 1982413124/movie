import test from "node:test";
import assert from "node:assert/strict";
import { toMovieCard, toMovieSchedule, toScreening, buildCatalogScreeningDraft } from "./public-movie-catalog.mjs";
import { loadScreeningSchedule } from "./screeningScheduleApi.mjs";

const now = new Date("2026-09-13T10:00:00+09:00");
const movie = { id: "movie-chiikawa", title: "映画ちいかわ", duration_minutes: 99, genre: "アニメーション", status: "NOW_SHOWING", poster_image: "/api/cinema/media/cat.webp", age_rating: "G" };
const showing = { id: "show-from-admin", movie_id: movie.id, show_date: "2026-09-13", start_time: "13:00:00", end_time: "14:39:00", screen_id: "screen-6", screen_name: "スクリーン6", theater_name: "HAL CINEMA", capacity: 70, reserved_count: 63 };

test("a newly registered movie appears without a showing, with its own detail link", () => {
  const card = toMovieCard(movie, [], now);
  assert.equal(card.title, movie.title);
  assert.equal(card.imageSrc, movie.poster_image);
  assert.equal(card.detailHref, "/movie-detail?movieId=movie-chiikawa");
  assert.equal(card.releaseStatus, "showing");
  assert.equal(card.bookingHref, undefined);
  assert.equal(card.isToday, false);
  assert.equal(card.format, null);
});

test("discovery filters use registered future showings and exclude other films", () => {
  const other = { ...showing, movie_id: "other", start_time: "20:00:00" };
  const card = toMovieCard(movie, [showing, other, { ...showing, start_time: "09:00:00" }], now);
  assert.deepEqual(card.timeBands, ["afternoon"]);
  assert.equal(card.isToday, true);
  assert.equal(card.bookingHref, card.detailHref);
  assert.equal(toMovieCard({ ...movie, status: "UNSCHEDULED" }, [], now).releaseStatus, "unscheduled");
});

test("the calendar preserves admin showing IDs and real remaining seats", () => {
  const schedule = toMovieSchedule({ movie, showings: [showing, { ...showing, id: "other-film", movie_id: "other" }] }, undefined, now);
  assert.equal(schedule.movie.id, movie.id);
  assert.equal(schedule.dates[0].screeningCount, 1);
  assert.equal(schedule.screenings[0].id, "show-from-admin");
  assert.equal(schedule.screenings[0].remainingSeats, 7);
  assert.equal(schedule.screenings[0].status, "few");
  assert.equal(toScreening({ ...showing, reserved_count: 70 }, now).bookable, false);
});

test("no registered showings never creates a synthetic schedule", () => {
  const schedule = toMovieSchedule({ movie, showings: [] }, undefined, now);
  assert.deepEqual(schedule.dates, []);
  assert.deepEqual(schedule.screenings, []);
});

test("a new movie clears the old seats and food, while the same showing preserves them", () => {
  const screening = toScreening(showing, now);
  const previous = { movieId: "movie-001", screeningId: showing.id, seatIds: ["old-seat"], foodItems: [{ id: "popcorn" }] };
  const draft = buildCatalogScreeningDraft(screening, movie, previous);
  assert.equal(draft.movieTitle, movie.title);
  assert.equal(draft.screeningId, showing.id);
  assert.deepEqual(draft.seatIds, []);
  assert.deepEqual(draft.foodItems, []);
  const saved = { ...draft, seatIds: ["seat-db-id"], foodItems: [{ id: "popcorn" }] };
  assert.deepEqual(buildCatalogScreeningDraft(screening, movie, saved).seatIds, saved.seatIds);
  assert.deepEqual(buildCatalogScreeningDraft(screening, movie, saved).foodItems, saved.foodItems);
});

test("the schedule API loads the selected movie and rejects mismatched responses", async () => {
  let requested;
  const data = await loadScreeningSchedule({ movieId: movie.id, now, apiBaseUrl: "http://backend:5000", fetchImpl: async (url, options) => {
    requested = url;
    assert.equal(options.cache, "no-store");
    return { ok: true, json: async () => ({ movie, showings: [showing] }) };
  } });
  assert.equal(requested, "http://backend:5000/api/movies/movie-chiikawa");
  assert.equal(data.movie.id, movie.id);
  await assert.rejects(loadScreeningSchedule({ movieId: "different", fetchImpl: async () => ({ ok: true, json: async () => ({ movie, showings: [] }) }) }));
});
