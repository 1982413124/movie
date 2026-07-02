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
    "/images/man.jpg",
    "/images/gozira.jpg",
    "/images/harry.png",
  ]) {
    assert.match(source, new RegExp(imagePath.replaceAll("/", "\\/")));
  }

  const altEntries = source.match(/imageAlt:\s*"[^"]+"/g) ?? [];
  assert.ok(altEntries.length >= 4, "expected hero and movie image alt text");
});

test("home campaign experience uses GSAP with movie and food entry points", () => {
  const source = readFileSync(resolve(appDir, "page.tsx"), "utf8");

  assert.match(source, /gsap/);
  assert.match(source, /ScrollTrigger/);
  assert.match(source, /js-loader/);
  assert.match(source, /js-loader-progress/);
  assert.match(source, /href="\/movie-detail"/);
  assert.match(source, /href="\/register"/);
  assert.match(source, /Food × Cinema Experience/);
  assert.match(source, /FOOD MENU/);
  assert.doesNotMatch(source, /description/);
  assert.doesNotMatch(source, /ポスター画像は|迷わず進める|世界観を保ちます/);
});

test("home campaign palette uses warm cream and red cinema accents", () => {
  const homeSource = readFileSync(resolve(appDir, "page.tsx"), "utf8");
  const styleSource = readFileSync(resolve(appDir, "globals.css"), "utf8");
  const catalogSource = readFileSync(
    resolve(appDir, "data/movieCatalog.ts"),
    "utf8"
  );
  const combinedSource = `${homeSource}\n${styleSource}\n${catalogSource}`;

  assert.match(homeSource, /bg-\[#FFF8E1\]/);
  assert.match(homeSource, /text-\[#1C0800\]/);
  assert.match(homeSource, /#E82020/);
  assert.doesNotMatch(
    combinedSource,
    /#d8a85f|#7bb9a9|#b65f58|#8b8fbc|rgba\(216,\s*168,\s*95|rgba\(123,\s*185,\s*169/i
  );
});

test("home campaign uses animated navigation with public menu links", () => {
  const source = readFileSync(resolve(appDir, "page.tsx"), "utf8");

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
    "劇場案内",
    "ご利用ガイド",
  ]) {
    assert.match(source, new RegExp(navLabel));
  }

  assert.doesNotMatch(source, /購入情報確認|予約状況確認|My Tickets|Confirm/);
});