import {
  findScreening,
  formatTicketTypeSummary,
  movieDetail,
  normalizeTicketTypes,
  screenings,
} from "./seatSelection.mjs";

const defaultPaymentMethod = "クレジットカード";

export function buildPurchaseCompletion(draft, options = {}) {
  const now = options.now ?? new Date();
  const screening = findScreening(draft?.screeningId) ?? screenings[0];
  const seatIds = Array.isArray(draft?.seatIds) ? draft.seatIds : [];
  const ticketTypes = normalizeTicketTypes(draft?.ticketTypes);
  const fallbackTicketNum = draft?.ticketCount ?? seatIds.length;
  const ticketTypeCount = ticketTypes.reduce((total, ticketType) => total + ticketType.quantity, 0);
  const ticketNum = ticketTypeCount || fallbackTicketNum;
  const ticketTypeTotalPrice = ticketTypes.reduce(
    (total, ticketType) => total + ticketType.unitPrice * ticketType.quantity,
    0,
  );
  const ticketTotalPrice = draft?.ticketTotalPrice ?? (ticketTypeTotalPrice || draft?.totalPrice || screening.price * ticketNum);
  const foodItems = normalizeFoodItems(draft?.foodItems);
  const foodTotalPrice =
    draft?.foodTotalPrice ?? foodItems.reduce((total, item) => total + item.lineTotal, 0);
  const totalPrice = options.pricing?.total_price ?? draft?.totalPrice ?? ticketTotalPrice + foodTotalPrice;

  return {
    completeTitle: "ご購入が完了しました",
    completeMessage: "ご利用ありがとうございました。",
    mailGuide: options.pricing?.email_status === "queued"
      ? "予約確認メールの送信を受け付けました。購入内容はマイページでも確認できます。"
      : "購入内容はマイページの購入履歴から確認できます。",
    orderNum: options.orderNum ?? createOrderNum(now),
    purchaseDatetime: formatPurchaseDatetime(now),
    movieTitle: options.pricing?.movie_title ?? draft?.movieTitle ?? movieDetail.title,
    posterLabel: draft?.movieTitle ?? movieDetail.title,
    screeningDatetime: `${draft?.screeningDate ?? screening.dateLabel} ${draft?.screeningTime ?? screening.label}`,
    showStartAt: draft?.screeningDate && (draft?.screeningTime ?? screening.label)
      ? `${draft.screeningDate}T${draft.screeningTime ?? screening.label}:00+09:00`
      : "",
    screenName: draft?.screenName ?? screening.screenName,
    theaterName: draft?.theaterName ?? screening.theaterName,
    seatNum: formatSeatNumbers(draft?.seatLabels ?? seatIds),
    ticketNum,
    ticketTypes,
    ticketSummary: formatTicketTypeSummary(ticketTypes, ticketNum),
    ticketTotalPrice: options.pricing?.ticket_total_price ?? ticketTotalPrice,
    foodItems,
    foodTotalPrice: options.pricing?.food_total_price ?? foodTotalPrice,
    ...(options.pricing ? {
      subtotalAmount: options.pricing.subtotal_amount,
      couponCode: options.pricing.coupon_code,
      couponDiscountAmount: options.pricing.coupon_discount_amount,
      pointsUsed: options.pricing.points_used,
      pointsEarned: options.pricing.points_earned,
    } : {}),
    totalPrice,
    payMethod: options.payMethod ?? defaultPaymentMethod,
    payNum: options.payNum ?? createPaymentNum(now, seatIds),
  };
}

export function formatSeatNumbers(seatIds) {
  return seatIds.length > 0 ? seatIds.join(", ") : "-";
}

function normalizeFoodItems(foodItems) {
  if (!Array.isArray(foodItems)) {
    return [];
  }

  return foodItems
    .filter((item) => item && item.quantity > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    }));
}

function formatPurchaseDatetime(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function createOrderNum(date) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value ?? "00";

  return `ORD-${value("year")}${value("month")}${value("day")}-${value("hour")}${value("minute")}`;
}

function createPaymentNum(date, seatIds) {
  const seed = seatIds.join("").split("").reduce((total, char) => {
    return total + char.charCodeAt(0);
  }, date.getUTCMinutes() + date.getUTCHours());
  const first = String(7000 + (seed % 900)).padStart(4, "0");
  const second = String(1200 + (seed % 700)).padStart(4, "0");

  return `PAY-${first}-${second}`;
}
