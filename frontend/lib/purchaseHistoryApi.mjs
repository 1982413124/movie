import { findScreening, movieDetail } from "./seatSelection.mjs";

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

function normalizeStatus(status) {
  const statusText = String(status ?? "").trim().toLowerCase();

  if (statusText === "canceled" || statusText === "cancelled") {
    return "キャンセル済み";
  }

  if (statusText === "reserved" || statusText === "confirmed") {
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

function resolveMovieTitle(movieId) {
  if (movieId === movieDetail.id) {
    return movieDetail.title;
  }

  return movieId ? String(movieId) : "映画";
}

function resolveShowtime(item) {
  const screening = findScreening(item?.screening_id);
  const dateLabel = screening?.dateLabel ?? "";
  const timeLabel = item?.screening_time ?? screening?.label ?? "";

  return [dateLabel, timeLabel].filter(Boolean).join(" ") || "-";
}

export function normalizeReservationHistoryResponse(payload) {
  if (!Array.isArray(payload?.reservations)) {
    return [];
  }

  return payload.reservations.map((item) => {
    const seats = normalizeSeatLabels(item?.seats);

    return {
      id: String(item?.id ?? ""),
      purchasedAt: formatPurchasedAt(item?.created_at),
      movieTitle: resolveMovieTitle(item?.movie_id),
      screeningId: item?.screening_id ? String(item.screening_id) : "",
      showtime: resolveShowtime(item),
      screen: item?.screen_name ?? findScreening(item?.screening_id)?.screenName ?? "-",
      seats,
      ticketCount: Number(item?.ticket_count ?? seats.length),
      totalPrice: Number(item?.total_price ?? 0),
      status: normalizeStatus(item?.reservation_status),
      posterUrl: "",
    };
  });
}

export async function fetchReservationHistories(
  userEmail,
  { apiBaseUrl = defaultApiBaseUrl, fetchImpl = fetch } = {},
) {
  const normalizedEmail = String(userEmail ?? "").trim().toLowerCase();

  if (!normalizedEmail) {
    return [];
  }

  const response = await fetchImpl(
    `${getApiBaseUrl(apiBaseUrl)}/api/reservations?user_email=${encodeURIComponent(
      normalizedEmail,
    )}`,
  );

  if (!response.ok) {
    throw new Error("failed_to_fetch_reservation_histories");
  }

  return normalizeReservationHistoryResponse(await response.json());
}