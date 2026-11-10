import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPurchaseConfirmation,
  validatePaymentMethod,
} from "./purchaseConfirmation.mjs";

test("builds a confirmation summary from the seat reservation draft", () => {
  const summary = buildPurchaseConfirmation({
    screeningId: "scr-1820",
    screeningTime: "18:20",
    screenName: "スクリーン 3",
    seatIds: ["C-4", "C-5"],
    ticketTypes: [
      { ticketTypeId: "general", label: "一般", unitPrice: 1800, quantity: 1 },
      { ticketTypeId: "child", label: "小学生・幼児", unitPrice: 1000, quantity: 1 },
    ],
    ticketCount: 2,
    totalPrice: 2800,
  });

  assert.equal(summary.movieTitle, "SPIDER MAN");
  assert.equal(summary.theaterName, "HAL CINEMA 名古屋栄");
  assert.equal(summary.screeningDatetime, "本日 18:20");
  assert.equal(summary.screenName, "スクリーン 3");
  assert.equal(summary.seatNum, "C-4, C-5");
  assert.equal(summary.ticketNum, 2);
  assert.equal(summary.totalPrice, 2800);
});

test("adds optional food details to the confirmation summary", () => {
  const summary = buildPurchaseConfirmation({
    screeningId: "scr-1820",
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
    foodTotalPrice: 980,
    totalPrice: 3780,
  });

  assert.deepEqual(summary.foodItems, [
    {
      id: "set-a",
      name: "シネマセットA",
      price: 980,
      quantity: 1,
      lineTotal: 980,
    },
  ]);
  assert.equal(summary.ticketTotalPrice, 2800);
  assert.equal(summary.foodTotalPrice, 980);
  assert.equal(summary.totalPrice, 3780);
});

test("payment method validation requires an available method", () => {
  assert.deepEqual(validatePaymentMethod(""), {
    ok: false,
    message: "支払い方法を選択してください。",
  });
  assert.deepEqual(validatePaymentMethod("credit-card"), {
    ok: true,
    message: "",
  });
  assert.deepEqual(validatePaymentMethod("unknown"), {
    ok: false,
    message: "利用できない支払い方法です。",
  });
});
