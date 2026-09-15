"""Local development files or small shared WebP images in PostgreSQL."""
import io
import os
import re
import time
from pathlib import Path

from flask import current_app
from PIL import Image

from database.db import db_conn
from movie_domain import MAX_IMAGE_BYTES

IMAGE_FILENAME = re.compile(r"[a-f0-9]{32}\.webp")


def upload_directory():
    return Path(current_app.config["UPLOAD_DIRECTORY"])


def uses_database():
    return current_app.config["MOVIE_IMAGE_STORAGE"] == "database"


def save_image(filename, content):
    if not IMAGE_FILENAME.fullmatch(filename) or not 0 < len(content) <= MAX_IMAGE_BYTES:
        raise ValueError("Invalid image filename or size")
    if uses_database():
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("INSERT INTO movie_images (filename, content) VALUES (%s, %s)", (filename, content))
    else:
        directory = upload_directory()
        directory.mkdir(parents=True, exist_ok=True)
        with (directory / filename).open("xb") as file:
            file.write(content)


def image_exists(filename):
    if not IMAGE_FILENAME.fullmatch(filename):
        return False
    if not uses_database():
        return (upload_directory() / filename).is_file()
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1 FROM movie_images WHERE filename = %s", (filename,))
        return cur.fetchone() is not None


def read_database_image(filename):
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT content FROM movie_images WHERE filename = %s", (filename,))
        row = cur.fetchone()
    return bytes(row[0]) if row else None


def import_local_images(directory):
    """Keep existing URLs. Repeating an import is safe; mismatched content aborts it."""
    directory = Path(directory)
    if not directory.is_dir():
        raise ValueError("Image directory does not exist")
    imported = unchanged = 0
    with db_conn() as conn, conn.cursor() as cur:
        for path in sorted(directory.iterdir()):
            if not IMAGE_FILENAME.fullmatch(path.name) or not path.is_file():
                continue
            if not 0 < path.stat().st_size <= MAX_IMAGE_BYTES:
                raise ValueError("Image exceeds the size limit")
            content = path.read_bytes()
            with Image.open(io.BytesIO(content)) as picture:
                if picture.format != "WEBP":
                    raise ValueError("Only decoded WebP images can be imported")
                picture.verify()
            cur.execute("INSERT INTO movie_images (filename, content) VALUES (%s, %s) "
                        "ON CONFLICT DO NOTHING RETURNING filename", (path.name, content))
            if cur.fetchone():
                imported += 1
            else:
                cur.execute("SELECT content FROM movie_images WHERE filename = %s FOR UPDATE", (path.name,))
                existing = cur.fetchone()
                if not existing or bytes(existing[0]) != content:
                    raise ValueError("An image with this filename has different content; nothing was imported")
                unchanged += 1
    return {"imported": imported, "unchanged": unchanged}


def prune_images():
    """Explicit operator cleanup only; keep referenced and recent uploads."""
    if os.getenv("MOVIE_IMAGE_STORAGE", "local") == "database":
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("""DELETE FROM movie_images i
                WHERE i.created_at < CURRENT_TIMESTAMP - INTERVAL '1 day'
                  AND NOT EXISTS (SELECT 1 FROM movies m
                      WHERE m.poster_image = '/api/cinema/media/' || i.filename)""")
            return cur.rowcount
    directory = Path(os.getenv("UPLOAD_DIRECTORY", str(Path(__file__).with_name("uploads"))))
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT poster_image FROM movies WHERE poster_image IS NOT NULL")
        used = {row[0].rsplit("/", 1)[-1] for row in cur.fetchall()}
    count = 0
    for file in directory.glob("*.webp"):
        if IMAGE_FILENAME.fullmatch(file.name) and file.name not in used and file.stat().st_mtime < time.time() - 86400:
            file.unlink()
            count += 1
    return count
