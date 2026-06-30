import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyFoodSelectionToDraft,
  buildFoodOrder,
  foodCategories,
  foodHeroSlides,
  getFoodItemsByCategory,
  updateFoodQuantity,
} from "./foodSelection.mjs";

test("groups food items by the visible category rows", () => {
  assert.deepEqual(
    foodCategories.map((category) => category.id),
    ["recommended", "popcorn", "drinks", "hot-snacks", "sweets"],
  );

  assert.ok(getFoodItemsByCategory("recommended").length >= 4);
  assert.ok(
    getFoodItemsByCategory("popcorn").some((item) => item.name === "塩ポップコーン"),
  );
});

test("updates item quantities without allowing negative values", () => {
  const first = updateFoodQuantity({}, "popcorn-salt", 1);
  const second = updateFoodQuantity(first, "popcorn-salt", 1);
  const removed = updateFoodQuantity(second, "popcorn-salt", -3);

  assert.deepEqual(first, { "popcorn-salt": 1 });
  assert.deepEqual(second, { "popcorn-salt": 2 });
  assert.deepEqual(removed, {});
});

test("builds selected food order lines and total price", () => {
  const order = buildFoodOrder({
    "set-a": 1,
    "drink-cola": 2,
    "unknown-item": 5,
  });

  assert.deepEqual(
    order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    [
      { id: "set-a", name: "シネマセットA", quantity: 1, lineTotal: 980 },
      { id: "drink-cola", name: "コーラ", quantity: 2, lineTotal: 760 },
    ],
  );
  assert.equal(order.totalQuantity, 3);
  assert.equal(order.totalPrice, 1740);
});

test("promo slides include ad-style copy for a food banner", () => {
  const firstSlide = foodHeroSlides[0];

  assert.equal(firstSlide.promoLabel, "人気No.1");
  assert.equal(firstSlide.productName, "シネマセットA");
  assert.equal(firstSlide.priceLabel, "セットで980円");
  assert.ok(firstSlide.offer.includes("期間限定"));
  assert.ok(firstSlide.visualLabel);
});

test("promo slides use the uploaded advertisement image", () => {
  assert.ok(
    foodHeroSlides.every((slide) => (
      slide.imageSrc === "/images/advertisement/Popcorn.png"
    )),
  );
});

test("merges selected food into the reservation draft while keeping food optional", () => {
  const baseDraft = {
    screeningId: "scr-1820",
    seatIds: ["C-4", "C-5"],
    ticketCount: 2,
    totalPrice: 3600,
  };

  assert.deepEqual(applyFoodSelectionToDraft(baseDraft, {}), {
    ...baseDraft,
    ticketTotalPrice: 3600,
    foodItems: [],
    foodTotalPrice: 0,
    totalPrice: 3600,
  });

  assert.deepEqual(applyFoodSelectionToDraft(baseDraft, { "set-a": 1 }), {
    ...baseDraft,
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
  });
});



