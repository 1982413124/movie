"""Ten-minute seat holds; opaque browser ownership also supports guest purchases."""
import re
import secrets

from flask import Blueprint, current_app, jsonify, request
from psycopg import errors

from admin_auth import allowed_origin, digest
from booking_benefits import BenefitError
from database.db import db_conn

holds = Blueprint("seat_holds", __name__, url_prefix="/api")
COOKIE = "cinema_seat_hold"
EXPIRED_MESSAGE = "座席の仮押さえ期限が切れたか、選択が変更されました。座席を選び直してください。"


def owner_hash():
    token = request.cookies.get(COOKIE, "")
    return digest(token) if re.fullmatch(r"[A-Za-z0-9_-]{43}", token) else None


def lock_showing(cur, showing_id):
    cur.execute("""SELECT screen_id, (show_date + start_time) AT TIME ZONE 'Asia/Tokyo'
        FROM showings WHERE id = %s FOR UPDATE""", (showing_id,))
    row = cur.fetchone()
    if not row:
        raise BenefitError("上映回が見つかりません。", "showing_not_found", 404)
    cur.execute("SELECT clock_timestamp()")
    now = cur.fetchone()[0]
    if row[1] <= now:
        raise BenefitError("この上映回の予約受付は終了しました。", "showing_started", 409)
    return row[0], now


def hold_snapshot(cur, showing_id, owner):
    cur.execute("SELECT clock_timestamp()")
    now = cur.fetchone()[0]
    cur.execute("""SELECT seat_id, expires_at FROM seat_holds
        WHERE showing_id = %s AND owner_hash = %s AND expires_at > %s ORDER BY seat_id""",
                (showing_id, owner, now))
    rows = cur.fetchall()
    return {"seat_ids": [row[0] for row in rows],
            "expires_at": min(row[1] for row in rows).isoformat() if rows else None,
            "server_now": now.isoformat()}


def consume_holds(cur, showing_id, seat_ids):
    """Called inside the purchase transaction. Any later failure restores the holds."""
    owner = owner_hash()
    if not owner:
        raise BenefitError(EXPIRED_MESSAGE, "seat_hold_expired", 409)
    _, now = lock_showing(cur, showing_id)
    cur.execute("""SELECT seat_id FROM seat_holds WHERE showing_id = %s
        AND seat_id = ANY(%s) AND owner_hash = %s AND expires_at > %s""",
                (showing_id, seat_ids, owner, now))
    if {row[0] for row in cur.fetchall()} != set(seat_ids):
        raise BenefitError(EXPIRED_MESSAGE, "seat_hold_expired", 409)
    cur.execute("DELETE FROM seat_holds WHERE showing_id = %s AND seat_id = ANY(%s) AND owner_hash = %s",
                (showing_id, seat_ids, owner))


@holds.after_request
def private_response(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@holds.before_request
def check_origin():
    if request.method not in ("GET", "HEAD", "OPTIONS") and not allowed_origin():
        raise BenefitError("操作元を確認できません。画面を更新してください。", "invalid_origin", 403)


@holds.post("/reservations/hold-session")
def hold_session():
    response = jsonify({"status": "ok"})
    if not owner_hash():
        response.set_cookie(COOKIE, secrets.token_urlsafe(32), max_age=8 * 60 * 60,
                            httponly=True, samesite="Strict", path="/",
                            secure=current_app.config.get("ADMIN_COOKIE_SECURE", True))
    return response


@holds.get("/screenings/<showing_id>/holds")
def own_holds(showing_id):
    try:
        with db_conn() as conn, conn.cursor() as cur:
            result = hold_snapshot(cur, showing_id, owner_hash())
        return jsonify(result)
    except Exception:
        current_app.logger.exception("Seat hold lookup failed")
        return jsonify({"message": "仮押さえの状態を確認できませんでした。"}), 503


@holds.route("/screenings/<showing_id>/holds/<seat_id>", methods=["PUT", "DELETE"])
def change_hold(showing_id, seat_id):
    owner = owner_hash()
    if not owner:
        raise BenefitError("画面を更新して座席を選び直してください。", "seat_hold_session", 409)
    try:
        with db_conn() as conn, conn.cursor() as cur:
            if request.method == "DELETE":
                # A late release must never delete another browser's replacement hold.
                cur.execute("SELECT id FROM showings WHERE id = %s FOR UPDATE", (showing_id,))
                cur.execute("DELETE FROM seat_holds WHERE showing_id = %s AND seat_id = %s AND owner_hash = %s",
                            (showing_id, seat_id, owner))
            else:
                room, now = lock_showing(cur, showing_id)
                cur.execute("SELECT 1 FROM seats WHERE id = %s AND screen_id = %s", (seat_id, room))
                if not cur.fetchone():
                    raise BenefitError("この上映回の座席を選んでください。", "invalid_seat")
                cur.execute("DELETE FROM seat_holds WHERE showing_id = %s AND expires_at <= %s", (showing_id, now))
                cur.execute("SELECT owner_hash FROM seat_holds WHERE showing_id = %s AND seat_id = %s", (showing_id, seat_id))
                existing = cur.fetchone()
                if existing and existing[0] != owner:
                    raise BenefitError("この座席は現在、他のユーザーが仮押さえしています。", "seat_held", 409)
                if not existing:
                    cur.execute("""INSERT INTO seat_holds (showing_id, seat_id, owner_hash, created_at, expires_at)
                        VALUES (%s, %s, %s, %s, COALESCE(
                            (SELECT min(expires_at) FROM seat_holds WHERE showing_id = %s AND owner_hash = %s AND expires_at > %s),
                            %s::timestamptz + INTERVAL '10 minutes'))""",
                                (showing_id, seat_id, owner, now, showing_id, owner, now, now))
            result = hold_snapshot(cur, showing_id, owner)
        return jsonify(result)
    except BenefitError:
        raise
    except errors.UniqueViolation:
        raise BenefitError("この座席は予約済みか、他のユーザーが仮押さえしています。", "seat_unavailable", 409)
    except Exception:
        current_app.logger.exception("Seat hold change failed")
        return jsonify({"message": "座席の仮押さえを変更できませんでした。再試行してください。"}), 503
