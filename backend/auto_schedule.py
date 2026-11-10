"""Allocate published showings without moving existing bookings or schedules."""
import uuid
from collections import defaultdict
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from screening_service import TURNAROUND_MINUTES, ensure_screen_seats

JAPAN = ZoneInfo("Asia/Tokyo")
OPEN_MINUTE = 10 * 60
CLOSE_MINUTE = 23 * 60
SLOT_STEP = 15
LEAD_MINUTES = 30
DEFAULT_DAILY_SHOWINGS = 3
MAX_DAYS = 366


class ScheduleInputError(ValueError):
    def __init__(self, message, field="auto_schedule"):
        super().__init__(message)
        self.fields = {field: message}


def daily_showings_from(payload):
    value = payload.get("daily_showings", DEFAULT_DAILY_SHOWINGS)
    if type(value) is not int or not 1 <= value <= 6:
        raise ScheduleInputError("1日の上映回数は1〜6回で指定してください。", "daily_showings")
    return value


def scheduling_period(movie, now):
    if not movie.get("screening_start") or not movie.get("screening_end"):
        raise ScheduleInputError("先に作品の上映開始日と終了日を設定してください。")
    first = max(movie["screening_start"], now.date())
    last = movie["screening_end"]
    if (last - first).days + 1 > MAX_DAYS:
        raise ScheduleInputError("自動割り当ての上映期間は366日以内にしてください。", "screening_end")
    return first, last


def minute(value):
    return value.hour * 60 + value.minute + value.second / 60


def clock(value):
    return time(value // 60, value % 60)


def overlaps(start, end, intervals):
    return any(start < stop + TURNAROUND_MINUTES and end + TURNAROUND_MINUTES > begin for begin, stop in intervals)


def plan_day(movie, screens, occupied, existing_film_times, day, needed, earliest, targets, prefer_times=True):
    room_times = {screen["id"]: list(occupied[(day, screen["id"])]) for screen in screens}
    film_times = list(existing_film_times)
    duration = movie["duration_minutes"]
    starts = range(OPEN_MINUTE, CLOSE_MINUTE - duration + 1, SLOT_STEP)
    rows = []
    for _ in range(needed):
        candidates = []
        remaining_targets = [target for target in targets if not any(
            abs(begin - target) < duration + TURNAROUND_MINUTES for begin, _ in film_times)]
        for start in starts:
            end = start + duration
            if start < earliest or overlaps(start, end, film_times):
                continue
            priority = min(abs(start - target) for target in (remaining_targets or targets)) if prefer_times else start
            for screen_id, intervals in room_times.items():
                if not overlaps(start, end, intervals):
                    candidates.append((priority, sum(stop - begin for begin, stop in intervals), start, screen_id))
        if not candidates:
            break
        _, _, start, screen_id = min(candidates)
        end = start + duration
        room_times[screen_id].append((start, end))
        film_times.append((start, end))
        rows.append({"movie_id": movie["id"], "screen_id": screen_id, "show_date": day,
                     "start_time": clock(start), "end_time": clock(end)})
    return rows


def plan_showings(movie, screens, existing, *, daily_showings=DEFAULT_DAILY_SHOWINGS, now=None):
    """Pure planner; caller must hold movie/room locks while reading and inserting."""
    now = (now or datetime.now(JAPAN)).astimezone(JAPAN)
    first, last = scheduling_period(movie, now)
    occupied = defaultdict(list)
    film_times = defaultdict(list)
    for showing in existing:
        interval = (minute(showing["start_time"]), minute(showing["end_time"]))
        occupied[(showing["show_date"], showing["screen_id"])].append(interval)
        if showing["movie_id"] == movie["id"]:
            film_times[showing["show_date"]].append(interval)
    rows, missing_dates, unfilled = [], [], 0
    current = first
    while current <= last:
        count = len(film_times[current])
        needed = max(0, daily_showings - count)
        earliest = OPEN_MINUTE
        if current == now.date():
            earliest = max(earliest, minute(now.time()) + LEAD_MINUTES)
        # Spread preferred starts through the day: 10:00, 14:00, 18:00 for 3/day.
        targets = [OPEN_MINUTE + 12 * 60 * index / daily_showings for index in range(daily_showings)]
        day_rows = plan_day(movie, screens, occupied, film_times[current], current, needed, earliest, targets)
        if len(day_rows) < needed:
            # Fixed-duration intervals fit most densely in earliest-finish order.
            # Use that plan only when preferred times would lose bookable slots.
            packed = plan_day(movie, screens, occupied, film_times[current], current, needed, earliest, targets, prefer_times=False)
            if len(packed) > len(day_rows):
                day_rows = packed
        rows.extend(day_rows)
        added = len(day_rows)
        if added < needed:
            unfilled += needed - added
            missing_dates.append(current.isoformat())
        current += timedelta(days=1)
    return rows, {"created_count": len(rows), "unfilled_count": unfilled, "unfilled_dates": missing_dates,
                  "daily_showings": daily_showings, "first_date": first.isoformat() if first <= last else None,
                  "last_date": last.isoformat() if first <= last else None,
                  "existing_count": sum(len(times) for day, times in film_times.items() if first <= day <= last)}


def allocate_showings(cur, movie, daily_showings=DEFAULT_DAILY_SHOWINGS):
    now = datetime.now(JAPAN)
    first, last = scheduling_period(movie, now)
    # Manual insertion locks a room too. Stable order prevents automatic runs
    # for different films from taking the rooms in conflicting orders.
    cur.execute("SELECT id, seat_count FROM screens ORDER BY id FOR UPDATE")
    screens = cur.fetchall()
    cur.execute("""SELECT movie_id, screen_id, show_date, start_time, end_time FROM showings
        WHERE show_date >= %s AND show_date <= %s ORDER BY show_date, start_time""", (first, last))
    rows, result = plan_showings(movie, screens, cur.fetchall(), daily_showings=daily_showings, now=now)
    if rows:
        cur.executemany("""INSERT INTO showings (id, movie_id, screen_id, show_date, start_time, end_time)
            VALUES (%s, %s, %s, %s, %s, %s)""",
                        [("show-" + uuid.uuid4().hex, row["movie_id"], row["screen_id"], row["show_date"], row["start_time"], row["end_time"]) for row in rows])
        used_screens = {row["screen_id"] for row in rows}
        for screen in screens:
            if screen["id"] in used_screens:
                ensure_screen_seats(cur, screen)
    return result


def schedule_message(result):
    if not result["first_date"]:
        return "上映期間が終了しているため、上映回は追加していません。"
    message = f"上映回を{result['created_count']}回、自動で割り当てました。"
    if result["unfilled_count"]:
        message += f"空き時間が足りないため、{len(result['unfilled_dates'])}日分で計{result['unfilled_count']}回を割り当てられませんでした。"
    elif not result["created_count"]:
        message = "設定した回数の上映回がすでに登録されています。"
    return message
