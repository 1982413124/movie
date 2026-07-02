import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  getScreeningsForDateAndScreen,
  getTheaterCapacityTotal,
  screeningDates,
  screenings,
  theaterScreens,
  ticketTypes,
} from "./seatSelection.mjs";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

test("theater screen data matches the eight-screen capacity plan", () => {
  assert.equal(theaterScreens.length, 8);
  assert.equal(getTheaterCapacityTotal(), 1050);
  assert.equal(theaterScreens.filter((screen) => screen.size === "large" && screen.capacity === 200).length, 3);
  assert.equal(theaterScreens.filter((screen) => screen.size === "medium" && screen.capacity === 120).length, 2);
  assert.equal(theaterScreens.filter((screen) => screen.size === "small" && screen.capacity === 70).length, 3);
});

test("ticket type prices match the requested ticket table", () => {
  assert.deepEqual(
    ticketTypes.map(({ label, price }) => ({ label, price })),
    [
      { label: "一般", price: 1800 },
      { label: "大学生等", price: 1600 },
      { label: "中学・高校", price: 1400 },
      { label: "小学生・幼児", price: 1000 },
    ],
  );
});

test("screenings are selectable by date and screen", () => {
  assert.ok(screeningDates.length >= 5);
  assert.ok(screenings.length >= theaterScreens.length * 2);

  const dateId = screeningDates[0].id;
  const screenId = "screen-1";
  const filtered = getScreeningsForDateAndScreen(dateId, screenId);

  assert.ok(filtered.length >= 2);
  assert.ok(filtered.every((screening) => screening.dateId === dateId));
  assert.ok(filtered.every((screening) => screening.screenId === screenId));
  assert.ok(filtered.every((screening) => screening.capacity === 200));
});

test("movie detail page exposes date, screen, and showtime selectors before seats", () => {
  const source = readFileSync(resolve(appDir, "movie-detail/page.tsx"), "utf8");

  assert.match(source, /selectedDateId/);
  assert.match(source, /selectedScreenId/);
  assert.match(source, /selectedScreeningId/);
  assert.match(source, /screeningDates\.map/);
  assert.match(source, /theaterScreens\.map/);
  assert.match(source, /getScreeningsForDateAndScreen/);
  assert.match(source, /ticketTypes\.map/);
  assert.match(source, /window\.sessionStorage\.setItem\("movieReservationDraft"/);
  assert.match(source, /router\.push\("\/seats"\)/);
  assert.match(source, /スクリーン数/);
  assert.match(source, /全体で1050名/);
});