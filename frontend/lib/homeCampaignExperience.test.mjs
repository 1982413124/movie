import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

test("home movie catalog uses replaceable local image paths with alt text", () => {
  const sourcePath = resolve(appDir, "data/movieCatalog.ts");

  assert.ok(
    existsSync(sourcePath),
    "expected movie catalog data to live in app/data/movieCatalog.ts"
  );

  const source = readFileSync(sourcePath, "utf8");

  for (const imagePath of [
    "/images/hero/hero-main.jpg",
    "/images/movies/movie-01.jpg",
    "/images/movies/movie-02.jpg",
    "/images/movies/movie-03.jpg",
  ]) {
    assert.match(source, new RegExp(imagePath.replaceAll("/", "\\/")));
  }

  const altEntries = source.match(/imageAlt:\s*"[^"]+"/g) ?? [];
  assert.ok(altEntries.length >= 4, "expected hero and movie image alt text");
});

test("home campaign experience uses GSAP and avoids food booking scope creep", () => {
  const source = readFileSync(resolve(appDir, "page.tsx"), "utf8");

  assert.match(source, /gsap/);
  assert.match(source, /ScrollTrigger/);
  assert.match(source, /js-loader/);
  assert.match(source, /js-loader-progress/);
  assert.match(source, /href="\/movie-detail"/);
  assert.match(source, /href="\/register"/);
  assert.doesNotMatch(source, /description/);
  assert.doesNotMatch(source, /ポスター画像は|迷わず進める|世界観を保ちます/);
  assert.doesNotMatch(
    source,
    /food|meal|cart|フード|食事|カート|注文|料金計算|DB保存/i
  );
});

test("home campaign palette stays monochrome instead of black and gold", () => {
  const homeSource = readFileSync(resolve(appDir, "page.tsx"), "utf8");
  const styleSource = readFileSync(resolve(appDir, "globals.css"), "utf8");
  const catalogSource = readFileSync(
    resolve(appDir, "data/movieCatalog.ts"),
    "utf8"
  );
  const combinedSource = `${homeSource}\n${styleSource}\n${catalogSource}`;

  assert.doesNotMatch(
    combinedSource,
    /#d8a85f|#7bb9a9|#b65f58|#8b8fbc|rgba\(216,\s*168,\s*95|rgba\(123,\s*185,\s*169/i
  );
});

test("home campaign uses a white editorial shell with animated navigation", () => {
  const source = readFileSync(resolve(appDir, "page.tsx"), "utf8");

  assert.match(source, /bg-\[#f7f7f3\]/);
  assert.match(source, /text-\[#080808\]/);
  assert.match(source, /js-menu-panel/);
  assert.match(source, /js-menu-line-top/);
  assert.match(source, /aria-expanded=\{isOpen\}/);

  for (const navLabel of [
    "ホーム",
    "上映中の作品",
    "検索",
    "マイページ",
    "上映スケジュール",
    "映画一覧",
    "購入情報確認",
    "予約状況確認",
  ]) {
    assert.match(source, new RegExp(navLabel));
  }
});
