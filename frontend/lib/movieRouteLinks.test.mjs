import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

test("now showing detail links point to the public movie-detail route", () => {
  const movieNowSource = readFileSync(resolve(appDir, "movie-now/page.tsx"), "utf8");

  assert.equal(existsSync(resolve(appDir, "movie-detail/page.tsx")), true);
  assert.match(
    movieNowSource,
    /href=(?:"\/movie-detail"|\{`\/movie-detail(?:\?movieId=\$\{movie\.id\})?`\})/,
  );
  assert.doesNotMatch(movieNowSource, /href=\{`\/movies\/\$\{movie\.id\}`\}/);
});
