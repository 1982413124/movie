import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(currentDir, "../app");
const memberPassSource = readFileSync(
  resolve(appDir, "components/MemberPass.tsx"),
  "utf8",
);
const memberRankSource = readFileSync(
  resolve(appDir, "components/MemberRankPanel.tsx"),
  "utf8",
);
const memberHomeSource = readFileSync(
  resolve(appDir, "components/HomeMemberPanel.tsx"),
  "utf8",
);
const memberIconSource = readFileSync(
  resolve(appDir, "components/MemberIcon.tsx"),
  "utf8",
);
const globalStyleSource = readFileSync(resolve(appDir, "globals.css"), "utf8");
const loginSource = readFileSync(resolve(appDir, "login/page.tsx"), "utf8");
const registerSource = readFileSync(resolve(appDir, "register/page.tsx"), "utf8");
const packageSource = readFileSync(resolve(currentDir, "../package.json"), "utf8");
const reservationExperienceSource = readFileSync(
  resolve(currentDir, "reservationExperience.mjs"),
  "utf8",
);

test("member area switches between the supplied rank program and profile", () => {
  assert.match(memberPassSource, /ランク・特典/);
  assert.match(memberPassSource, /会員情報/);
  assert.match(memberPassSource, /useState<MemberTabId>\("benefits"\)/);
  assert.match(memberPassSource, /MemberRankPanel/);
  assert.match(memberRankSource, /今月のランク/);
  assert.match(memberRankSource, /ご利用金額/);
  assert.match(memberRankSource, /ご来館回数/);
  assert.match(memberRankSource, /次のランクと特典/);
  assert.match(memberRankSource, /ランク特典一覧/);
  for (const suffix of ["r1_c1", "r1_c2", "r1_c3", "r1_c4"]) {
    assert.match(memberRankSource, new RegExp(`${suffix}\\.png`));
  }
  for (const label of ["ブロンズ", "シルバー", "ゴールド", "プラチナ"]) {
    assert.match(reservationExperienceSource, new RegExp(label));
  }
  assert.doesNotMatch(
    `${memberPassSource}\n${memberRankSource}\n${memberHomeSource}`,
    /保有ポイント|ポイント履歴|会員番号|クーポン/,
  );
});

test("member tabs support pointer and keyboard operation with complete aria relationships", () => {
  assert.match(memberPassSource, /role="tablist"/);
  assert.match(memberPassSource, /role="tab"/);
  assert.match(memberPassSource, /aria-selected=\{isSelected\}/);
  assert.match(memberPassSource, /aria-controls=\{`member-panel-\$\{tab\.id\}`\}/);
  assert.match(memberPassSource, /role="tabpanel"/);
  assert.match(memberPassSource, /aria-labelledby="member-tab-benefits"/);
  assert.match(memberPassSource, /aria-labelledby="member-tab-profile"/);
  for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
    assert.match(memberPassSource, new RegExp(key));
  }
  assert.match(memberPassSource, /tabRefs\.current\[index\]\?\.focus\(\)/);
});

test("benefit and profile content stay in separate tab panels", () => {
  assert.match(memberPassSource, /data-member-slot="benefits"/);
  assert.match(memberPassSource, /data-member-slot="profile"/);
  assert.match(memberPassSource, /hidden=\{activeTab !== "benefits"\}/);
  assert.match(memberPassSource, /hidden=\{activeTab !== "profile"\}/);
  assert.doesNotMatch(memberPassSource, /次回予約はありません|次の予約/);
  assert.doesNotMatch(memberHomeSource, /MemberBenefit/);
});

test("member progress is accessible and bounded", () => {
  assert.equal((memberRankSource.match(/<RankMetric/g) ?? []).length, 2);
  assert.equal((memberRankSource.match(/role="progressbar"/g) ?? []).length, 1);
  assert.match(memberRankSource, /aria-valuemin=\{0\}/);
  assert.match(memberRankSource, /aria-valuemax=\{valueMax\}/);
  assert.match(
    memberRankSource,
    /aria-valuenow=\{Math\.min\(valueNow, valueMax\)\}/,
  );
  assert.match(memberRankSource, /aria-label=\{`今月の\$\{label\}/);
  assert.match(memberRankSource, /aria-current=\{state === "current" \? "step"/);
  assert.doesNotMatch(memberRankSource, /MapPinIcon|member-rank-segment-divider/);
});

test("member home derives rank spend and visits from reservation history", () => {
  assert.match(memberHomeSource, /calculateMonthlyRankSummary\(histories\)/);
  assert.match(memberHomeSource, /rankSummary=\{rankSummary\}/);
  assert.match(memberPassSource, /summary=\{rankSummary\}/);

  for (const benefit of [
    "予約履歴を確認",
    "Sドリンク1杯無料",
    "Mドリンク1杯無料",
    "ポップコーンS無料",
  ]) {
    assert.match(reservationExperienceSource, new RegExp(benefit));
  }
});

test("member profile masks private contact details and exposes only working actions", () => {
  assert.match(memberPassSource, /maskEmail\(email\)/);
  assert.match(memberPassSource, /maskPhone\(phone\)/);
  assert.match(memberPassSource, /formatMemberSince\(createdAt\)/);
  assert.match(memberPassSource, /メールアドレスは一部を非表示/);
  assert.match(memberPassSource, /電話番号は一部を非表示/);
  assert.match(memberPassSource, /href="\/mypage\?view=settings"/);
  assert.match(memberPassSource, /onClick=\{onLogout\}/);
  assert.doesNotMatch(memberPassSource, />\s*\{email\}\s*</);
  assert.doesNotMatch(memberPassSource, />\s*\{phone\}\s*</);
});

test("member shortcuts remove the duplicate profile destination", () => {
  for (const target of [
    "/mypage?view=reservations",
    "/mypage?view=history",
    "/mypage?view=settings",
  ]) {
    assert.match(memberHomeSource, new RegExp(target.replaceAll("?", "\\?")));
  }

  for (const label of ["次の予約", "予約履歴", "登録情報"]) {
    assert.match(memberHomeSource, new RegExp(label));
  }

  assert.match(memberHomeSource, /aria-label="会員機能"/);
  assert.doesNotMatch(memberHomeSource, /href:\s*"\/mypage\?view=profile"/);
  assert.doesNotMatch(memberHomeSource, /href="\/(?:coupon|notice|benefit)/);
});

test("reservation loading and errors do not block the member profile tab", () => {
  assert.match(memberPassSource, /会員情報タブはそのまま確認できます/);
  assert.match(memberHomeSource, /次の予約を読み込み中/);
  assert.match(memberHomeSource, /次の予約を取得できませんでした/);
  assert.match(memberHomeSource, /もう一度読み込む/);
  assert.equal(
    (memberHomeSource.match(/fetchReservationHistories\(email\)/g) ?? []).length,
    1,
  );
});

test("mobile content order is member area, next reservation, then shortcuts", () => {
  const memberAreaIndex = memberHomeSource.indexOf("<MemberPass");
  const reservationIndex = memberHomeSource.indexOf("<NextReservationCard");
  const shortcutsIndex = memberHomeSource.indexOf("<MemberShortcuts");

  assert.ok(memberAreaIndex >= 0);
  assert.ok(reservationIndex > memberAreaIndex);
  assert.ok(shortcutsIndex > reservationIndex);
  assert.match(memberHomeSource, /order-1/);
  assert.match(memberHomeSource, /order-2/);
  assert.match(memberHomeSource, /order-3/);
});

test("reservation card owns booking details and does not pretend QR exists", () => {
  assert.match(memberHomeSource, /findNextReservation/);
  assert.match(memberHomeSource, /movies\.find/);
  assert.match(memberHomeSource, /formatFoodSummary/);
  assert.match(memberHomeSource, /getFoodPickupDetails/);
  assert.match(memberHomeSource, /予約詳細を見る/);
  assert.doesNotMatch(
    `${memberPassSource}\n${memberHomeSource}`,
    /QrCode|Barcode|QRコード|バーコード|予約QRを表示|入場・フード受取用QR/i,
  );
});

test("registration date returned by auth APIs is retained for the member profile", () => {
  assert.match(registerSource, /createdAt:\s*payload\.user\.created_at/);
  assert.match(loginSource, /createdAt:\s*payload\.user\.created_at/);
  assert.match(memberHomeSource, /createdAt=\{account\.createdAt\}/);
});

test("functional member icons use the shared Heroicons outline system", () => {
  assert.match(packageSource, /"@heroicons\/react":\s*"\^2\.2\.0"/);
  assert.match(memberIconSource, /@heroicons\/react\/24\/outline/);
  assert.match(memberIconSource, /PencilSquareIcon/);
  assert.match(memberIconSource, /ArrowRightStartOnRectangleIcon/);
  assert.match(memberIconSource, /aria-hidden="true"/);
  assert.doesNotMatch(memberIconSource, /<svg|<path|emoji|lucide/i);
});

test("member UI keeps the neutral HAL palette and semantic colors", () => {
  assert.match(globalStyleSource, /--member-green:\s*#258a58/i);
  assert.match(globalStyleSource, /--info-blue:\s*#2879b9/i);
  assert.match(globalStyleSource, /--benefit-gold:\s*#8f6518/i);
  assert.match(globalStyleSource, /--booking-red-strong:\s*#ce332b/i);
  assert.match(globalStyleSource, /\.member-tab\[aria-selected="true"\]/);
  assert.match(globalStyleSource, /\.member-icon-shell--member/);
  assert.match(globalStyleSource, /\.member-icon-shell--booking/);
  assert.match(globalStyleSource, /\.member-icon-shell--history/);
  assert.match(globalStyleSource, /\.member-icon-shell--benefit/);
  assert.match(globalStyleSource, /--rank-bronze:\s*#a75a31/i);
  assert.match(globalStyleSource, /--rank-silver:\s*#66738b/i);
  assert.match(globalStyleSource, /--rank-gold:\s*#aa7400/i);
  assert.match(globalStyleSource, /--rank-platinum:\s*#5b55af/i);
  assert.match(globalStyleSource, /\.member-rank-reference-card/);
  assert.match(globalStyleSource, /\.member-rank-metric-caption/);
  assert.match(globalStyleSource, /\.member-rank-benefits-summary/);
});

test("logged-in member area stays near the top before the film lineup", () => {
  const homeSource = readFileSync(resolve(appDir, "page.tsx"), "utf8");
  const memberHomeIndex = homeSource.indexOf("<HomeMemberPanel />");
  const lineupIndex = homeSource.indexOf('id="today"');

  assert.ok(memberHomeIndex >= 0);
  assert.ok(lineupIndex >= 0);
  assert.ok(memberHomeIndex < lineupIndex);
});

test("member shortcuts open the requested mypage panel", () => {
  const mypageSource = readFileSync(resolve(appDir, "mypage/page.tsx"), "utf8");

  assert.match(mypageSource, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(mypageSource, /VIEW_MENU_KEYS/);
  assert.match(mypageSource, /setActiveMenu\(view\)/);
});
