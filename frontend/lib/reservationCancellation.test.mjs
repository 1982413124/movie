import assert from "node:assert/strict";
import { test } from "node:test";
import { canCancelReservation, cancellationReason, formatCancellationDeadline } from "./reservationCancellation.mjs";
import { normalizeReservationHistoryResponse, cancelReservation, fetchReservationHistories } from "./purchaseHistoryApi.mjs";
import { signOutMember } from "./member-api.mjs";

const history = { orderStatus: "paid", paymentStatus: "paid", showStartAt: "2026-09-15T10:00:00+09:00" };

test("the one-hour deadline includes its boundary and excludes one millisecond later", () => {
  assert.equal(canCancelReservation(history, new Date("2026-09-15T08:59:59.999+09:00")), true);
  assert.equal(canCancelReservation(history, new Date("2026-09-15T09:00:00+09:00")), true);
  assert.equal(canCancelReservation(history, new Date("2026-09-15T09:00:00.001+09:00")), false);
  assert.equal(formatCancellationDeadline(history), "2026/09/15 09:00");
});

test("cancelled, unknown dates, expired and server-ineligible reservations fail closed", () => {
  const now = new Date("2026-09-15T08:00:00+09:00");
  for (const change of [{ orderStatus: "cancelled" }, { orderStatus: "expired" }, { showStartAt: "" }, { canCancel: false }]) {
    assert.equal(canCancelReservation({ ...history, ...change }, now), false);
  }
  assert.equal(canCancelReservation({ ...history, orderStatus: "pending", paymentStatus: "unpaid" }, now), true);
  assert.match(cancellationReason(history, new Date("2026-09-16")), /1時間前/);
});

test("actual showing dates and seat labels from the server survive normalization", () => {
  const [value] = normalizeReservationHistoryResponse({ reservations: [{
    id: 15, movie_title: "映画ちいかわ", screening_id: "uuid-real-showing", screening_date: "2026-09-15",
    screening_time: "10:00:00", show_start_at: "2026-09-15T10:00:00+09:00",
    seats: ["internal-seat-1"], seat_labels: ["A-6"], reservation_status: "paid", payment_status: "paid",
    cancel_deadline: "2026-09-15T09:00:00+09:00", can_cancel: true, refund_mode: "simulation",
  }] });
  assert.equal(value.showtime, "2026-09-15 10:00");
  assert.equal(value.showDate, "2026-09-15");
  assert.equal(value.showStartAt, history.showStartAt);
  assert.deepEqual(value.seats, ["A-6"]);
  assert.equal(value.cancelDeadline, "2026-09-15T09:00:00+09:00");
  assert.equal(value.canCancel, true);
});

test("cancellation sends session CSRF and preserves unpaid result without fabricating a refund", async () => {
  const calls = [];
  const result = await cancelReservation(15, "spoofed@example.test", { fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => url.endsWith("/session") ? { csrf_token: "session-csrf" } : {
      reservation_status: "cancelled", payment_status: "unpaid", refunded_amount: 0, refund_mode: "simulation",
    } };
  } });
  assert.equal(calls[0].url, "/api/cinema/member/session");
  assert.equal(calls[1].url, "/api/cinema/reservations/15/cancel");
  assert.equal(calls[1].options.headers.get("X-CSRF-Token"), "session-csrf");
  assert.equal(calls[1].options.credentials, "same-origin");
  assert.deepEqual(JSON.parse(calls[1].options.body), {});
  assert.equal(result.paymentStatus, "unpaid");
  assert.equal(result.refundedAmount, 0);
});

test("expired session prevents cancellation; a deadline rejection stays visible", async () => {
  const noSession = await cancelReservation(15, "a@example.test", { fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ message: "ログインし直してください。" }) }) });
  assert.equal(noSession.httpStatus, 401);
  const expired = await cancelReservation(15, "a@example.test", { fetchImpl: async (url) => url.endsWith("/session")
    ? { ok: true, json: async () => ({ csrf_token: "csrf" }) }
    : { ok: false, status: 409, json: async () => ({ message: "キャンセル期限を過ぎています。" }) } });
  assert.equal(expired.ok, false);
  assert.equal(expired.message, "キャンセル期限を過ぎています。");
});

test("history uses the server session and logout failures are not silently ignored", async () => {
  await fetchReservationHistories("untrusted@example.test", { fetchImpl: async (url, options) => {
    assert.equal(url, "/api/cinema/reservations");
    assert.equal(options.credentials, "same-origin");
    return { ok: true, json: async () => ({ reservations: [] }) };
  } });
  await assert.rejects(() => signOutMember({ fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ message: "接続できません" }) }) }), /接続できません/);
});
