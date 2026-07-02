import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

test("mypage side menu routes between reservation, history, profile, and settings panels", () => {
  const source = readFileSync(resolve(appDir, "mypage/page.tsx"), "utf8");

  for (const label of ["予約状況", "購入履歴", "プロフィール", "設定", "ログアウト"]) {
    assert.match(source, new RegExp(label));
  }

  assert.match(source, /type MenuKey = "reservations" \| "history" \| "profile" \| "settings" \| "logout"/);
  assert.match(source, /setActiveMenu\(menuKey\)/);
  assert.match(source, /activeMenu === "reservations"/);
  assert.match(source, /activeMenu === "history"/);
  assert.doesNotMatch(source, /ウィッシュリスト|wishlist|Member Card|Member ID/);
});

test("mypage reservation and purchase panels show seats, totals, and history detail", () => {
  const source = readFileSync(resolve(appDir, "mypage/page.tsx"), "utf8");

  assert.match(source, /ReservationStatusPanel/);
  assert.match(source, /PurchaseHistoryPanel/);
  assert.match(source, /予約状況/);
  assert.match(source, /購入履歴/);
  assert.match(source, /座席/);
  assert.match(source, /seat-pill/);
  assert.match(source, /購入日時/);
  assert.match(source, /合計金額/);
  assert.match(source, /fetchReservationHistories/);
  assert.match(source, /createReservationSeatDisplay/);
  assert.match(source, /latestReservation\.screeningId/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /gridTemplateColumns/);
  assert.doesNotMatch(source, /ticketHistoryItems/);
});
