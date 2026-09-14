import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateMonthlyMemberProgress,
  calculateMonthlyRankSummary,
  findNextReservation,
  getFoodPickupDetails,
  getMonthlyBenefitPeriod,
  getReservationDisplayStatus,
  MEMBER_RANK_RULES,
} from "./reservationExperience.mjs";

const now = new Date("2026-07-14T03:00:00.000Z");

test("next reservation ignores past, canceled, refunded, and unpaid entries", () => {
  const histories = [
    { id: "1", showStartAt: "2026-07-14T18:00:00+09:00", paymentStatus: "refunded", orderStatus: "cancelled" },
    { id: "2", showStartAt: "2026-07-14T17:00:00+09:00", paymentStatus: "unpaid", orderStatus: "pending" },
    { id: "3", showStartAt: "2026-07-14T19:00:00+09:00", paymentStatus: "paid", orderStatus: "paid" },
    { id: "4", showStartAt: "2026-07-14T16:00:00+09:00", paymentStatus: "paid", orderStatus: "paid" },
  ];

  assert.equal(findNextReservation(histories, now)?.id, "4");
});

test("member progress counts unique paid reservations in the Japan calendar month", () => {
  const histories = [
    { id: "1", showDate: "2026-07-01", paymentStatus: "paid", orderStatus: "paid" },
    { id: "1", showDate: "2026-07-01", paymentStatus: "paid", orderStatus: "paid" },
    { id: "2", showDate: "2026-07-20", paymentStatus: "paid", orderStatus: "paid" },
    { id: "3", showDate: "2026-07-21", paymentStatus: "refunded", orderStatus: "cancelled" },
    { id: "4", showDate: "2026-06-30", paymentStatus: "paid", orderStatus: "paid" },
  ];

  assert.deepEqual(calculateMonthlyMemberProgress(histories, now), {
    completed: 2,
    remaining: 1,
    target: 3,
    rewardLabel: "Mサイズドリンク無料",
    ratio: 2 / 3,
  });
});

test("monthly rank summary uses paid purchase totals and completed visits", () => {
  const histories = [
    {
      id: "1",
      purchasedAtRaw: "2026-07-01T00:00:00Z",
      showDate: "2026-07-02",
      showStartAt: "2026-07-02T10:00:00+09:00",
      totalPrice: 4_000,
      paymentStatus: "paid",
      orderStatus: "paid",
    },
    {
      id: "1",
      purchasedAtRaw: "2026-07-01T00:00:00Z",
      showDate: "2026-07-02",
      showStartAt: "2026-07-02T10:00:00+09:00",
      totalPrice: 4_000,
      paymentStatus: "paid",
      orderStatus: "paid",
    },
    {
      id: "2",
      purchasedAtRaw: "2026-07-10T00:00:00Z",
      showDate: "2026-07-14",
      showStartAt: "2026-07-14T11:00:00+09:00",
      totalPrice: 4_500,
      paymentStatus: "paid",
      orderStatus: "paid",
    },
    {
      id: "3",
      purchasedAtRaw: "2026-07-14T00:00:00Z",
      showDate: "2026-07-20",
      showStartAt: "2026-07-20T18:00:00+09:00",
      totalPrice: 2_000,
      paymentStatus: "paid",
      orderStatus: "paid",
    },
    {
      id: "4",
      purchasedAtRaw: "2026-06-30T12:00:00Z",
      showDate: "2026-07-05",
      showStartAt: "2026-07-05T18:00:00+09:00",
      totalPrice: 3_000,
      paymentStatus: "paid",
      orderStatus: "paid",
    },
    {
      id: "5",
      purchasedAtRaw: "2026-07-12T00:00:00Z",
      showDate: "2026-07-12",
      showStartAt: "2026-07-12T18:00:00+09:00",
      totalPrice: 9_000,
      paymentStatus: "refunded",
      orderStatus: "cancelled",
    },
  ];

  assert.deepEqual(calculateMonthlyRankSummary(histories, now), {
    amountSpent: 10_500,
    visitCount: 3,
    currentRankIndex: 1,
    currentRankId: "silver",
    nextRankIndex: 2,
    remainingAmount: 4_500,
    remainingVisits: 0,
    amountRatio: 0.7,
    visitRatio: 1,
  });
});

test("rank progress starts empty and targets the next rank", () => {
  const empty = calculateMonthlyRankSummary([], now);
  assert.equal(empty.currentRankId, "bronze");
  assert.equal(empty.nextRankIndex, 1);
  assert.equal(empty.amountRatio, 0);
  assert.equal(empty.visitRatio, 0);
  assert.equal(empty.remainingAmount, 5_000);
  assert.equal(empty.remainingVisits, 1);

  const partial = calculateMonthlyRankSummary([{
    id: "partial",
    purchasedAtRaw: "2026-07-01T00:00:00Z",
    showDate: "2026-07-20",
    showStartAt: "2026-07-20T10:00:00+09:00",
    totalPrice: 2_500,
    paymentStatus: "paid",
    orderStatus: "paid",
  }], now);
  assert.equal(partial.amountRatio, 0.5);
  assert.equal(partial.visitRatio, 0);
});

test("rank progress caps each goal and needs both conditions to advance", () => {
  const histories = Array.from({ length: 6 }, (_, index) => ({
    id: `visit-${index}`,
    purchasedAtRaw: "2026-07-01T00:00:00Z",
    showDate: "2026-07-02",
    showStartAt: "2026-07-02T10:00:00+09:00",
    totalPrice: index === 0 ? 35_000 : 0,
    paymentStatus: "paid",
    orderStatus: "paid",
  }));

  const silver = calculateMonthlyRankSummary(histories.slice(0, 1), now);
  assert.equal(silver.currentRankId, "silver");
  assert.equal(silver.amountRatio, 1);
  assert.equal(silver.visitRatio, 1 / 3);
  assert.equal(silver.remainingVisits, 2);

  const gold = calculateMonthlyRankSummary(histories.slice(0, 3), now);
  assert.equal(gold.currentRankId, "gold");
  assert.equal(gold.amountRatio, 1);
  assert.equal(gold.visitRatio, 0.5);

  const platinum = calculateMonthlyRankSummary(histories, now);
  assert.equal(platinum.currentRankId, "platinum");
  assert.equal(platinum.nextRankIndex, null);
  assert.equal(platinum.amountRatio, 1);
  assert.equal(platinum.visitRatio, 1);
  assert.equal(platinum.remainingAmount, 0);
  assert.equal(platinum.remainingVisits, 0);
});

test("rank rules expose spend, visit, and benefit thresholds", () => {
  assert.deepEqual(
    MEMBER_RANK_RULES.map(({ id, spendTarget, visitTarget, benefitLabel }) => ({
      id,
      spendTarget,
      visitTarget,
      benefitLabel,
    })),
    [
      {
        id: "bronze",
        spendTarget: 0,
        visitTarget: 0,
        benefitLabel: "予約履歴を確認",
      },
      {
        id: "silver",
        spendTarget: 5_000,
        visitTarget: 1,
        benefitLabel: "Sドリンク1杯無料",
      },
      {
        id: "gold",
        spendTarget: 15_000,
        visitTarget: 3,
        benefitLabel: "Mドリンク1杯無料",
      },
      {
        id: "platinum",
        spendTarget: 30_000,
        visitTarget: 6,
        benefitLabel: "ポップコーンS無料",
      },
    ],
  );
});

test("member benefit period follows the Japan calendar month", () => {
  assert.deepEqual(getMonthlyBenefitPeriod(now), {
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    label: "対象期間：2026年7月1日〜7月31日",
  });
});

test("food pickup window is derived from the screening start time", () => {
  assert.deepEqual(
    getFoodPickupDetails({
      showStartAt: "2026-07-14T18:20:00+09:00",
      foodItems: [{ name: "塩ポップコーン", quantity: 1 }],
    }),
    {
      timeLabel: "18:00〜18:15",
      locationLabel: "フード受取カウンター",
    },
  );
});

test("display status keeps refunded reservations distinct", () => {
  assert.equal(
    getReservationDisplayStatus({ paymentStatus: "refunded", orderStatus: "cancelled" }, now),
    "返金済み",
  );
});
