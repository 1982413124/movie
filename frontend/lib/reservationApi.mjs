import { memberFetch, MemberApiError } from "./member-api.mjs";
import { normalizeTicketTypes } from "./seatSelection.mjs";

const defaultApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

function getApiBaseUrl(apiBaseUrl = defaultApiBaseUrl) {
  return String(apiBaseUrl ?? "").replace(/\/$/, "");
}

function normalizeSeatLabels(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((seatId) => String(seatId ?? "").trim())
    .filter(Boolean);
}

function normalizeTicketTypePayload(value) {
  return normalizeTicketTypes(value).map((ticketType) => ({
    ticket_type_id: ticketType.ticketTypeId,
    label: ticketType.label,
    unit_price: ticketType.unitPrice,
    quantity: ticketType.quantity,
  }));
}

function normalizeFoodItemPayload(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const foodId = String(item?.foodId ?? item?.food_id ?? item?.id ?? "").trim();
      const name = String(item?.name ?? foodId).trim();
      const unitPrice = Number(item?.unitPrice ?? item?.unit_price ?? item?.price ?? 0);
      const quantity = Number(item?.quantity ?? 0);
      const subtotal = Number(item?.subtotal ?? item?.lineTotal ?? unitPrice * quantity);

      return {
        food_id: foodId,
        name,
        unit_price: Number.isFinite(unitPrice) ? Math.max(0, Math.floor(unitPrice)) : 0,
        quantity: Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0,
        subtotal: Number.isFinite(subtotal) ? Math.max(0, Math.floor(subtotal)) : 0,
      };
    })
    .filter((item) => item.food_id && item.name && item.quantity > 0);
}

export function normalizeReservedSeatsResponse(payload) {
  return normalizeSeatLabels(payload?.reserved_seats);
}

export function buildReservationPayload(draft, userEmail = "", paymentMethod = "") {
  return {
    user_email: String(userEmail ?? "").trim(),
    movie_id: draft?.movieId,
    movie_title: draft?.movieTitle,
    movie_duration_minutes: Number(draft?.movieDurationMinutes ?? 0),
    screening_id: draft?.screeningId,
    screening_time: draft?.screeningTime,
    screening_date: draft?.screeningDate,
    ...(draft?.endTime ? { end_time: draft.endTime } : {}),
    screen_id: draft?.screenId,
    screen_name: draft?.screenName,
    screen_capacity: Number(draft?.screenCapacity ?? 0),
    theater_name: draft?.theaterName,
    seat_ids: normalizeSeatLabels(draft?.seatIds),
    ticket_types: normalizeTicketTypePayload(draft?.ticketTypes),
    food_items: normalizeFoodItemPayload(draft?.foodItems),
    payment_method: String(paymentMethod ?? "").trim(),
    ticket_count: Number(draft?.ticketCount ?? 0),
    ticket_total_price: Number(draft?.ticketTotalPrice ?? 0),
    food_total_price: Number(draft?.foodTotalPrice ?? 0),
    total_price: Number(draft?.totalPrice ?? 0),
  };
}

export async function fetchReservedSeats(
  screeningId,
  { apiBaseUrl = defaultApiBaseUrl, fetchImpl = fetch } = {},
) {
  if (!screeningId) {
    return [];
  }

  const response = await fetchImpl(
    `${getApiBaseUrl(apiBaseUrl)}/api/screenings/${encodeURIComponent(
      screeningId,
    )}/reserved-seats`,
  );

  if (!response.ok) {
    throw new Error("座席情報を取得できませんでした。");
  }

  return normalizeReservedSeatsResponse(await response.json());
}

export async function createReservation(
  draft,
  {
    apiBaseUrl,
    fetchImpl = fetch,
    paymentMethod = "",
    userEmail = "",
    couponCode = "",
    pointsToUse = 0,
    expectedTotal,
    contactEmail = "",
  } = {},
) {
  let response;
  try {
    response = await memberFetch("reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...buildReservationPayload(draft, userEmail, paymentMethod),
      coupon_code: couponCode, points_to_use: pointsToUse, contact_email: contactEmail,
      ...(expectedTotal === undefined ? {} : { expected_total: expectedTotal }),
    }),
    }, { apiBaseUrl, fetchImpl, optional: !userEmail });
  } catch (error) {
    if (error instanceof MemberApiError) return { ok: false, conflict: false, message: error.message };
    throw error;
  }
  const payload = await safeReadJson(response);

  if (response.ok) {
    return {
      ok: true,
      reservationId: payload?.reservation_id,
      pricing: payload,
    };
  }

  if (response.status === 409 && Array.isArray(payload?.conflict_seats)) {
    return {
      ok: false,
      conflict: true,
      conflictSeats: normalizeSeatLabels(payload?.conflict_seats),
    };
  }

  return {
    ok: false,
    conflict: false,
    message: payload?.message ?? payload?.error ?? "reservation_failed",
    code: payload?.code,
  };
}

export async function quoteReservation(draft, { couponCode = "", pointsToUse = 0, signal, ...options } = {}) {
  const response = await memberFetch("reservations/quote", {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ ...buildReservationPayload(draft), coupon_code: couponCode, points_to_use: pointsToUse }),
  }, { ...options, optional: true });
  const payload = await safeReadJson(response);
  if (!response.ok) {
    const error = new MemberApiError(payload.message ?? "料金を確認できませんでした。", response.status);
    error.code = payload.code;
    throw error;
  }
  return payload;
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
