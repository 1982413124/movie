"""Shared seat preparation and room-clearance rules for manual/automatic scheduling."""
from datetime import datetime, timedelta

TURNAROUND_MINUTES = 20


def room_has_conflict(cur, screen_id, show_date, start, end):
    clearance = timedelta(minutes=TURNAROUND_MINUTES)
    cur.execute("""SELECT 1 FROM showings WHERE screen_id = %s AND show_date = %s
        AND show_date + start_time < %s AND show_date + end_time > %s LIMIT 1""",
                (screen_id, show_date, datetime.combine(show_date, end) + clearance,
                 datetime.combine(show_date, start) - clearance))
    return cur.fetchone() is not None


def ensure_screen_seats(cur, screen):
    # Retain every existing seat ID, including seats referenced by purchases.
    columns = 20 if screen["seat_count"] >= 200 else 15 if screen["seat_count"] >= 120 else 10
    seats = []
    for index in range(screen["seat_count"]):
        row, number = chr(65 + index // columns), index % columns + 1
        label = f"{row}-{number}"
        seats.append((f"{screen['id']}-{label}", screen["id"], row, number, label))
    cur.executemany("""INSERT INTO seats (id, screen_id, row_name, seat_number, seat_label)
        VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING""", seats)
