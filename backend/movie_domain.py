"""Movie validation and Japan-time status rules shared by all API routes."""
import re
from datetime import date, datetime
from urllib.parse import parse_qs, urlparse
from zoneinfo import ZoneInfo

MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MOVIE_DETAIL_LIMITS = {"director": 255, "cast_members": 4000, "distributor": 255, "official_site_url": 2000}
MOVIE_FIELDS = (
    "title", "genre", "duration_minutes", "age_rating", "synopsis",
    "poster_image", "release_date", "screening_start", "screening_end", "trailer_url",
    *MOVIE_DETAIL_LIMITS,
)


def japan_today():
    return datetime.now(ZoneInfo("Asia/Tokyo")).date()


def movie_status(start, end, today=None):
    today = today or japan_today()
    if not start or not end:
        return "UNSCHEDULED"
    if today < start:
        return "COMING_SOON"
    if today > end:
        return "ENDED"
    return "NOW_SHOWING"


def youtube_id(value):
    if not isinstance(value, str) or not value:
        return None
    try:
        url = urlparse(value)
        if url.scheme not in ("https", "http") or url.username or url.password or url.port:
            return None
        host = (url.hostname or "").lower()
        parts = url.path.strip("/").split("/")
        candidate = None
        if host == "youtu.be" and len(parts) == 1:
            candidate = parts[0]
        elif host in ("youtube.com", "www.youtube.com", "m.youtube.com"):
            if url.path == "/watch":
                candidate = parse_qs(url.query).get("v", [None])[0]
            elif len(parts) == 2 and parts[0] in ("embed", "shorts"):
                candidate = parts[1]
        return candidate if candidate and re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate) else None
    except ValueError:
        return None


def valid_official_site_url(value):
    if not isinstance(value, str) or re.search(r"[\x00-\x20\x7f\\]", value):
        return False
    try:
        url = urlparse(value)
        host = (url.hostname or "").encode("idna").decode("ascii")
        return bool(url.scheme in ("http", "https") and url.netloc and "@" not in url.netloc
                    and re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.?", host)
                    and (url.port is None or 1 <= url.port <= 65535))
    except (ValueError, UnicodeError):
        return False


def validate_movie(payload):
    if not isinstance(payload, dict):
        return {}, {"form": "入力内容を確認してください。"}
    clean, problems = {}, {}
    limits = {"title": 255, "genre": 100, "synopsis": 10000, "age_rating": 20, "poster_image": 500, "trailer_url": 500, **MOVIE_DETAIL_LIMITS}
    for field, limit in limits.items():
        value = payload.get(field, "")
        clean[field] = value.strip() if isinstance(value, str) else ""
        if len(clean[field]) > limit:
            problems[field] = f"{limit}文字以内で入力してください。"
        if field in MOVIE_DETAIL_LIMITS and value is not None and not isinstance(value, str):
            problems[field] = "文字列で入力してください。"
    for field, label in (("title", "タイトル"), ("genre", "ジャンル"), ("poster_image", "サムネイル"), ("synopsis", "あらすじ")):
        if not clean[field]:
            problems[field] = f"{label}を入力してください。"
    poster = clean["poster_image"]
    if poster and (".." in poster or not re.fullmatch(r"/(?:api/cinema/media/[a-f0-9]{32}\.webp|images/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp))", poster)):
        problems["poster_image"] = "画像をアップロードしてください。"
    raw_duration = payload.get("duration_minutes")
    if isinstance(raw_duration, bool) or not isinstance(raw_duration, int) or not 1 <= raw_duration <= 600:
        problems["duration_minutes"] = "上映時間は1〜600分の整数で入力してください。"
    clean["duration_minutes"] = raw_duration
    for field in ("release_date", "screening_start", "screening_end"):
        try:
            value = payload.get(field)
            if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
                raise ValueError()
            clean[field] = date.fromisoformat(value)
            if not 1900 <= clean[field].year <= 2200:
                raise ValueError()
        except (TypeError, ValueError):
            problems[field] = "1900〜2200年の有効な日付を入力してください。"
    if not problems.get("screening_start") and not problems.get("screening_end"):
        if clean["screening_end"] < clean["screening_start"]:
            problems["screening_end"] = "終了日は開始日以降にしてください。"
    if clean["trailer_url"]:
        video_id = youtube_id(clean["trailer_url"])
        if not video_id:
            problems["trailer_url"] = "有効なYouTube動画のURLを入力してください。"
        else:
            clean["trailer_url"] = f"https://www.youtube.com/watch?v={video_id}"
    if clean["official_site_url"] and (not valid_official_site_url(clean["official_site_url"])
            or re.search(r"[\x00-\x1f\x7f]", payload["official_site_url"])):
        problems["official_site_url"] = "http:// または https:// で始まる公式サイトのURLを入力してください。"
    return clean, problems
