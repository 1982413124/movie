import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

test("register page persists the authenticated account and routes to mypage", () => {
  const source = readFileSync(resolve(appDir, "register/page.tsx"), "utf8");

  assert.match(source, /onSubmit=\{handleSubmit\}/);
  assert.match(source, /movieCurrentUserEmail/);
  assert.match(source, /router\.push\("\/mypage"\)/);
  assert.match(source, /type="submit"/);
  assert.doesNotMatch(source, /href="\/mypage"/);
});
