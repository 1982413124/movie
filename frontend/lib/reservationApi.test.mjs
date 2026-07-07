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
      movieTitle: "映画のタイトル",
      movieDurationMinutes: 124,
      screeningId: "scr-1820",
      screeningTime: "18:20",
      screeningDate: "2026-07-03",
      screenId: "screen-3",
      screenName: "スクリーン 3",
      screenCapacity: 200,
      theaterName: "HAL CINEMA 名古屋栄",
      seatIds: ["C-4", "C-5"],
      ticketTypes: [
        { ticketTypeId: "general", label: "一般", unitPrice: 1800, quantity: 1 },
        { ticketTypeId: "child", label: "小学生・幼児", unitPrice: 1000, quantity: 1 },
      ],
      ticketCount: 2,
      ticketTotalPrice: 2800,
      foodItems: [
        {
          id: "set-a",
          name: "シネマセットA",
          price: 980,
          quantity: 1,
          lineTotal: 980,
        },
      ],
      foodTotalPrice: 0,
      totalPrice: 3600,
    },
    "test@example.com",
    "credit-card",
  );

  assert.deepEqual(payload, {
    user_email: "test@example.com",
    movie_id: "movie-001",
    movie_title: "映画のタイトル",
    movie_duration_minutes: 124,
    screening_id: "scr-1820",
    screening_time: "18:20",
    screening_date: "2026-07-03",
    screen_id: "screen-3",
    screen_name: "スクリーン 3",
    screen_capacity: 200,
    theater_name: "HAL CINEMA 名古屋栄",
    seat_ids: ["C-4", "C-5"],
    ticket_types: [
      { ticket_type_id: "general", label: "一般", unit_price: 1800, quantity: 1 },
      { ticket_type_id: "child", label: "小学生・幼児", unit_price: 1000, quantity: 1 },
    ],
    food_items: [
      {
        food_id: "set-a",
        name: "シネマセットA",
        unit_price: 980,
        quantity: 1,
        subtotal: 980,
      },
    ],
    payment_method: "credit-card",
    ticket_count: 2,
    ticket_total_price: 2800,
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

test("createReservation sends payment method with the order payload", async () => {
  const calls = [];

  await createReservation(
    {
      movieId: "movie-001",
      screeningId: "scr-1820",
      seatIds: ["C-4"],
      ticketTypes: [
        { ticketTypeId: "general", label: "一般", unitPrice: 1800, quantity: 1 },
      ],
      ticketCount: 1,
      ticketTotalPrice: 1800,
      totalPrice: 1800,
    },
    {
      apiBaseUrl: "http://backend.test",
      paymentMethod: "qr-pay",
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          json: async () => ({ reservation_id: 100 }),
        };
      },
    },
  );

  assert.equal(calls[0].url, "http://backend.test/api/reservations");
  assert.equal(JSON.parse(calls[0].options.body).payment_method, "qr-pay");
});

test("seat selection and confirmation screens are wired to reservation APIs", () => {
  const seatSelectionSource = readFileSync(resolve(appDir, "seats/SeatSelectionClient.jsx"), "utf8");
  const confirmSource = readFileSync(resolve(appDir, "comfirm/ConfirmClient.jsx"), "utf8");

  assert.match(seatSelectionSource, /fetchReservedSeats/);
  assert.match(seatSelectionSource, /movieTitle: movieDetail\.title/);
  assert.match(seatSelectionSource, /movieDurationMinutes: movieDetail\.durationMinutes/);
  assert.match(seatSelectionSource, /screenId: selectedScreening\.screenId/);
  assert.match(seatSelectionSource, /screeningDate: selectedScreening\.dateId/);
  assert.match(seatSelectionSource, /createSeatMap\(screeningId, apiReservedSeatIds\)/);
  assert.match(seatSelectionSource, /countAvailableSeats\(screeningId, apiReservedSeatIds\)/);
  assert.match(confirmSource, /createReservation/);
  assert.match(confirmSource, /response\.conflict/);
  assert.match(confirmSource, /409|すでに予約/);
});
