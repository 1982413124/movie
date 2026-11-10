"""The cinema operates in Japan. A cancellation is accepted up to one hour before start."""
from datetime import date, datetime, time, timedelta, timezone

JST = timezone(timedelta(hours=9))
CANCELLATION_LEAD = timedelta(hours=1)


def now_jst():
    return datetime.now(JST)


def showing_start(show_date, start_time):
    try:
        day = show_date if isinstance(show_date, date) else date.fromisoformat(str(show_date))
        clock = start_time if isinstance(start_time, time) else time.fromisoformat(str(start_time))
        return datetime.combine(day, clock.replace(tzinfo=None), tzinfo=JST)
    except (TypeError, ValueError):
        return None


def cancellation_info(order_status, showings, now=None):
    starts = [showing_start(day, clock) for day, clock in showings]
    start = min(starts) if starts and all(starts) else None
    deadline = start - CANCELLATION_LEAD if start else None
    reason = None
    if order_status == "cancelled":
        reason = "キャンセル済みです。"
    elif order_status not in ("pending", "paid"):
        reason = "この予約はキャンセルできません。"
    elif not deadline:
        reason = "上映日時を確認できないため、運営担当者へご連絡ください。"
    elif (now or now_jst()) > deadline:
        reason = "キャンセル期限（上映開始の1時間前）を過ぎています。"
    return {"can_cancel": reason is None, "cancel_reason": reason,
            "cancel_deadline": deadline.isoformat() if deadline else None,
            "show_start_at": start.isoformat() if start else None}
