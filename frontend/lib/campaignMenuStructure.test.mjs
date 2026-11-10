import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");
const headerPath = resolve(appDir, "components/CampaignHeader.tsx");

test("shared cinema header exposes the public navigation structure", () => {
  const source = readFileSync(headerPath, "utf8");

  for (const expected of [
    /href:\s*"\/"[\s\S]*label:\s*"ホーム"/,
    /href:\s*"\/movie-now"[\s\S]*label:\s*"作品を探す"/,
    /href:\s*"\/mypage"[\s\S]*label:\s*"マイページ"/,
    /href:\s*"\/theater"[\s\S]*label:\s*"劇場案内"/,
    /href:\s*"\/guide"[\s\S]*label:\s*"ご利用ガイド"/,
  ]) {
    assert.match(source, expected);
  }

  assert.match(source, /aria-expanded=\{isMenuOpen\}/);
  assert.match(source, /role="dialog"/);
});

test("home keeps the reservation guide and today's lineup as local anchors", () => {
  const homeSource = readFileSync(resolve(appDir, "page.tsx"), "utf8");
  const legacyHomeSource = readFileSync(resolve(appDir, "movie-main/page.tsx"), "utf8");

  assert.match(homeSource, /id="experience"/);
  assert.match(homeSource, /id="today"/);
  assert.match(legacyHomeSource, /export \{ default \} from "\.\.\/page"/);
});

test("theater and guide remain separate app routes", () => {
  assert.ok(existsSync(resolve(appDir, "theater/page.tsx")));
  assert.ok(existsSync(resolve(appDir, "guide/page.tsx")));

  const source = readFileSync(headerPath, "utf8");
  assert.doesNotMatch(source, /#theater|#guide|\/movie-main#theater|\/movie-main#guide/);
});
