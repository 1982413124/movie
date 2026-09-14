import io
import re
import uuid
import warnings
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from psycopg import errors
from psycopg.rows import dict_row
from werkzeug.exceptions import RequestEntityTooLarge
from PIL import Image, ImageOps, UnidentifiedImageError

from admin_auth import admin_required, failure
from database.db import db_conn
from movie_domain import IMAGE_TYPES, MAX_IMAGE_BYTES, MOVIE_FIELDS, validate_movie
from movie_repository import get_movie, list_movies, list_showings
from auto_schedule import ScheduleInputError, allocate_showings, daily_showings_from, schedule_message

movies = Blueprint("movie_management", __name__, url_prefix="/api")
Image.MAX_IMAGE_PIXELS = 20_000_000


def upload_directory():
    return Path(current_app.config["UPLOAD_DIRECTORY"])


@movies.before_request
def body_limit():
    request.max_content_length = MAX_IMAGE_BYTES + 128 * 1024
    request.max_form_parts = 8


@movies.after_request
def headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    if not request.path.startswith("/api/media/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@movies.errorhandler(RequestEntityTooLarge)
def too_large(_error):
    return failure("画像は5MB以下にしてください。", 413)


@movies.get("/movies")
def public_movies():
    try:
        return jsonify(list_movies())
    except Exception:
        current_app.logger.exception("Movie list failed")
        return failure("作品を取得できませんでした。再試行してください。", 503)


@movies.get("/movies/<movie_id>")
def public_movie(movie_id):
    try:
        movie = get_movie(movie_id)
        if not movie:
            return failure("作品が見つかりません。", 404)
        return jsonify({"movie": movie, "showings": list_showings(movie_id)})
    except Exception:
        current_app.logger.exception("Movie detail failed")
        return failure("作品を取得できませんでした。再試行してください。", 503)


@movies.get("/admin/movies")
@admin_required
def admin_movies():
    return jsonify({"movies": list_movies()})


@movies.get("/admin/movies/<movie_id>")
@admin_required
def admin_movie(movie_id):
    movie = get_movie(movie_id)
    return jsonify({"movie": movie, "showings": list_showings(movie_id)}) if movie else failure("作品が見つかりません。", 404)


def validated_input():
    payload = request.get_json(silent=True)
    clean, problems = validate_movie(payload)
    poster = clean.get("poster_image", "")
    if poster.startswith("/api/cinema/media/") and not (upload_directory() / poster.split("/")[-1]).is_file():
        problems["poster_image"] = "画像が見つかりません。もう一度アップロードしてください。"
    return payload, clean, problems


@movies.post("/admin/movies")
@admin_required
def create_movie():
    payload, clean, problems = validated_input()
    if problems:
        return jsonify({"message": "入力内容を確認してください。", "errors": problems}), 422
    automatic = payload.get("auto_schedule", True)
    if type(automatic) is not bool:
        return jsonify({"message": "自動割り当ての設定を確認してください。", "errors": {"auto_schedule": "自動割り当ての設定を確認してください。"}}), 422
    try:
        daily = daily_showings_from(payload) if automatic else None
        movie_id = "movie-" + uuid.uuid4().hex
        with db_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(f"INSERT INTO movies (id, {', '.join(MOVIE_FIELDS)}) VALUES ({', '.join(['%s'] * (len(MOVIE_FIELDS) + 1))})",
                        (movie_id, *(clean[field] for field in MOVIE_FIELDS)))
            result = allocate_showings(cur, {**clean, "id": movie_id}, daily) if automatic else None
        message = "映画を登録しました。" + (schedule_message(result) if result else "")
        return jsonify({"movie": get_movie(movie_id), "auto_schedule": result, "message": message}), 201
    except ScheduleInputError as error:
        return jsonify({"message": str(error), "errors": error.fields}), 422
    except Exception:
        current_app.logger.exception("Movie creation and scheduling failed")
        return failure("映画と上映回を保存できませんでした。再試行してください。", 503)


@movies.post("/admin/movies/<movie_id>/auto-schedule")
@admin_required
def auto_schedule_movie(movie_id):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return failure("1日の上映回数を指定してください。", 422)
    try:
        daily = daily_showings_from(payload)
        with db_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM movies WHERE id = %s FOR UPDATE", (movie_id,))
            movie = cur.fetchone()
            if not movie:
                return failure("作品が見つかりません。", 404)
            result = allocate_showings(cur, movie, daily)
        return jsonify({"auto_schedule": result, "message": schedule_message(result)})
    except ScheduleInputError as error:
        return jsonify({"message": str(error), "errors": error.fields}), 422
    except Exception:
        current_app.logger.exception("Automatic scheduling failed")
        return failure("上映回を保存できませんでした。再試行してください。", 503)


@movies.put("/admin/movies/<movie_id>")
@admin_required
def update_movie(movie_id):
    payload, clean, problems = validated_input()
    if problems:
        return jsonify({"message": "入力内容を確認してください。", "errors": problems}), 422
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT updated_at, duration_minutes FROM movies WHERE id = %s FOR UPDATE", (movie_id,))
        row = cur.fetchone()
        if not row:
            return failure("作品が見つかりません。", 404)
        if payload.get("updated_at") != row[0].isoformat():
            return failure("別の操作で作品が更新されています。再読み込みしてから編集してください。", 409)
        if clean["duration_minutes"] != row[1]:
            cur.execute("SELECT 1 FROM showings WHERE movie_id = %s AND show_date + start_time > CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo' LIMIT 1", (movie_id,))
            if cur.fetchone():
                return jsonify({"message": "上映回の終了時刻に影響するため変更できません。", "errors": {"duration_minutes": "先に今後の上映回を整理してから上映時間を変更してください。"}}), 422
        cur.execute("SELECT 1 FROM showings WHERE movie_id = %s AND (show_date < %s OR show_date > %s) LIMIT 1", (movie_id, clean["screening_start"], clean["screening_end"]))
        if cur.fetchone():
            return jsonify({"message": "登録済みの上映回が期間外になります。", "errors": {"screening_end": "すべての上映回を含む期間にしてください。"}}), 422
        cur.execute(f"UPDATE movies SET {', '.join(field + ' = %s' for field in MOVIE_FIELDS)}, updated_at = clock_timestamp() WHERE id = %s",
                    (*(clean[field] for field in MOVIE_FIELDS), movie_id))
    return jsonify({"movie": get_movie(movie_id), "message": "変更を保存しました。"})


@movies.delete("/admin/movies/<movie_id>")
@admin_required
def delete_movie(movie_id):
    payload = request.get_json(silent=True) or {}
    if not isinstance(payload, dict):
        return failure("入力内容を確認してください。")
    try:
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT updated_at FROM movies WHERE id = %s FOR UPDATE", (movie_id,))
            row = cur.fetchone()
            if not row:
                return failure("作品が見つかりません。", 404)
            if payload.get("updated_at") != row[0].isoformat():
                return failure("作品が更新されています。再読み込みしてください。", 409)
            cur.execute("SELECT 1 FROM reservation_seats rs JOIN showings s ON s.id = rs.showing_id WHERE s.movie_id = %s LIMIT 1", (movie_id,))
            if cur.fetchone():
                return failure("予約履歴のある作品は削除できません。上映終了後も履歴を保持します。", 409)
            cur.execute("DELETE FROM movies WHERE id = %s", (movie_id,))
        return jsonify({"message": "映画を削除しました。"})
    except errors.ForeignKeyViolation:
        return failure("予約が登録されたため削除できません。再読み込みしてください。", 409)


@movies.post("/admin/uploads")
@admin_required
def upload():
    try:
        file = request.files.get("image")
        if not file or file.mimetype not in IMAGE_TYPES:
            return failure("JPEG・PNG・WebP画像を選んでください。", 422)
        raw = file.read(MAX_IMAGE_BYTES + 1)
        if not raw or len(raw) > MAX_IMAGE_BYTES:
            return failure("画像は5MB以下にしてください。", 413)
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as check:
                if Image.MIME.get(check.format) != file.mimetype:
                    return failure("画像の内容と形式が一致しません。", 422)
                check.verify()
            with Image.open(io.BytesIO(raw)) as original:
                picture = ImageOps.exif_transpose(original).convert("RGB")
                picture.thumbnail((2400, 2400))
                try:
                    directory = upload_directory()
                    directory.mkdir(parents=True, exist_ok=True)
                    filename = uuid.uuid4().hex + ".webp"
                    picture.save(directory / filename, "WEBP", quality=88)
                except OSError:
                    current_app.logger.exception("Image storage failed")
                    return failure("画像を保存できませんでした。時間をおいて再試行してください。", 503)
        return jsonify({"url": f"/api/cinema/media/{filename}", "message": "画像を追加しました。"}), 201
    except RequestEntityTooLarge:
        return failure("画像は5MB以下にしてください。", 413)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        return failure("画像を読み込めません。破損していない20メガピクセル以下の画像を選んでください。", 422)


@movies.get("/media/<filename>")
def media(filename):
    if not re.fullmatch(r"[a-f0-9]{32}\.webp", filename):
        return failure("画像が見つかりません。", 404)
    return send_from_directory(upload_directory(), filename, mimetype="image/webp", max_age=31536000)
