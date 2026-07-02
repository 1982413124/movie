import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
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
        screening_id: "scr-1820",
        screen_name: "スクリーン 3",
        screening_time: "18:20",
        ticket_count: 2,
        total_price: 4580,
        reservation_status: "reserved",
        created_at: "2026-06-30T12:00:00",
        seats: [" C-4 ", "C-5"],
      },
    ],
  });

  assert.deepEqual(histories, [
    {
      id: "101",
      purchasedAt: "2026/06/30 21:00",
      movieTitle: "映画のタイトル",
      screeningId: "scr-1820",
      showtime: "本日 18:20",
      screen: "スクリーン 3",
      seats: ["C-4", "C-5"],
      ticketCount: 2,
      totalPrice: 4580,
      status: "予約済み",
      posterUrl: "",
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
    "http://backend.test/api/reservations?user_email=test%40example.com",
  );
});

test("mypage and purchase history screens read DB-backed reservation histories", () => {
  const mypageSource = readFileSync(resolve(appDir, "mypage/page.tsx"), "utf8");
  const historyPageSource = readFileSync(resolve(appDir, "purchase-history/PurchaseHistoryClient.tsx"), "utf8");

  assert.match(mypageSource, /fetchReservationHistories/);
  assert.match(historyPageSource, /fetchReservationHistories/);
  assert.match(historyPageSource, /getCurrentAccount/);
});