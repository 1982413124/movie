let sessionRequest;

async function requestHold(path, options = {}) {
  const response = await fetch(`/api/cinema/${path}`, {
    ...options, credentials: "same-origin", cache: "no-store",
    signal: options.signal ?? AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.message || "仮押さえの状態を確認できませんでした。");
    error.code = result.code;
    throw error;
  }
  return result;
}

export function prepareHoldSession() {
  // Share the first cookie request across components and Strict Mode mounts.
  if (!sessionRequest) {
    sessionRequest = requestHold("reservations/hold-session", { method: "POST" })
      .finally(() => { sessionRequest = undefined; });
  }
  return sessionRequest;
}

export function readSeatHolds(showingId, signal) {
  return requestHold(`screenings/${encodeURIComponent(showingId)}/holds`, { signal });
}

export async function changeSeatHold(showingId, seatId, selected) {
  await prepareHoldSession();
  return requestHold(`screenings/${encodeURIComponent(showingId)}/holds/${encodeURIComponent(seatId)}`,
    { method: selected ? "PUT" : "DELETE" });
}

export function secondsRemaining(expiresAt, now) {
  const remaining = Math.ceil((Date.parse(expiresAt) - now) / 1000);
  return Number.isFinite(remaining) ? Math.max(0, remaining) : 0;
}

export function formatHoldRemaining(seconds) {
  return `${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, "0")}秒`;
}

export function hasAllHeldSeats(snapshot, seatIds, now) {
  return Boolean(seatIds?.length) && secondsRemaining(snapshot?.expires_at, now) > 0
    && seatIds.every(id => snapshot.seat_ids.includes(id));
}

export function seatHoldStatus(seat, now) {
  if (seat.reserved) return "reserved";
  if (secondsRemaining(seat.hold_expires_at, now) > 0) return seat.held_by_me ? "selected" : "held";
  return "available";
}
