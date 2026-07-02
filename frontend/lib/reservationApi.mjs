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

export function normalizeReservedSeatsResponse(payload) {
  return normalizeSeatLabels(payload?.reserved_seats);
}

export function buildReservationPayload(draft, userEmail = "") {
  return {
    user_email: String(userEmail ?? "").trim(),
    movie_id: draft?.movieId,
    screening_id: draft?.screeningId,
    screening_time: draft?.screeningTime,
    screen_name: draft?.screenName,
    seat_ids: normalizeSeatLabels(draft?.seatIds),
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
    return [];
  }

  return normalizeReservedSeatsResponse(await response.json());
}

export async function createReservation(
  draft,
  {
    apiBaseUrl = defaultApiBaseUrl,
    fetchImpl = fetch,
    userEmail = "",
  } = {},
) {
  const response = await fetchImpl(`${getApiBaseUrl(apiBaseUrl)}/api/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildReservationPayload(draft, userEmail)),
  });
  const payload = await safeReadJson(response);

  if (response.ok) {
    return {
      ok: true,
      reservationId: payload?.reservation_id,
    };
  }

  if (response.status === 409) {
    return {
      ok: false,
      conflict: true,
      conflictSeats: normalizeSeatLabels(payload?.conflict_seats),
    };
  }

  return {
    ok: false,
    conflict: false,
    message: payload?.error ?? "reservation_failed",
  };
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
