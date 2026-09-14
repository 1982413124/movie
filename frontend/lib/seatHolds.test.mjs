import assert from "node:assert/strict";
import { test } from "node:test";
import { formatHoldRemaining, hasAllHeldSeats, seatHoldStatus, secondsRemaining } from "./seatHolds.mjs";

const now = Date.parse("2026-09-14T12:00:00+09:00");
const expiry = "2026-09-14T12:06:24+09:00";
test("other user's hold displays 6 minutes 24 seconds and becomes available at expiry", () => {
  const seat = { reserved: false, held_by_me: false, hold_expires_at: expiry };
  assert.equal(formatHoldRemaining(secondsRemaining(expiry, now)), "6分24秒");
  assert.equal(seatHoldStatus(seat, now), "held");
  assert.equal(seatHoldStatus(seat, Date.parse(expiry)), "available");
  assert.equal(secondsRemaining(expiry, Date.parse(expiry) + 10000), 0);
});
test("own hold stays selected; a confirmed reservation always wins", () => {
  assert.equal(seatHoldStatus({ held_by_me: true, hold_expires_at: expiry }, now), "selected");
  assert.equal(seatHoldStatus({ reserved: true, held_by_me: true, hold_expires_at: expiry }, now), "reserved");
});
test("checkout needs every requested seat and a live server deadline", () => {
  const snapshot = { seat_ids: ["A-1", "A-2"], expires_at: expiry };
  assert.equal(hasAllHeldSeats(snapshot, ["A-1", "A-2"], now), true);
  assert.equal(hasAllHeldSeats(snapshot, ["A-1", "A-3"], now), false);
  assert.equal(hasAllHeldSeats(snapshot, ["A-1"], Date.parse(expiry)), false);
  assert.equal(hasAllHeldSeats(null, ["A-1"], now), false);
  assert.equal(hasAllHeldSeats(snapshot, [], now), false);
});
