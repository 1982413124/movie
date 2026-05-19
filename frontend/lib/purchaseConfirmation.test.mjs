import { assert, test } from "vitest";
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
    ticketCount: 2,
    totalPrice: 3600,
  });

  assert.equal(summary.movieTitle, "映画のタイトル");
  assert.equal(summary.theaterName, "CINEMA XX");
  assert.equal(summary.screeningDatetime, "本日 18:20");
  assert.equal(summary.screenName, "スクリーン 3");
  assert.equal(summary.seatNum, "C-4, C-5");
  assert.equal(summary.ticketNum, 2);
  assert.equal(summary.totalPrice, 3600);
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
