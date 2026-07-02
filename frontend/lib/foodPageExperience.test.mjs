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

test("food promo returns to a restrained split banner", () => {
  assert.match(foodClientSource, /function FoodPromoCarousel/);
  assert.match(foodClientSource, /w-full pb-10/);
  assert.match(foodClientSource, /promo-banner-shell/);
  assert.match(foodClientSource, /promo-banner-inner/);
  assert.match(foodClientSource, /max-w-\[1500px\]/);
  assert.match(foodClientSource, /bg-\[#15110D\]/);
  assert.match(foodClientSource, /linear-gradient\(90deg/);
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
  assert.match(foodClientSource, /translate-y-3/);
  assert.match(foodClientSource, /promo-dot/);
});

test("food promo keeps the uploaded image on the right side", () => {
  assert.match(foodClientSource, /promo-banner-fill/);
  assert.match(foodClientSource, /src=\{slide\.imageSrc\}/);
  assert.match(foodClientSource, /loading=\{index === 0/);
  assert.match(foodClientSource, /"eager" : "lazy"/);
  assert.match(foodClientSource, /lg:w-\[70%\]/);
  assert.match(foodClientSource, /object-contain object-center/);
  assert.match(foodClientSource, /lg:object-right/);
  assert.doesNotMatch(foodClientSource, /url\("\$\{slide\.imageSrc\}"\)/);
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

test("food item cards use subdued media panels instead of orange gradients", () => {
  assert.match(foodClientSource, /food-card-media/);
  assert.match(foodClientSource, /--food-surface/);
  assert.match(foodClientSource, /--food-accent/);
  assert.doesNotMatch(foodClientSource, /linear-gradient\(135deg/);
  assert.doesNotMatch(foodClientSource, /#FF7A2F|#FFE9A0|#D58A14/);
});
