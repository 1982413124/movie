"""Member sessions for customer purchases; separate from admin authorization."""
import secrets
from functools import wraps

from flask import Blueprint, current_app, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash
from psycopg import errors

from admin_auth import allowed_origin, digest
from database.db import db_conn

member_auth = Blueprint("member_auth", __name__, url_prefix="/api")
COOKIE = "cinema_member_session"
SESSION_SECONDS = 8 * 60 * 60
DUMMY_HASH = generate_password_hash(secrets.token_urlsafe(32))


def failure(message, status=400):
    return jsonify({"status": "error", "message": message}), status


def load_member():
    """Return identity from the server session, never from a submitted email."""
    token = request.cookies.get(COOKIE, "")
    if len(token) != 43:
        return None
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute("""SELECT u.id, u.name, u.email, s.csrf_token
            FROM member_sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = %s AND s.expires_at > CURRENT_TIMESTAMP""", (digest(token),))
        row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "name": row[1], "email": row[2], "csrf_token": row[3]}


def member_required(fn=None, *, optional=False):
    def decorate(handler):
        @wraps(handler)
        def wrapped(*args, **kwargs):
            try:
                member = load_member()
            except Exception:
                current_app.logger.exception("Member session lookup failed")
                return failure("ログイン情報を確認できません。時間をおいて再試行してください。", 503)
            if not member:
                if optional and not request.cookies.get(COOKIE):
                    g.member = None
                    return handler(*args, **kwargs)
                return failure("ログインし直してください。", 401)
            if request.method not in ("GET", "HEAD", "OPTIONS"):
                if not allowed_origin() or not secrets.compare_digest(
                    request.headers.get("X-CSRF-Token", ""), member["csrf_token"]
                ):
                    return failure("操作を確認できませんでした。画面を更新してください。", 403)
            g.member = member
            return handler(*args, **kwargs)
        return wrapped
    return decorate(fn) if fn else decorate


def issue_session(cur, user_id):
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    cur.execute("DELETE FROM member_sessions WHERE expires_at <= CURRENT_TIMESTAMP OR token_hash = %s",
                (digest(request.cookies.get(COOKIE, "")),))
    cur.execute("""INSERT INTO member_sessions (token_hash, user_id, csrf_token, expires_at)
        VALUES (%s, %s, %s, CURRENT_TIMESTAMP + INTERVAL '8 hours')""", (digest(token), user_id, csrf))
    return token, csrf


def signed_in_response(user, token, csrf, status=200):
    response = jsonify({"status": "ok", "user": user, "csrf_token": csrf})
    response.status_code = status
    response.set_cookie(COOKIE, token, max_age=SESSION_SECONDS, httponly=True,
                        samesite="Strict", path="/", secure=current_app.config.get(
                            "MEMBER_COOKIE_SECURE", current_app.config.get("ADMIN_COOKIE_SECURE", True)))
    return response


@member_auth.after_request
def private_response(response):
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


def credentials():
    payload = request.get_json(silent=True) or request.form.to_dict()
    if not isinstance(payload, dict):
        return None
    email, password = payload.get("email", ""), payload.get("password", "")
    if not isinstance(email, str) or not isinstance(password, str):
        return None
    if not email.strip() or len(email) > 255 or not 1 <= len(password) <= 1024:
        return None
    return payload, email.strip().lower(), password


@member_auth.post("/register")
def register():
    if not allowed_origin():
        return failure("この接続元からは登録できません。", 403)
    values = credentials()
    if not values:
        return failure("名前とメールアドレスとパスワードを入力してください。")
    payload, email, password = values
    name = payload.get("name", "")
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 255:
        return failure("名前を入力してください。")
    try:
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("""INSERT INTO users (name, email, password) VALUES (%s, %s, %s)
                RETURNING id, name, email, created_at""", (name.strip(), email, generate_password_hash(password)))
            row = cur.fetchone()
            token, csrf = issue_session(cur, row[0])
        return signed_in_response({"id": row[0], "name": row[1], "email": row[2],
                                   "created_at": row[3].isoformat()}, token, csrf, 201)
    except errors.UniqueViolation:
        return failure("このメールアドレスは既に登録されています。", 409)
    except Exception:
        current_app.logger.exception("Member registration failed")
        return failure("登録できませんでした。時間をおいて再試行してください。", 503)


@member_auth.post("/login")
def login():
    if not allowed_origin():
        return failure("この接続元からはログインできません。", 403)
    values = credentials()
    if not values:
        return failure("メールアドレスとパスワードを入力してください。")
    _, email, password = values
    try:
        bucket = digest(email)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM member_login_attempts WHERE window_start < CURRENT_TIMESTAMP - INTERVAL '15 minutes'")
            cur.execute("""INSERT INTO member_login_attempts (bucket) VALUES (%s)
                ON CONFLICT (bucket) DO UPDATE SET attempts = member_login_attempts.attempts + 1
                RETURNING attempts""", (bucket,))
            attempts = cur.fetchone()[0]
        if attempts > 10:
            return failure("試行回数が多すぎます。15分後にお試しください。", 429)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT id, name, email, password, created_at FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
            valid = check_password_hash(row[3] if row else DUMMY_HASH, password)
            if not row or not valid:
                return failure("メールアドレスまたはパスワードが違います。", 401)
            token, csrf = issue_session(cur, row[0])
            cur.execute("DELETE FROM member_login_attempts WHERE bucket = %s", (bucket,))
        return signed_in_response({"id": row[0], "name": row[1], "email": row[2],
                                   "created_at": row[4].isoformat()}, token, csrf)
    except Exception:
        current_app.logger.exception("Member login failed")
        return failure("ログインできませんでした。時間をおいて再試行してください。", 503)


@member_auth.get("/member/session")
@member_required
def session_info():
    return jsonify({"user": {key: g.member[key] for key in ("id", "name", "email")},
                    "csrf_token": g.member["csrf_token"]})


@member_auth.post("/member/logout")
@member_required
def logout():
    try:
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM member_sessions WHERE token_hash = %s", (digest(request.cookies.get(COOKIE, "")),))
    except Exception:
        current_app.logger.exception("Member logout failed")
        return failure("ログアウトできませんでした。もう一度お試しください。", 503)
    response = jsonify({"message": "ログアウトしました。"})
    response.delete_cookie(COOKIE, path="/", samesite="Strict", httponly=True)
    return response
