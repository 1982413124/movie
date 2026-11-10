import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { toMovieCard } from "./public-movie-catalog.mjs";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");

test("home movie cards preserve database poster images and descriptive alt text", () => {
  for (const imagePath of ["/images/man.jpg", "/images/gozira.jpg"]) {
    assert.ok(existsSync(resolve(currentDir, "../public", imagePath.slice(1))));
    const card = toMovieCard({ id: "test-movie", title: "テスト作品", duration_minutes: 120, status: "NOW_SHOWING", poster_image: imagePath });
    assert.equal(card.imageSrc, imagePath);
    assert.equal(card.imageAlt, "テスト作品のポスター");
  }
  const uploaded = toMovieCard({ id: "new-movie", title: "新しい作品", duration_minutes: 100, status: "UNSCHEDULED", poster_image: "/api/cinema/media/test.webp" });
  assert.equal(uploaded.imageSrc, "/api/cinema/media/test.webp");
  assert.equal(uploaded.imageAlt, "新しい作品のポスター");
});

test("home leads with the combined movie and food reservation", () => {
  const source = readFileSync(resolve(appDir, "page.tsx"), "utf8");

  assert.match(source, /映画とフードを、/);
  assert.match(source, /まとめて予約。/);
  assert.match(source, /映画を選ぶ/);
  assert.match(source, /本日観られる映画を見る/);
  assert.match(source, /HomeMemberPanel/);
  assert.doesNotMatch(source, /gsap|ScrollTrigger|js-loader/);
});

test("home palette uses neutral surfaces with HAL red as the limited accent", () => {
  const styleSource = readFileSync(resolve(appDir, "globals.css"), "utf8");

  assert.match(styleSource, /--page-bg:\s*#f4f5f5/i);
  assert.match(styleSource, /--surface-bg:\s*#ffffff/i);
  assert.match(styleSource, /--surface-muted:\s*#f0f1f1/i);
  assert.match(styleSource, /--text-primary:\s*#121212/i);
  assert.match(styleSource, /--text-secondary:\s*#62676d/i);
  assert.match(styleSource, /--text-muted:\s*#686d72/i);
  assert.match(styleSource, /--accent:\s*#ce332b/i);
  assert.match(styleSource, /--accent-strong:\s*#b42b25/i);
});

test("shared header keeps public menu links accessible", () => {
  const source = readFileSync(resolve(appDir, "components/CampaignHeader.tsx"), "utf8");

  assert.match(source, /aria-expanded=\{isMenuOpen\}/);
  assert.match(source, /aria-label="メインナビゲーション"/);

  for (const navLabel of ["ホーム", "作品を探す", "マイページ", "劇場案内", "ご利用ガイド"]) {
    assert.match(source, new RegExp(navLabel));
  }
});
