import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

test("now showing detail links point to the public movie-detail route", () => {
  const movieNowSource = readFileSync(resolve(appDir, "movie-now/page.tsx"), "utf8");
  const discoverySource = readFileSync(resolve(appDir, "components/MovieDiscovery.tsx"), "utf8");

  assert.equal(existsSync(resolve(appDir, "movie-detail/page.tsx")), true);
  assert.match(movieNowSource, /MovieDiscovery/);
  const cardSource = readFileSync(resolve(appDir, "components/MoviePosterCard.tsx"), "utf8");
  assert.match(discoverySource, /MoviePosterCard/);
  assert.match(cardSource, /href=\{movie\.detailHref\}/);
  assert.match(cardSource, /movie\.bookingHref \?/);
  assert.doesNotMatch(discoverySource, /href=\{`\/movies\/\$\{movie\.id\}`\}/);
});

test("seat selection proceeds to the optional food route before payment", () => {
  const seatSelectionSource = readFileSync(resolve(appDir, "seats/SeatSelectionClient.jsx"), "utf8");

  assert.match(seatSelectionSource, /router\.push\("\/food"\)/);
  assert.doesNotMatch(seatSelectionSource, /router\.push\("\/confirm"\)/);
});
