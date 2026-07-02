import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

const menuSources = [
  resolve(appDir, "page.tsx"),
  resolve(appDir, "movie-main/page.tsx"),
  resolve(appDir, "components/CampaignHeader.tsx"),
];

test("full screen campaign menus use the public navigation structure", () => {
  for (const sourcePath of menuSources) {
    const source = readFileSync(sourcePath, "utf8");

    for (const expected of [
      /label:\s*"上映スケジュール"[\s\S]*meta:\s*"SCHEDULE"/,
      /label:\s*"映画一覧"[\s\S]*meta:\s*"LINEUP"/,
      /label:\s*"劇場案内"[\s\S]*meta:\s*"THEATER"/,
      /label:\s*"ご利用ガイド"[\s\S]*meta:\s*"GUIDE"/,
    ]) {
      assert.match(source, expected, sourcePath);
    }

    assert.doesNotMatch(source, /購入情報確認|予約状況確認|My Tickets|Confirm/);
  }
});

test("home campaign pages keep schedule and lineup as local anchors", () => {
  for (const sourcePath of [resolve(appDir, "page.tsx"), resolve(appDir, "movie-main/page.tsx")]) {
    const source = readFileSync(sourcePath, "utf8");

    for (const target of ["schedule", "lineup"]) {
      assert.match(source, new RegExp(`id=\"${target}\"`), `${target} missing in ${sourcePath}`);
    }

    assert.doesNotMatch(source, /id="theater"|id="guide"/);
  }
});

test("theater and guide are separate lightweight app routes", () => {
  assert.ok(existsSync(resolve(appDir, "theater/page.tsx")));
  assert.ok(existsSync(resolve(appDir, "guide/page.tsx")));

  for (const sourcePath of menuSources) {
    const source = readFileSync(sourcePath, "utf8");

    assert.match(source, /href:\s*"\/theater"[\s\S]*label:\s*"劇場案内"/);
    assert.match(source, /href:\s*"\/guide"[\s\S]*label:\s*"ご利用ガイド"/);
    assert.doesNotMatch(source, /#theater|#guide|\/movie-main#theater|\/movie-main#guide/);
  }
});