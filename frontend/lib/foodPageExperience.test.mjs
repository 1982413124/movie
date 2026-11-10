import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const foodClientPath = resolve(currentDir, "../app/food/FoodSelectionClient.jsx");
const foodClientSource = readFileSync(foodClientPath, "utf8");

test("food promo carousel is placed above the two-column content area", () => {
  assert.ok(foodClientSource.indexOf("<FoodPromoCarousel") < foodClientSource.indexOf("<FoodContentGrid"));
  assert.match(foodClientSource, /promo-banner-shell/);
  assert.match(foodClientSource, /src=\{slide\.imageSrc\}/);
});

test("food carousel starts paused and offers explicit playback controls", () => {
  assert.match(foodClientSource, /\[isPromoPaused, setIsPromoPaused\] = useState\(true\)/);
  assert.match(foodClientSource, /isPromoPaused \|\| reducedMotion/);
  assert.match(foodClientSource, /自動切替を開始/);
  assert.match(foodClientSource, /自動切替を停止/);
  assert.match(foodClientSource, /aria-pressed=\{index === activePromoIndex\}/);
});

test("food grid and quantity controls expose selection feedback", () => {
  assert.match(foodClientSource, /xl:grid-cols-3/);
  assert.match(foodClientSource, /aria-live="polite"/);
  assert.match(foodClientSource, /selected-badge/);
  assert.match(foodClientSource, /summaryPulseKey/);
  assert.match(foodClientSource, /今回は注文しない/);
});

test("food cards use available real assets and show ordering information", () => {
  const foodDataSource = readFileSync(resolve(currentDir, "foodSelection.mjs"), "utf8");

  assert.match(foodClientSource, /<Image/);
  assert.match(foodClientSource, /サイズ/);
  assert.match(foodClientSource, /アレルギー/);
  assert.match(foodClientSource, /注文受付中/);
  assert.match(foodClientSource, /売り切れ/);
  assert.match(foodClientSource, /受取時間/);
  assert.match(foodClientSource, /受取場所/);
  assert.doesNotMatch(foodDataSource, /\/images\/food\//);
  assert.match(foodDataSource, /Popcorn-b3ad4ecb\.png/);
});
