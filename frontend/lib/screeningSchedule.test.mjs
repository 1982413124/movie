import assert from "node:assert/strict";
import { test } from "node:test";
import { addCinemaDays, calendarCells, cinemaToday, isDateId, screeningEnd } from "./cinemaDate.mjs";
import { createScreenings, createInitialSeatSelection, createSeatMap, findScreening } from "./seatSelection.mjs";
import { buildScheduleResponse, buildScreeningDraft, getCalendarDays, restoreBookingSelection } from "./screeningSchedule.mjs";
import { loadScreeningSchedule } from "./screeningScheduleApi.mjs";
import { fetchReservedSeats } from "./reservationApi.mjs";

const now = new Date("2026-09-29T00:00:00+09:00");
const catalog = createScreenings(now);
const selection = () => buildScheduleResponse({ catalog, dateId: "2026-09-29", now }).screenings[3];

test("cinema days use Japan time across UTC midnight and leap days", () => {
  assert.equal(cinemaToday(new Date("2026-09-28T15:01:00Z")), "2026-09-29");
  assert.equal(addCinemaDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addCinemaDays("2026-12-31", 1), "2027-01-01");
  assert.equal(isDateId("2026-02-29"), false);
  assert.equal(isDateId("2026-13-01"), false);
  assert.deepEqual(screeningEnd("23:15", 120), { endTime: "01:15", endDayOffset: 1 });
});

test("calendar month cells include proper adjacent days at month and year boundaries", () => {
  const cells = calendarCells("2026-09");
  assert.equal(cells[0], "2026-08-30");
  assert.equal(cells.at(-1), "2026-10-03");
  assert.equal(cells.length % 7, 0);
  assert.ok(calendarCells("2028-02").includes("2028-02-29"));
});

test("the calendar intersects published screenings with release and booking limits", () => {
  const sparse = catalog.filter((screening) => screening.dateId !== "2026-09-30");
  const days = getCalendarDays(sparse, { from: "2026-09-29", to: "2026-10-03", releaseDate: "2026-09-30", endDate: "2026-10-02" });
  assert.deepEqual(days.filter((day) => day.selectable).map((day) => day.dateId), ["2026-10-01", "2026-10-02"]);
  assert.ok(!days.some((day) => day.dateId === "2026-09-30"));
});

test("screening identity stays fixed as today advances, without reusing prior dates", () => {
  const next = createScreenings(new Date("2026-09-30T00:00:00+09:00"));
  const current = catalog.find((item) => item.dateId === "2026-09-30");
  assert.ok(next.some((item) => item.id === current.id));
  assert.notEqual(catalog[0].id, next[0].id);
  assert.equal(findScreening(current.id).dateId, "2026-09-30");
});

test("sold-out, few seats, upcoming sales and closed sessions stay in the schedule", () => {
  const sample = catalog.slice(0, 4).map((screening, index) => index === 2 ? { ...screening, salesStartAt: "2026-09-29T09:00:00+09:00" } : screening);
  const reserved = { [sample[0].id]: Array.from({ length: sample[0].capacity }, (_, i) => "A-" + i), [sample[1].id]: Array.from({ length: sample[1].capacity - 19 }, (_, i) => "A-" + i) };
  const data = buildScheduleResponse({ catalog: sample, dateId: "2026-09-29", now, reservedByScreening: reserved });
  assert.deepEqual(data.screenings.map((item) => item.status), ["sold-out", "few", "not-on-sale", "available"]);
  assert.equal(data.screenings[1].availabilityLabel, "残り19席");
  assert.equal(data.screenings[0].bookable, false);
  assert.equal(data.screenings[2].bookable, false);
  const closed = buildScheduleResponse({ catalog: sample, now: new Date("2026-09-29T23:00:00+09:00") });
  assert.ok(closed.screenings.every((item) => item.status === "closed"));
});

test("missing schedules and dates outside the published window produce an empty list", () => {
  assert.equal(buildScheduleResponse({ catalog: [], now }).screenings.length, 0);
  assert.equal(buildScheduleResponse({ catalog, dateId: "2026-10-05", now }).screenings.length, 0);
  assert.equal(buildScheduleResponse({ catalog, dateId: "2026-09-28", now }).screenings.length, 0);
});

test("choosing a screening atomically passes movie, date, screen and times to seats", () => {
  const screening = selection();
  const draft = buildScreeningDraft(screening);
  assert.equal(draft.movieId, screening.movieId);
  assert.equal(draft.screeningDate, screening.dateId);
  assert.equal(draft.screenId, screening.screenId);
  assert.equal(draft.screeningTime, screening.startTime);
  assert.equal(draft.endTime, screening.endTime);
  assert.equal(createInitialSeatSelection(draft).screeningId, screening.id);
  assert.equal(createSeatMap(screening.id).flatMap((row) => row.seats).length, screening.capacity);
});

test("returning to the same screening keeps seats and food; another clears both", () => {
  const screening = selection();
  const previous = { ...buildScreeningDraft(screening), seatIds: ["B-3"], ticketCount: 1, ticketTotalPrice: 1800, foodItems: [{ id: "set-a", quantity: 2 }], foodTotalPrice: 1960, totalPrice: 3760 };
  assert.deepEqual(buildScreeningDraft(screening, previous).seatIds, ["B-3"]);
  assert.equal(buildScreeningDraft(screening, previous).foodTotalPrice, 1960);
  const other = buildScheduleResponse({ catalog, now }).screenings[4];
  assert.deepEqual(buildScreeningDraft(other, previous).seatIds, []);
  assert.deepEqual(buildScreeningDraft(other, previous).foodItems, []);
});

test("date-only selection survives reload without automatically choosing a screening", () => {
  const draft = buildScreeningDraft(selection());
  const selected = restoreBookingSelection(draft, { dateId: "2026-10-01", screeningId: null });
  assert.deepEqual(selected, { dateId: "2026-10-01", screeningId: null });
  assert.equal(restoreBookingSelection({ ...draft, movieId: "another-movie" }, null), null);
});

test("legacy drafts resolve to date-scoped screening IDs using their saved date", () => {
  const restored = restoreBookingSelection({ movieId: "movie-001", screeningId: "scr-1820", screeningDate: "2026-09-29" }, null);
  assert.deepEqual(restored, { dateId: "2026-09-29", screeningId: "scr-2026-09-29-s3-1820" });
});

test("registered movie availability is read without generated seat IDs", async () => {
  const calls = [];
  const data = await loadScreeningSchedule({ now, fetchImpl: async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ movie: { id: "movie-001" }, showings: [] }) };
  } });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].endsWith("/api/movies/movie-001"));
  assert.deepEqual(data.screenings, []);
});

test("availability errors and malformed responses never masquerade as empty seats", async () => {
  await assert.rejects(loadScreeningSchedule({ now, fetchImpl: async () => ({ ok: false, status: 503 }) }));
  await assert.rejects(loadScreeningSchedule({ now, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }));
  await assert.rejects(fetchReservedSeats("sample", { fetchImpl: async () => ({ ok: false }) }));
});


test("an old backend missing movie APIs cannot silently substitute another film", async () => {
  await assert.rejects(loadScreeningSchedule({ now, fetchImpl: async () => ({ ok: false, status: 404 }) }), error => error.status === 404);
});
