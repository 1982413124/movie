import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countAvailableSeats,
  createSeatMap,
  createInitialSeatSelection,
  toggleSeatSelection,
  validateSeatSelection,
} from "./seatSelection.mjs";

test("available seats can be selected together while reserved seats stay unselected", () => {
  const reservedSeat = { id: "B-2", status: "reserved" };
  const firstSeat = { id: "C-4", status: "available" };
  const secondSeat = { id: "C-5", status: "available" };

  assert.deepEqual(toggleSeatSelection([], reservedSeat), []);
  assert.deepEqual(toggleSeatSelection([], firstSeat), ["C-4"]);
  assert.deepEqual(toggleSeatSelection(["C-4"], secondSeat), ["C-4", "C-5"]);
  assert.deepEqual(toggleSeatSelection(["C-4", "C-5"], firstSeat), ["C-5"]);
});

test("seat selection validation requires one selected seat", () => {
  assert.deepEqual(validateSeatSelection([]), {
    ok: false,
    message: "座席を1つ以上選択してください。",
  });
  assert.deepEqual(validateSeatSelection(["C-4", "C-5"]), {
    ok: true,
    message: "",
  });
});

test("initial seat selection restores screening and seats from a reservation draft", () => {
  assert.deepEqual(
    createInitialSeatSelection({
      screeningId: "scr-2050",
      seatIds: ["D-5", "D-6"],
    }),
    {
      screeningId: "scr-2050",
      selectedSeatIds: ["D-5", "D-6"],
    },
  );
});

test("initial seat selection falls back when a reservation draft is missing", () => {
  assert.deepEqual(createInitialSeatSelection(null), {
    screeningId: "scr-1820",
    selectedSeatIds: [],
  });
});
test("seat map treats API reserved seats as unavailable for the same screening", () => {
  const seatMap = createSeatMap("scr-1820", ["C-4"]);
  const seat = seatMap.flatMap((row) => row.seats).find((item) => item.id === "C-4");

  assert.equal(seat.status, "reserved");
  assert.equal(
    countAvailableSeats("scr-1820", ["C-4"]),
    countAvailableSeats("scr-1820") - 1,
  );
});