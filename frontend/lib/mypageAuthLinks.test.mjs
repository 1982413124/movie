import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

test("mypage exposes login and register links for unauthenticated users", () => {
  const source = readFileSync(resolve(appDir, "mypage/page.tsx"), "utf8");

  assert.equal(existsSync(resolve(appDir, "login/page.tsx")), true);
  assert.equal(existsSync(resolve(appDir, "register/page.tsx")), true);
  assert.match(source, /href="\/login"/);
  assert.match(source, /href="\/register"/);
  assert.match(source, /ログイン/);
  assert.match(source, /新規登録/);
});
