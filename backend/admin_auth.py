"""Opaque, revocable DB sessions. Role is checked on every request."""
import hashlib
import os
import secrets
from functools import wraps

from flask import Blueprint, current_app, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash
from database.db import db_conn

auth = Blueprint("admin_auth", __name__, url_prefix="/api/admin")
COOKIE = "cinema_admin_session"
SESSION_SECONDS = 8 * 60 * 60
DUMMY_HASH = generate_password_hash(secrets.token_urlsafe(32))


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def failure(message, status=400):
    return jsonify({"message": message}), status


def allowed_origin():
    allowed = current_app.config.get("ADMIN_ORIGINS") or os.getenv(
        "ADMIN_ORIGINS", "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    ).split(",")
    return request.headers.get("Origin") in allowed


def admin_required(fn):
    @wraps(fn)
    def decorated(*args, **kwargs):
        token = request.cookies.get(COOKIE, "")
        if len(token) != 43:
            return failure("管理者としてログインしてください。", 401)
        try:
            with db_conn() as conn, conn.cursor() as cur:
                cur.execute("""SELECT u.id, u.name, u.email, u.role, s.csrf_token
                    FROM admin_sessions s JOIN users u ON u.id = s.user_id
                    WHERE s.token_hash = %s AND s.expires_at > CURRENT_TIMESTAMP""", (digest(token),))
                row = cur.fetchone()
            if not row:
                return failure("セッションの有効期限が切れました。ログインし直してください。", 401)
            if row[3] != "ADMIN":
                return failure("管理者権限が必要です。", 403)
            if request.method not in ("GET", "HEAD", "OPTIONS"):
                if not allowed_origin() or not secrets.compare_digest(request.headers.get("X-CSRF-Token", ""), row[4]):
                    return failure("操作を確認できませんでした。画面を更新してください。", 403)
            g.admin = {"id": row[0], "name": row[1], "email": row[2], "role": row[3]}
            g.csrf_token = row[4]
            return fn(*args, **kwargs)
        except Exception:
            current_app.logger.exception("Admin request failed")
            return failure("サーバーに接続できません。時間をおいて再試行してください。", 503)
    return decorated


@auth.after_request
def private_response(response):
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@auth.post("/login")
def login():
    if not allowed_origin():
        return failure("この接続元からはログインできません。", 403)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return failure("メールアドレスとパスワードを入力してください。")
    email, password = payload.get("email", ""), payload.get("password", "")
    if not isinstance(email, str) or not isinstance(password, str) or not email.strip() or not 1 <= len(password) <= 1024 or len(email) > 255:
        return failure("メールアドレスとパスワードを入力してください。")
    email = email.strip().lower()
    # The account bucket also prevents attempts spread across several workers/IPs.
    bucket = digest(email)
    try:
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM admin_login_attempts WHERE window_start < CURRENT_TIMESTAMP - INTERVAL '15 minutes'")
            cur.execute("""INSERT INTO admin_login_attempts (bucket) VALUES (%s)
                ON CONFLICT (bucket) DO UPDATE SET attempts = admin_login_attempts.attempts + 1
                RETURNING attempts""", (bucket,))
            attempts = cur.fetchone()[0]
        if attempts > 8:
            return failure("試行回数が多すぎます。15分後にお試しください。", 429)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT id, name, email, password, role FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
            valid = check_password_hash(row[3] if row else DUMMY_HASH, password)
            if not row or not valid:
                return failure("メールアドレスまたはパスワードが違います。", 401)
            if row[4] != "ADMIN":
                return failure("このアカウントには管理者権限がありません。", 403)
            token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
            cur.execute("DELETE FROM admin_sessions WHERE expires_at <= CURRENT_TIMESTAMP OR token_hash = %s", (digest(request.cookies.get(COOKIE, "")),))
            cur.execute("""INSERT INTO admin_sessions (token_hash, user_id, csrf_token, expires_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP + INTERVAL '8 hours')""", (digest(token), row[0], csrf))
            cur.execute("DELETE FROM admin_login_attempts WHERE bucket = %s", (bucket,))
        response = jsonify({"user": {"id": row[0], "name": row[1], "email": row[2], "role": "ADMIN"}, "csrf_token": csrf})
        response.set_cookie(COOKIE, token, max_age=SESSION_SECONDS, httponly=True, samesite="Strict", path="/",
                            secure=current_app.config.get("ADMIN_COOKIE_SECURE", os.getenv("ADMIN_COOKIE_SECURE", "true").lower() == "true"))
        return response
    except Exception:
        current_app.logger.exception("Admin login failed")
        return failure("ログインできませんでした。サーバーの接続を確認してください。", 503)


@auth.get("/session")
@admin_required
def session_info():
    return jsonify({"user": g.admin, "csrf_token": g.csrf_token})


@auth.post("/logout")
@admin_required
def logout():
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM admin_sessions WHERE token_hash = %s", (digest(request.cookies.get(COOKIE, "")),))
    response = jsonify({"message": "ログアウトしました。"})
    response.delete_cookie(COOKIE, path="/", samesite="Strict", httponly=True)
    return response
