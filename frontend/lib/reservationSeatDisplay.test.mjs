import assert from "node:assert/strict";
import { test } from "node:test";
import { createReservationSeatDisplay } from "./reservationSeatDisplay.mjs";

test("reservation seat display uses the actual large screen layout", () => {
  const display = createReservationSeatDisplay("scr-1820", ["A-12", "A-13", "A-14"]);

  assert.equal(display.capacity, 200);
  assert.equal(display.rows.length, 10);
  assert.equal(display.columns.length, 20);
  assert.equal(display.rows.flatMap((row) => row.seats).length, 200);
  assert.deepEqual(
    display.rows[0].seats.slice(11, 14).map((seat) => ({
      id: seat.id,
      isSelected: seat.isSelected,
    })),
    [
      { id: "A-12", isSelected: true },
      { id: "A-13", isSelected: true },
      { id: "A-14", isSelected: true },
    ],
  );
});

test("reservation seat display keeps medium and small screen capacities", () => {
  assert.equal(
    createReservationSeatDisplay("scr-1-s4-1100", []).rows
      .flatMap((row) => row.seats).length,
    120,
  );
  assert.equal(
    createReservationSeatDisplay("scr-1-s6-0930", []).rows
      .flatMap((row) => row.seats).length,
    70,
  );
});
