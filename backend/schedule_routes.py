import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from flask import Blueprint, current_app, jsonify, request
from psycopg import errors
from psycopg.rows import dict_row

from admin_auth import admin_required, failure
from database.db import db_conn
from movie_domain import japan_today
from movie_repository import get_movie, list_showings
from screening_service import ensure_screen_seats, room_has_conflict
from seat_holds import owner_hash

schedule = Blueprint("cinema_schedule", __name__, url_prefix="/api")


@schedule.after_request
def headers(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@schedule.get("/admin/operations")
@admin_required
def operations():
    with db_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""SELECT sc.id, sc.name, sc.seat_count, t.theater_name
            FROM screens sc JOIN theaters t ON t.id = sc.theater_id ORDER BY sc.name""")
        screens = cur.fetchall()
        cur.execute("""SELECT o.id, o.order_num, o.order_status, o.total_amount, o.created_at,
            count(rs.id) AS seat_count, string_agg(DISTINCT rs.movie_title_at_purchase, ', ') AS movie_title
            FROM orders o LEFT JOIN reservation_seats rs ON rs.order_id = o.id
            GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100""")
        reservations = cur.fetchall()
        for row in reservations:
            row["created_at"] = row["created_at"].isoformat()
    return jsonify({"screens": screens, "reservations": reservations, "showings": list_showings()})


@schedule.post("/admin/showings")
@admin_required
def create_showing():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return failure("上映情報を入力してください。", 422)
    try:
        show_date = date.fromisoformat(payload.get("show_date", ""))
        start = datetime.strptime(payload.get("start_time", ""), "%H:%M")
        if show_date < japan_today():
            return failure("今日以降の上映日を指定してください。", 422)
        if datetime.combine(show_date, start.time(), ZoneInfo("Asia/Tokyo")) <= datetime.now(ZoneInfo("Asia/Tokyo")):
            return failure("現在より後の開始時刻を指定してください。", 422)
    except (TypeError, ValueError):
        return failure("上映日と開始時刻を確認してください。", 422)
    with db_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("SELECT * FROM movies WHERE id = %s FOR SHARE", (payload.get("movie_id"),))
        movie = cur.fetchone()
        if not movie or not movie["screening_start"] or not movie["screening_end"] or not movie["screening_start"] <= show_date <= movie["screening_end"]:
            return failure("作品の上映期間内の日付を選んでください。", 422)
        end = start + timedelta(minutes=movie["duration_minutes"])
        if end.date() != start.date():
            return failure("日付をまたぐ上映は登録できません。", 422)
        # Lock the room, serializing overlap checks from concurrent staff sessions.
        cur.execute("SELECT * FROM screens WHERE id = %s FOR UPDATE", (payload.get("screen_id"),))
        screen = cur.fetchone()
        if not screen:
            return failure("スクリーンが見つかりません。", 422)
        if room_has_conflict(cur, screen["id"], show_date, start.time(), end.time()):
            return failure("このスクリーンの上映が重なるか、上映間隔が20分未満になります。", 409)
        showing_id = "show-" + uuid.uuid4().hex
        cur.execute("""INSERT INTO showings (id, movie_id, screen_id, show_date, start_time, end_time)
            VALUES (%s, %s, %s, %s, %s, %s)""", (showing_id, movie["id"], screen["id"], show_date, start.time(), end.time()))
        ensure_screen_seats(cur, screen)
    return jsonify({"id": showing_id, "message": "上映回を登録しました。"}), 201


@schedule.delete("/admin/showings/<showing_id>")
@admin_required
def delete_showing(showing_id):
    try:
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM showings WHERE id = %s RETURNING id", (showing_id,))
            if not cur.fetchone():
                return failure("上映回が見つかりません。", 404)
        return jsonify({"message": "上映回を削除しました。"})
    except errors.ForeignKeyViolation:
        return failure("予約履歴のある上映回は削除できません。", 409)


@schedule.get("/screenings/<showing_id>")
def showing_detail(showing_id):
    try:
        showing = next((s for s in list_showings() if s["id"] == showing_id), None)
        if not showing:
            return failure("上映回が見つかりません。", 404)
        with db_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT clock_timestamp() AS now")
            now = cur.fetchone()["now"]
            cur.execute("""SELECT st.id, st.row_name, st.seat_number, st.seat_label,
                EXISTS (SELECT 1 FROM reservation_seats rs JOIN orders o ON o.id = rs.order_id
                    WHERE rs.seat_id = st.id AND rs.showing_id = %s AND rs.released_at IS NULL
                    AND o.order_status IN ('pending', 'paid')) AS reserved,
                h.expires_at AS hold_expires_at, COALESCE(h.owner_hash = %s, FALSE) AS held_by_me
                FROM seats st LEFT JOIN seat_holds h ON h.seat_id = st.id
                    AND h.showing_id = %s AND h.expires_at > %s
                WHERE st.screen_id = %s ORDER BY st.row_name, st.seat_number""",
                        (showing_id, owner_hash(), showing_id, now, showing["screen_id"]))
            seats = cur.fetchall()
            for seat in seats:
                seat["hold_expires_at"] = seat["hold_expires_at"].isoformat() if seat["hold_expires_at"] else None
            cur.execute("SELECT id, label, current_price AS price FROM ticket_types ORDER BY current_price DESC")
            ticket_types = cur.fetchall()
        return jsonify({"showing": showing, "movie": get_movie(showing["movie_id"]), "seats": seats,
                        "ticket_types": ticket_types, "server_now": now.isoformat()})
    except Exception:
        current_app.logger.exception("Showing detail failed")
        return failure("上映情報を取得できませんでした。", 503)
