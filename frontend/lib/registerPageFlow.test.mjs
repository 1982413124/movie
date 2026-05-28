import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

test("register page submits the form and routes to movie-main after saving the account", () => {
  const source = readFileSync(resolve(appDir, "register/page.tsx"), "utf8");

  assert.match(source, /onSubmit=\{handleSubmit\}/);
  assert.match(source, /router\.push\("\/movie-main"\)/);
  assert.match(source, /type="submit"/);
  assert.doesNotMatch(source, /href="\/movie-main"/);
});
