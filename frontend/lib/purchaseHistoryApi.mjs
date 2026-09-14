import {
  findScreening,
  formatTicketTypeSummary,
  movieDetail,
  normalizeTicketTypes,
} from "./seatSelection.mjs";

import { memberFetch, MemberApiError } from "./member-api.mjs";

function normalizeSeatLabels(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((seatId) => String(seatId ?? "").trim())
    .filter(Boolean);
}

function normalizeFoodItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const foodId = String(item?.food_id ?? item?.foodId ?? item?.id ?? "").trim();
      const name = String(item?.name ?? foodId).trim();
      const quantity = Number(item?.quantity ?? 0);
      const unitPrice = Number(item?.unit_price ?? item?.unitPrice ?? item?.price ?? 0);
      const subtotal = Number(item?.subtotal ?? item?.lineTotal ?? unitPrice * quantity);

      return {
        foodId,
        name,
        quantity: Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0,
        unitPrice: Number.isFinite(unitPrice) ? Math.max(0, Math.floor(unitPrice)) : 0,
        subtotal: Number.isFinite(subtotal) ? Math.max(0, Math.floor(subtotal)) : 0,
      };
    })
    .filter((item) => item.foodId && item.name && item.quantity > 0);
}
function normalizeStatus(status) {
  const statusText = String(status ?? "").trim().toLowerCase();

  if (statusText === "canceled" || statusText === "cancelled") {
    return "キャンセル済み";
  }

  if (statusText === "reserved" || statusText === "confirmed" || statusText === "paid") {
    return "予約済み";
  }

  return statusText || "予約済み";
}

function formatPurchasedAt(value) {
  if (!value) {
    return "-";
  }

  const normalizedValue = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? value
    : `${value}Z`;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

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

function resolveMovieTitle(movieId, purchasedTitle) {
  if (purchasedTitle) {
    return String(purchasedTitle);
  }

  if (movieId === movieDetail.id) {
    return movieDetail.title;
  }

  return movieId ? String(movieId) : "映画";
}

function resolveShowtime(item) {
  const screening = findScreening(item?.screening_id);
  const dateLabel = item?.show_date ?? item?.screening_date ?? screening?.dateLabel ?? "";
  const timeLabel = String(item?.screening_time ?? screening?.label ?? "").slice(0, 5);

  return [dateLabel, timeLabel].filter(Boolean).join(" ") || "-";
}

function resolveShowDate(item) {
  const value = String(item?.show_date ?? item?.screening_date ?? "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return findScreening(item?.screening_id)?.dateId ?? "";
}

function resolveShowStartAt(item) {
  const showDate = resolveShowDate(item);
  const screening = findScreening(item?.screening_id);
  const time = String(item?.screening_time ?? screening?.label ?? "").trim();

  return showDate && /^\d{2}:\d{2}/.test(time)
    ? `${showDate}T${time.slice(0, 5)}:00+09:00`
    : "";
}

export function normalizeReservationHistoryResponse(payload) {
  if (!Array.isArray(payload?.reservations)) {
    return [];
  }

  return payload.reservations.map((item) => {
    const seats = normalizeSeatLabels(item?.seat_labels ?? item?.seats);
    const ticketTypes = normalizeTicketTypes(item?.ticket_types);
    const foodItems = normalizeFoodItems(item?.food_items);
    const ticketCount = Number(
      item?.ticket_count ?? (ticketTypes.reduce((total, ticketType) => total + ticketType.quantity, 0) || seats.length),
    );

    return {
      id: String(item?.id ?? ""),
      purchasedAt: formatPurchasedAt(item?.created_at),
      purchasedAtRaw: String(item?.created_at ?? "").trim(),
      movieId: item?.movie_id ? String(item.movie_id) : "",
      movieTitle: resolveMovieTitle(item?.movie_id, item?.movie_title),
      screeningId: item?.screening_id ? String(item.screening_id) : "",
      showDate: resolveShowDate(item),
      showStartAt: item?.show_start_at ?? resolveShowStartAt(item),
      showtime: resolveShowtime(item),
      screen: item?.screen_name ?? findScreening(item?.screening_id)?.screenName ?? "-",
      seats,
      ticketCount,
      ticketTypes,
      ticketSummary: formatTicketTypeSummary(ticketTypes, ticketCount),
      foodItems,
      totalPrice: Number(item?.total_price ?? 0),
      ...(item?.subtotal_amount === undefined ? {} : {
        subtotalAmount: Number(item.subtotal_amount),
        ticketTotalPrice: Number(item.ticket_total_price ?? 0),
        couponCode: item.coupon_code ?? "",
        couponDiscountAmount: Number(item.coupon_discount_amount ?? 0),
        pointsUsed: Number(item.points_used ?? 0),
        pointsEarned: Number(item.points_earned ?? 0),
        orderNum: item.order_num ?? String(item.id),
      }),
      status: normalizeStatus(item?.reservation_status),
      orderStatus: String(item?.reservation_status ?? "").trim().toLowerCase(),
      paymentStatus: String(item?.payment_status ?? "").trim().toLowerCase() || "unpaid",
      posterUrl: "",
      canCancel: item?.can_cancel,
      cancelDeadline: item?.cancel_deadline ?? "",
      cancelReason: item?.cancel_reason ?? "",
      refundMode: item?.refund_mode ?? "",

    };
  });
}

export async function fetchReservationHistories(userEmail, options = {}) {
  if (!String(userEmail ?? "").trim()) return [];
  const response = await memberFetch("reservations", {}, options);
  const payload = await safeReadJson(response);
  if (!response.ok) throw new MemberApiError(payload.message ?? "予約履歴を取得できませんでした。", response.status);
  return normalizeReservationHistoryResponse(payload);
}

export async function cancelReservation(reservationId, userEmail, options = {}) {
  const id = String(reservationId ?? "").trim();
  if (!id) return { ok: false, message: "予約を選択してください。" };
  try {
    const response = await memberFetch(`reservations/${encodeURIComponent(id)}/cancel`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}",
    }, options);
    const payload = await safeReadJson(response);
    if (!response.ok) return { ok: false, message: payload.message ?? "キャンセルできませんでした。", httpStatus: response.status };
    return {
      ok: true, status: normalizeStatus(payload.reservation_status),
      orderStatus: payload.reservation_status, paymentStatus: payload.payment_status,
      refundMode: payload.refund_mode, refundedAmount: payload.refunded_amount,
      message: payload.message ?? "キャンセル完了。",
    };
  } catch (error) {
    if (error instanceof MemberApiError) return { ok: false, message: error.message, httpStatus: error.status };
    throw error;
  }
}

async function safeReadJson(response) {
  try { return await response.json(); } catch { return {}; }
}
