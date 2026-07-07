import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

test("selection controls use theme selection variables instead of fixed cyan colors", () => {
  const files = [
    "comfirm/PaymentPanel.jsx",
    "movie-detail/page.tsx",
    "seats/SeatMap.jsx",
    "seats/OrderPanel.jsx",
  ];

  for (const file of files) {
    const source = readFileSync(resolve(appDir, file), "utf8");

    assert.match(source, /var\(--selection-/);
    assert.doesNotMatch(source, /(?:bg|border|ring)-cyan-/);
  }
});

test("completion action buttons use theme button variables", () => {
  const files = [
    "complete/CompletionActions.jsx",
    "complete/EmptyCompletion.jsx",
  ];

  for (const file of files) {
    const source = readFileSync(resolve(appDir, file), "utf8");

    assert.match(source, /var\(--button-/);
    assert.doesNotMatch(source, /bg-gray-700|hover:bg-gray-800|text-white/);
  }
});

test("seat and ticket mismatch warning uses red shake feedback", () => {
  const orderPanelSource = readFileSync(resolve(appDir, "seats/OrderPanel.jsx"), "utf8");
  const globalStyleSource = readFileSync(resolve(appDir, "globals.css"), "utf8");

  assert.match(orderPanelSource, /ticket-warning-shake/);
  assert.match(orderPanelSource, /text-\[#E82020\]/);
  assert.match(orderPanelSource, /validationAttempt/);
  assert.match(globalStyleSource, /@keyframes ticket-warning-shake/);
});
