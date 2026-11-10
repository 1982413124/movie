import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");
const source = readFileSync(resolve(appDir, "mypage/page.tsx"), "utf8");

test("mypage menu routes between reservations, history, points, profile, and settings", () => {
  for (const label of ["次の予約", "購入履歴", "ポイント", "プロフィール", "設定", "ログアウト"]) {
    assert.match(source, new RegExp(label));
  }

  const menuKeys = source.match(/type MenuKey = ([^;]+);/)[1].match(/"[^"]+"/g);
  assert.deepEqual(new Set(menuKeys), new Set(["reservations", "history", "points", "profile", "settings", "logout"].map(key => `"${key}"`)));
  assert.match(source, /setActiveMenu\(menuKey\)/);
  assert.match(source, /activeMenu === "reservations"/);
  assert.match(source, /activeMenu === "history"/);
  assert.match(source, /activeMenu === "points"/);
  assert.match(source, /<PointsPanel/);
  assert.doesNotMatch(source, /ウィッシュリスト|wishlist|Member Card|Member ID/);
});

test("mypage shows the next paid reservation and detailed history", () => {
  assert.match(source, /NextReservationPanel/);
  assert.match(source, /PurchaseHistoryPanel/);
  assert.match(source, /ReservationDetailPanel/);
  assert.match(source, /findNextReservation/);
  assert.match(source, /getFoodPickupDetails/);
  assert.match(source, /次の予約はありません/);
  assert.match(source, /購入履歴へ戻る/);
  assert.match(source, /チケット小計/);
  assert.match(source, /フード小計/);
  assert.match(source, /受取時間/);
  assert.match(source, /fetchReservationHistories/);
});

test("mypage asks for confirmation before canceling a reservation", () => {
  assert.match(source, /pendingCancelId/);
  assert.match(source, /CancelReservationModal/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /この予約をキャンセルしますか/);
  assert.match(source, /handleConfirmCancel/);
  assert.match(source, /canCancelReservation/);
  assert.match(source, /上映開始の1時間前/);
});
