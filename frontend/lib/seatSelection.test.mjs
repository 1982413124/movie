import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildTicketSelection,
  createScreeningDates,
  countAvailableSeats,
  createSeatMap,
  createInitialSeatSelection,
  toggleSeatSelection,
  validateSeatSelection,
  validateTicketSelection,
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
test("ticket selection summarizes counts by ticket type", () => {
  assert.deepEqual(buildTicketSelection({ general: 1, child: 2 }), {
    ticketTypes: [
      { ticketTypeId: "general", label: "一般", unitPrice: 1800, quantity: 1, lineTotal: 1800 },
      { ticketTypeId: "child", label: "小学生・幼児", unitPrice: 1000, quantity: 2, lineTotal: 2000 },
    ],
    totalQuantity: 3,
    totalPrice: 3800,
  });
});

test("ticket selection validation requires seat count and ticket quantity to match", () => {
  assert.deepEqual(validateTicketSelection(["A-5", "A-6", "A-7"], { general: 1, child: 2 }), {
    ok: true,
    message: "",
  });
  assert.deepEqual(validateTicketSelection(["A-5", "A-6", "A-7"], { general: 1 }), {
    ok: false,
    message: "選択した座席数と券種の合計枚数を一致させてください。",
  });
});

test("screening date list starts from the supplied current date", () => {
  const dates = createScreeningDates(new Date(2026, 6, 3, 9, 0, 0));

  assert.equal(dates.length, 6);
  assert.deepEqual(dates.slice(0, 3), [
    { id: "2026-07-03", label: "7/3(金)", shortLabel: "7/3", dayLabel: "金", caption: "本日" },
    { id: "2026-07-04", label: "7/4(土)", shortLabel: "7/4", dayLabel: "土", caption: "明日" },
    { id: "2026-07-05", label: "7/5(日)", shortLabel: "7/5", dayLabel: "日", caption: "週末" },
  ]);
});
