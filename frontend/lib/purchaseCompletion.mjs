import { findScreening, movieDetail, screenings } from "./seatSelection.mjs";

const defaultPaymentMethod = "クレジットカード";

export function buildPurchaseCompletion(draft, options = {}) {
  const now = options.now ?? new Date();
  const screening = findScreening(draft?.screeningId) ?? screenings[0];
  const seatIds = Array.isArray(draft?.seatIds) ? draft.seatIds : [];
  const ticketNum = draft?.ticketCount ?? seatIds.length;
  const ticketTotalPrice = draft?.ticketTotalPrice ?? draft?.totalPrice ?? screening.price * ticketNum;
  const foodItems = normalizeFoodItems(draft?.foodItems);
  const foodTotalPrice =
    draft?.foodTotalPrice ?? foodItems.reduce((total, item) => total + item.lineTotal, 0);
  const totalPrice = draft?.totalPrice ?? ticketTotalPrice + foodTotalPrice;

  return {
    completeTitle: "ご購入が完了しました",
    completeMessage: "ご利用ありがとうございました。",
    mailGuide: "ご登録のメールアドレスに購入完了メールを送信しました。",
    orderNum: options.orderNum ?? createOrderNum(now),
    purchaseDatetime: formatPurchaseDatetime(now),
    movieTitle: movieDetail.title,
    posterLabel: movieDetail.title,
    screeningDatetime: `${screening.dateLabel} ${draft?.screeningTime ?? screening.label}`,
    screenName: draft?.screenName ?? screening.screenName,
    theaterName: screening.theaterName,
    seatNum: formatSeatNumbers(seatIds),
    ticketNum,
    ticketTotalPrice,
    foodItems,
    foodTotalPrice,
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