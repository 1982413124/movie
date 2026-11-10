export const MEMBER_REWARD_RULE = Object.freeze({
  monthlyTarget: 3,
  rewardLabel: "Mサイズドリンク無料",
});

export const MEMBER_RANK_RULES = Object.freeze([
  Object.freeze({
    id: "bronze",
    label: "ブロンズ",
    spendTarget: 0,
    visitTarget: 0,
    benefitLabel: "予約履歴を確認",
  }),
  Object.freeze({
    id: "silver",
    label: "シルバー",
    spendTarget: 5_000,
    visitTarget: 1,
    benefitLabel: "Sドリンク1杯無料",
  }),
  Object.freeze({
    id: "gold",
    label: "ゴールド",
    spendTarget: 15_000,
    visitTarget: 3,
    benefitLabel: "Mドリンク1杯無料",
  }),
  Object.freeze({
    id: "platinum",
    label: "プラチナ",
    spendTarget: 30_000,
    visitTarget: 6,
    benefitLabel: "ポップコーンS無料",
  }),
]);

export const FOOD_PICKUP_RULE = Object.freeze({
  opensMinutesBefore: 20,
  closesMinutesBefore: 5,
  locationLabel: "フード受取カウンター",
});

function normalizeStatus(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getJapanYearMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return {
    year: Number(year),
    month: Number(month),
    monthText: month ?? "",
  };
}

function getJapanMonthPrefix(now = new Date()) {
  const { year, monthText } = getJapanYearMonth(now);
  return year && monthText ? `${year}-${monthText}` : "";
}

function getPurchaseMonthPrefix(history) {
  const rawValue = String(history?.purchasedAtRaw ?? "").trim();

  if (rawValue) {
    const normalizedValue = /(?:z|[+-]\d{2}:?\d{2})$/i.test(rawValue)
      ? rawValue
      : `${rawValue}Z`;
    const purchasedAt = new Date(normalizedValue);

    if (!Number.isNaN(purchasedAt.getTime())) {
      return getJapanMonthPrefix(purchasedAt);
    }
  }

  const formattedMatch = String(history?.purchasedAt ?? "").match(
    /^(\d{4})[/-](\d{2})/,
  );

  if (formattedMatch) {
    return `${formattedMatch[1]}-${formattedMatch[2]}`;
  }

  const showDate = String(history?.showDate ?? "");
  return /^\d{4}-\d{2}/.test(showDate) ? showDate.slice(0, 7) : "";
}

export function getMonthlyBenefitPeriod(now = new Date()) {
  const { year, month, monthText } = getJapanYearMonth(now);

  if (!year || !month || !monthText) {
    return {
      startDate: "",
      endDate: "",
      label: "対象期間を確認できません",
    };
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDayText = String(lastDay).padStart(2, "0");

  return {
    startDate: `${year}-${monthText}-01`,
    endDate: `${year}-${monthText}-${lastDayText}`,
    label: `対象期間：${year}年${month}月1日〜${month}月${lastDay}日`,
  };
}

export function getShowStartDate(history) {
  const source = history?.showStartAt;

  if (!source) {
    return null;
  }

  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isCanceledOrRefunded(history) {
  const orderStatus = normalizeStatus(history?.orderStatus ?? history?.status);
  const paymentStatus = normalizeStatus(history?.paymentStatus);

  return (
    orderStatus === "cancelled" ||
    orderStatus === "canceled" ||
    orderStatus === "キャンセル済み" ||
    paymentStatus === "refunded" ||
    orderStatus === "返金済み"
  );
}

export function isPaidReservation(history) {
  return normalizeStatus(history?.paymentStatus) === "paid" && !isCanceledOrRefunded(history);
}

export function isUpcomingReservation(history, now = new Date()) {
  const showStart = getShowStartDate(history);

  return Boolean(showStart && showStart.getTime() > now.getTime() && isPaidReservation(history));
}

export function findNextReservation(histories, now = new Date()) {
  if (!Array.isArray(histories)) {
    return null;
  }

  return (
    histories
      .filter((history) => isUpcomingReservation(history, now))
      .sort((first, second) => {
        const firstTime = getShowStartDate(first)?.getTime() ?? Number.POSITIVE_INFINITY;
        const secondTime = getShowStartDate(second)?.getTime() ?? Number.POSITIVE_INFINITY;
        return firstTime - secondTime;
      })[0] ?? null
  );
}

export function calculateMonthlyMemberProgress(histories, now = new Date()) {
  const monthPrefix = getJapanMonthPrefix(now);
  const uniqueReservationIds = new Set();

  for (const history of Array.isArray(histories) ? histories : []) {
    const reservationId = String(history?.id ?? "").trim();

    if (
      reservationId &&
      history?.showDate?.startsWith(monthPrefix) &&
      isPaidReservation(history)
    ) {
      uniqueReservationIds.add(reservationId);
    }
  }

  const completed = uniqueReservationIds.size;
  const remaining = Math.max(0, MEMBER_REWARD_RULE.monthlyTarget - completed);

  return {
    completed,
    remaining,
    target: MEMBER_REWARD_RULE.monthlyTarget,
    rewardLabel: MEMBER_REWARD_RULE.rewardLabel,
    ratio: Math.min(1, completed / MEMBER_REWARD_RULE.monthlyTarget),
  };
}

export function calculateMonthlyRankSummary(histories, now = new Date()) {
  const monthPrefix = getJapanMonthPrefix(now);
  const purchaseIds = new Set();
  const visitIds = new Set();
  let amountSpent = 0;

  for (const history of Array.isArray(histories) ? histories : []) {
    const reservationId = String(history?.id ?? "").trim();

    if (!reservationId || !isPaidReservation(history)) {
      continue;
    }

    if (
      !purchaseIds.has(reservationId) &&
      getPurchaseMonthPrefix(history) === monthPrefix
    ) {
      const totalPrice = Number(history?.totalPrice ?? 0);
      amountSpent += Number.isFinite(totalPrice)
        ? Math.max(0, Math.floor(totalPrice))
        : 0;
      purchaseIds.add(reservationId);
    }

    const showStart = getShowStartDate(history);

    if (
      !visitIds.has(reservationId) &&
      history?.showDate?.startsWith(monthPrefix) &&
      showStart &&
      showStart.getTime() <= now.getTime()
    ) {
      visitIds.add(reservationId);
    }
  }

  const visitCount = visitIds.size;
  let currentRankIndex = 0;

  MEMBER_RANK_RULES.forEach((rank, index) => {
    if (amountSpent >= rank.spendTarget && visitCount >= rank.visitTarget) {
      currentRankIndex = index;
    }
  });

  const nextRankIndex = currentRankIndex < MEMBER_RANK_RULES.length - 1
    ? currentRankIndex + 1
    : null;
  const nextRank = nextRankIndex === null ? null : MEMBER_RANK_RULES[nextRankIndex];
  const highestRank = MEMBER_RANK_RULES[MEMBER_RANK_RULES.length - 1];
  const targetRank = nextRank ?? highestRank;

  return {
    amountSpent,
    visitCount,
    currentRankIndex,
    currentRankId: MEMBER_RANK_RULES[currentRankIndex].id,
    nextRankIndex,
    remainingAmount: nextRank
      ? Math.max(0, nextRank.spendTarget - amountSpent)
      : 0,
    remainingVisits: nextRank
      ? Math.max(0, nextRank.visitTarget - visitCount)
      : 0,
    amountRatio: Math.min(1, amountSpent / targetRank.spendTarget),
    visitRatio: Math.min(1, visitCount / targetRank.visitTarget),
  };
}

export function getReservationDisplayStatus(history, now = new Date()) {
  if (normalizeStatus(history?.paymentStatus) === "refunded" && history?.refundMode !== "simulation") {
    return "返金済み";
  }

  if (isCanceledOrRefunded(history)) {
    return "キャンセル済み";
  }

  const showStart = getShowStartDate(history);
  if (showStart && showStart.getTime() <= now.getTime()) {
    return "上映終了";
  }

  if (normalizeStatus(history?.paymentStatus) === "paid") {
    return "支払い済み";
  }

  return "予約済み";
}

export { canCancelReservation } from "./reservationCancellation.mjs";

export function formatFoodSummary(foodItems) {
  if (!Array.isArray(foodItems) || foodItems.length === 0) {
    return "注文なし";
  }

  return foodItems.map((item) => `${item.name} × ${item.quantity}`).join("、");
}

function formatTime(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function getFoodPickupWindow(showStartAt) {
  const showStart = getShowStartDate({ showStartAt });

  if (!showStart) {
    return {
      timeLabel: "上映前に予約詳細で確認",
      locationLabel: FOOD_PICKUP_RULE.locationLabel,
    };
  }

  const opensAt = new Date(showStart.getTime() - FOOD_PICKUP_RULE.opensMinutesBefore * 60 * 1000);
  const closesAt = new Date(showStart.getTime() - FOOD_PICKUP_RULE.closesMinutesBefore * 60 * 1000);

  return {
    timeLabel: `${formatTime(opensAt)}〜${formatTime(closesAt)}`,
    locationLabel: FOOD_PICKUP_RULE.locationLabel,
  };
}

export function getFoodPickupDetails(history) {
  if (!history?.foodItems?.length) {
    return null;
  }

  return getFoodPickupWindow(history.showStartAt);
}
