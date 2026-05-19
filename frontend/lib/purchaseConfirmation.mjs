import { findScreening, movieDetail, screenings } from "./seatSelection.mjs";
import { formatSeatNumbers } from "./purchaseCompletion.mjs";

export const paymentMethods = [
  {
    id: "credit-card",
    label: "クレジットカード",
    description: "VISA / Mastercard / JCB",
  },
  {
    id: "qr-pay",
    label: "QR決済",
    description: "PayPay / 楽天ペイ",
  },
  {
    id: "convenience",
    label: "コンビニ払い",
    description: "店頭支払い番号を発行",
  },
  {
    id: "bank-transfer",
    label: "銀行振込",
    description: "振込先をメールで案内",
  },
  {
    id: "gift-card",
    label: "ギフトカード",
    description: "映画館ギフトを利用",
  },
  {
    id: "points",
    label: "ポイント利用",
    description: "会員ポイントで支払い",
  },
];

export function buildPurchaseConfirmation(draft) {
  const screening = findScreening(draft?.screeningId) ?? screenings[0];
  const seatIds = Array.isArray(draft?.seatIds) ? draft.seatIds : [];
  const ticketNum = draft?.ticketCount ?? seatIds.length;

  return {
    movieTitle: movieDetail.title,
    posterLabel: movieDetail.title,
    theaterName: screening.theaterName,
    screeningDatetime: `${screening.dateLabel} ${draft?.screeningTime ?? screening.label}`,
    screenName: draft?.screenName ?? screening.screenName,
    seatNum: formatSeatNumbers(seatIds),
    ticketNum,
    totalPrice: draft?.totalPrice ?? screening.price * ticketNum,
  };
}

export function validatePaymentMethod(paymentMethodId) {
  if (!paymentMethodId) {
    return {
      ok: false,
      message: "支払い方法を選択してください。",
    };
  }

  const exists = paymentMethods.some((method) => method.id === paymentMethodId);

  if (!exists) {
    return {
      ok: false,
      message: "利用できない支払い方法です。",
    };
  }

  return { ok: true, message: "" };
}

export function findPaymentMethod(paymentMethodId) {
  return paymentMethods.find((method) => method.id === paymentMethodId);
}
