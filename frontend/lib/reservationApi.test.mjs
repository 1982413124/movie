import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildReservationPayload,
  createReservation,
  fetchReservedSeats,
  normalizeReservedSeatsResponse,
} from "./reservationApi.mjs";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

test("reserved seats API response is normalized to seat labels", () => {
  assert.deepEqual(
    normalizeReservedSeatsResponse({ reserved_seats: ["C-4", " C-5 ", "", null] }),
    ["C-4", "C-5"],
  );
});

test("reservation payload keeps screening scoped seat data", () => {
  const payload = buildReservationPayload(
    {
      movieId: "movie-001",
      screeningId: "scr-1820",
      screeningTime: "18:20",
      screenName: "スクリーン 3",
      seatIds: ["C-4", "C-5"],
      ticketCount: 2,
      ticketTotalPrice: 3600,
      foodTotalPrice: 0,
      totalPrice: 3600,
    },
    "test@example.com",
  );

  assert.deepEqual(payload, {
    user_email: "test@example.com",
    movie_id: "movie-001",
    screening_id: "scr-1820",
    screening_time: "18:20",
    screen_name: "スクリーン 3",
    seat_ids: ["C-4", "C-5"],
    ticket_count: 2,
    ticket_total_price: 3600,
    food_total_price: 0,
    total_price: 3600,
  });
});

test("fetchReservedSeats calls the screening scoped reserved seats endpoint", async () => {
  const calls = [];
  const seats = await fetchReservedSeats("scr-18:20", {
    apiBaseUrl: "http://backend.test",
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => ({ reserved_seats: ["D-1"] }),
      };
    },
  });

  assert.deepEqual(seats, ["D-1"]);
  assert.equal(
    calls[0],
    "http://backend.test/api/screenings/scr-18%3A20/reserved-seats",
  );
});

test("createReservation returns conflict details for 409 responses", async () => {
  const result = await createReservation(
    { movieId: "movie-001", screeningId: "scr-1820", seatIds: ["C-4"] },
    {
      apiBaseUrl: "http://backend.test",
      fetchImpl: async () => ({
        ok: false,
        status: 409,
        json: async () => ({ conflict_seats: ["C-4"] }),
      }),
    },
  );

  assert.deepEqual(result, {
    ok: false,
    conflict: true,
    conflictSeats: ["C-4"],
  });
});

test("seat selection and confirmation screens are wired to reservation APIs", () => {
  const seatSelectionSource = readFileSync(resolve(appDir, "seats/SeatSelectionClient.jsx"), "utf8");
  const confirmSource = readFileSync(resolve(appDir, "comfirm/ConfirmClient.jsx"), "utf8");

  assert.match(seatSelectionSource, /fetchReservedSeats/);
  assert.match(seatSelectionSource, /createSeatMap\(screeningId, apiReservedSeatIds\)/);
  assert.match(seatSelectionSource, /countAvailableSeats\(screeningId, apiReservedSeatIds\)/);
  assert.match(confirmSource, /createReservation/);
  assert.match(confirmSource, /response\.conflict/);
  assert.match(confirmSource, /409|すでに予約/);
});