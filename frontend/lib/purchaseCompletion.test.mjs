import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPurchaseCompletion,
  formatSeatNumbers,
} from "./purchaseCompletion.mjs";

test("formats multiple selected seats into purchase completion details", () => {
  const details = buildPurchaseCompletion(
    {
      screeningId: "scr-1820",
      seatIds: ["C-4", "C-5"],
      ticketCount: 2,
      totalPrice: 3600,
    },
    {
      now: new Date("2026-05-18T12:30:00.000Z"),
      orderNum: "ORD-260518-4837",
      payNum: "PAY-8472-1593",
      payMethod: "クレジットカード",
    },
  );

  assert.equal(details.orderNum, "ORD-260518-4837");
  assert.equal(details.purchaseDatetime, "2026/05/18 21:30");
  assert.equal(details.movieTitle, "映画のタイトル");
  assert.equal(details.screeningDatetime, "本日 18:20");
  assert.equal(details.screenName, "スクリーン 3");
  assert.equal(details.theaterName, "CINEMA XX");
  assert.equal(details.seatNum, "C-4, C-5");
  assert.equal(details.ticketNum, 2);
  assert.equal(details.totalPrice, 3600);
  assert.equal(details.payMethod, "クレジットカード");
  assert.equal(details.payNum, "PAY-8472-1593");
});

test("adds optional food details to purchase completion details", () => {
  const details = buildPurchaseCompletion(
    {
      screeningId: "scr-1820",
      seatIds: ["C-4", "C-5"],
      ticketCount: 2,
      ticketTotalPrice: 3600,
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
      totalPrice: 4580,
    },
    {
      now: new Date("2026-05-18T12:30:00.000Z"),
      orderNum: "ORD-260518-4837",
      payNum: "PAY-8472-1593",
    },
  );

  assert.deepEqual(details.foodItems, [
    {
      id: "set-a",
      name: "シネマセットA",
      price: 980,
      quantity: 1,
      lineTotal: 980,
    },
  ]);
  assert.equal(details.ticketTotalPrice, 3600);
  assert.equal(details.foodTotalPrice, 980);
  assert.equal(details.totalPrice, 4580);
});

test("falls back to selected seat count when ticket count is missing", () => {
  const details = buildPurchaseCompletion({
    screeningId: "scr-2050",
    seatIds: ["D-5", "D-6", "D-7"],
    totalPrice: 5400,
  });

  assert.equal(details.ticketNum, 3);
  assert.equal(details.seatNum, "D-5, D-6, D-7");
});

test("formatSeatNumbers handles empty seat lists", () => {
  assert.equal(formatSeatNumbers([]), "-");
});