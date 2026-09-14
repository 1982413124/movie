export function cancellationDeadline(history) {
  const start = new Date(history?.showStartAt ?? "");
  const value = history?.cancelDeadline
    ? new Date(history.cancelDeadline)
    : new Date(start.getTime() - 60 * 60 * 1000);
  return Number.isFinite(value.getTime()) ? value : null;
}

export function cancellationReason(history, now = new Date()) {
  if (["cancelled", "canceled", "キャンセル済み"].includes(history?.orderStatus ?? history?.status)
      || history?.paymentStatus === "refunded") return "キャンセル済みです。";
  if (!["paid", "pending", "confirmed", "reserved", "予約済み"].includes(history?.orderStatus ?? history?.status)) {
    return "この予約はキャンセルできません。";
  }
  const deadline = cancellationDeadline(history);
  if (!deadline) return "上映日時を確認できないため、運営担当者へご連絡ください。";
  if (now.getTime() > deadline.getTime()) return "キャンセル期限（上映開始の1時間前）を過ぎています。";
  if (history?.canCancel === false) return history.cancelReason || "この予約はキャンセルできません。";
  return "";
}

export function canCancelReservation(history, now = new Date()) {
  return cancellationReason(history, now) === "";
}

export function formatCancellationDeadline(history) {
  const deadline = cancellationDeadline(history);
  return deadline ? new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(deadline) : "日時を確認できません";
}
