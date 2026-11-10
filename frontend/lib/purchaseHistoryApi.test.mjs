import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  cancelReservation,
  fetchReservationHistories,
  normalizeReservationHistoryResponse,
} from "./purchaseHistoryApi.mjs";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

test("reservation history API response is normalized for history cards", () => {
  const histories = normalizeReservationHistoryResponse({
    reservations: [
      {
        id: 101,
        movie_id: "movie-001",
        movie_title: "SPIDER MAN",
        screening_id: "scr-1820",
        show_date: "2026-07-14",
        screen_name: "スクリーン 3",
        screening_time: "18:20",
        ticket_count: 2,
        total_price: 4580,
        reservation_status: "paid",
        payment_status: "paid",
        created_at: "2026-06-30T12:00:00",
        seats: [" C-4 ", "C-5"],
        ticket_types: [
          { ticket_type_id: "general", label: "一般", unit_price: 1800, quantity: 1 },
          { ticket_type_id: "child", label: "小学生・幼児", unit_price: 1000, quantity: 1 },
        ],
        food_items: [
          {
            food_id: "set-a",
            name: "シネマセットA",
            quantity: 1,
            unit_price: 980,
            subtotal: 980,
          },
        ],
      },
    ],
  });

  assert.deepEqual(histories, [
    {
      id: "101",
      purchasedAt: "2026/06/30 21:00",
      purchasedAtRaw: "2026-06-30T12:00:00",
      movieId: "movie-001",
      movieTitle: "SPIDER MAN",
      screeningId: "scr-1820",
      showDate: "2026-07-14",
      showStartAt: "2026-07-14T18:20:00+09:00",
      showtime: "2026-07-14 18:20",
      screen: "スクリーン 3",
      seats: ["C-4", "C-5"],
      ticketCount: 2,
      ticketTypes: [
        { ticketTypeId: "general", label: "一般", unitPrice: 1800, quantity: 1 },
        { ticketTypeId: "child", label: "小学生・幼児", unitPrice: 1000, quantity: 1 },
      ],
      ticketSummary: "一般 1枚、小学生・幼児 1枚",
      foodItems: [
        {
          foodId: "set-a",
          name: "シネマセットA",
          quantity: 1,
          unitPrice: 980,
          subtotal: 980,
        },
      ],
      totalPrice: 4580,
      status: "予約済み",
      orderStatus: "paid",
      paymentStatus: "paid",
      posterUrl: "",
      canCancel: undefined, cancelDeadline: "", cancelReason: "", refundMode: "",
    },
  ]);
});

test("fetchReservationHistories calls the user scoped reservations endpoint", async () => {
  const calls = [];
  const histories = await fetchReservationHistories("test@example.com", {
    apiBaseUrl: "http://backend.test",
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => ({ reservations: [] }),
      };
    },
  });

  assert.deepEqual(histories, []);
  assert.equal(
    calls[0],
    "http://backend.test/api/reservations",
  );
});


test("cancelReservation uses authenticated identity and the actual server status", async () => {
  const calls = [];
  const result = await cancelReservation("101", "test@example.com", {
    apiBaseUrl: "http://backend.test",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => url.endsWith("/session")
        ? { csrf_token: "session-csrf" }
        : { status: "ok", reservation_status: "cancelled", payment_status: "refunded", refund_mode: "simulation", refunded_amount: 4580 } };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "キャンセル済み");
  assert.equal(result.paymentStatus, "refunded");
  assert.equal(calls[1].url, "http://backend.test/api/reservations/101/cancel");
  assert.equal(calls[1].options.method, "PATCH");
  assert.equal(calls[1].options.headers.get("X-CSRF-Token"), "session-csrf");
  assert.deepEqual(JSON.parse(calls[1].options.body), {});
});
test("mypage reads DB-backed reservation histories for list and detail views", () => {
  const mypageSource = readFileSync(resolve(appDir, "mypage/page.tsx"), "utf8");

  assert.match(mypageSource, /fetchReservationHistories/);
  assert.match(mypageSource, /cancelReservation/);
  assert.match(mypageSource, /予約をキャンセル/);
  assert.match(mypageSource, /readMemberSession/);
  assert.match(mypageSource, /PurchaseHistoryPanel/);
  assert.match(mypageSource, /ReservationDetailPanel/);
});
