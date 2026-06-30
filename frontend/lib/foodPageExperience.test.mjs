import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const foodClientPath = resolve(currentDir, "../app/food/FoodSelectionClient.jsx");
const foodClientSource = readFileSync(foodClientPath, "utf8");

test("food promo carousel is placed above the two-column content area", () => {
  assert.match(foodClientSource, /<FoodPromoCarousel/);
  assert.match(foodClientSource, /<FoodContentGrid/);
  assert.ok(
    foodClientSource.indexOf("<FoodPromoCarousel") <
      foodClientSource.indexOf("<FoodContentGrid"),
  );
  assert.doesNotMatch(foodClientSource, /<HeroSlide/);
});

test("food promo background spans the page while its contents stay aligned inside", () => {
  assert.match(foodClientSource, /function FoodPromoCarousel/);
  assert.match(foodClientSource, /w-full pb-8/);
  assert.match(foodClientSource, /promo-banner-shell/);
  assert.match(foodClientSource, /promo-banner-inner/);
  assert.match(foodClientSource, /mx-auto w-full max-w-\[1500px\]/);
  assert.ok(
    foodClientSource.indexOf("promo-banner-shell") <
      foodClientSource.indexOf("promo-banner-inner"),
  );
});
test("food promo carousel fades every four seconds and pauses on hover", () => {
  assert.match(foodClientSource, /4000/);
  assert.match(foodClientSource, /isPromoPaused/);
  assert.match(foodClientSource, /onMouseEnter=\{\(\) => setIsPromoPaused\(true\)\}/);
  assert.match(foodClientSource, /onMouseLeave=\{\(\) => setIsPromoPaused\(false\)\}/);
  assert.match(foodClientSource, /opacity-100/);
  assert.match(foodClientSource, /opacity-0/);
  assert.match(foodClientSource, /translate-y-0/);
  assert.match(foodClientSource, /translate-y-4/);
  assert.match(foodClientSource, /promo-dot/);
});

test("food promo shows the uploaded image without cropping", () => {
  assert.match(foodClientSource, /promo-banner-fill/);
  assert.match(foodClientSource, /src=\{slide\.imageSrc\}/);
  assert.match(foodClientSource, /object-contain/);
  assert.doesNotMatch(foodClientSource, /url\("\$\{slide\.imageSrc\}"\)/);
  assert.doesNotMatch(foodClientSource, /absolute inset-0 bg-cover bg-center/);
});

test("food rails use scroll snap and item cards expose dynamic selection affordances", () => {
  assert.match(foodClientSource, /snap-x/);
  assert.match(foodClientSource, /snap-mandatory/);
  assert.match(foodClientSource, /snap-start/);
  assert.match(foodClientSource, /hover:-translate-y-1/);
  assert.match(foodClientSource, /selected-badge/);
  assert.match(foodClientSource, /is-bumping/);
});

test("order summary animates when the cart total changes", () => {
  assert.match(foodClientSource, /summaryPulseKey/);
  assert.match(foodClientSource, /food-summary-pulse/);
  assert.match(foodClientSource, /key=\{`total-\$\{summaryPulseKey\}`\}/);
});


