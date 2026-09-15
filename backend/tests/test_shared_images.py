"""Shared-image integration tests. Only an explicitly named _test DB is allowed."""
import io
import os
import secrets
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import psycopg
from PIL import Image
from werkzeug.security import generate_password_hash

from app import app
from database.db import db_conn
from movie_image_storage import import_local_images, prune_images


def image_bytes(format="WEBP", color="navy"):
    stream = io.BytesIO()
    Image.new("RGB", (24, 36), color).save(stream, format)
    return stream.getvalue()


class DatabaseHealthTest(unittest.TestCase):
    def test_unavailable_database_does_not_expose_connection_details(self):
        with patch("app.db_conn", side_effect=psycopg.OperationalError("private database credentials")):
            response = app.test_client().get("/health/db")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("private", response.text)


@unittest.skipUnless(os.getenv("ADMIN_TEST_DATABASE_URL"), "Set ADMIN_TEST_DATABASE_URL")
class SharedImageTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.url = os.environ["ADMIN_TEST_DATABASE_URL"]
        with psycopg.connect(cls.url) as conn:
            if not conn.info.dbname.endswith("_test"):
                raise RuntimeError("Refusing to use a non-test database")

    def setUp(self):
        self.enterContext(patch.dict(os.environ, {"DATABASE_URL": self.url, "MOVIE_IMAGE_STORAGE": "database"}))
        self.directory = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.enterContext(patch.dict(app.config, {
            "TESTING": True, "ADMIN_COOKIE_SECURE": False,
            "MOVIE_IMAGE_STORAGE": "database", "UPLOAD_DIRECTORY": str(self.directory),
        }))
        self.client = app.test_client()
        password = secrets.token_urlsafe(24)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("TRUNCATE users, movies, movie_images, admin_login_attempts RESTART IDENTITY CASCADE")
            cur.execute("INSERT INTO users (name,email,password,role) VALUES ('Admin','images@example.test',%s,'ADMIN')",
                        (generate_password_hash(password),))
        self.origin = {"Origin": "http://localhost:3000"}
        login = self.client.post("/api/admin/login", json={"email": "images@example.test", "password": password}, headers=self.origin)
        self.assertEqual(login.status_code, 200, login.json)
        self.headers = {**self.origin, "X-CSRF-Token": login.json["csrf_token"]}

    def upload(self):
        response = self.client.post("/api/admin/uploads", headers=self.headers,
                                    data={"image": (io.BytesIO(image_bytes("PNG")), "poster.png")})
        self.assertEqual(response.status_code, 201, response.json)
        return response.json["url"]

    def test_upload_is_visible_without_local_files_and_can_be_used_in_movie(self):
        url = self.upload()
        self.assertEqual(list(self.directory.iterdir()), [])
        # A reader with a different, empty local directory still sees the same image.
        with tempfile.TemporaryDirectory() as reader_directory, patch.dict(app.config, {"UPLOAD_DIRECTORY": reader_directory}):
            reader = app.test_client()
            response = reader.get(url.replace("/api/cinema/", "/api/"))
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.mimetype, "image/webp")
            with Image.open(io.BytesIO(response.data)) as picture:
                self.assertEqual(picture.format, "WEBP")
            self.assertIn("max-age=31536000", response.headers["Cache-Control"])
            cached = reader.get(url.replace("/api/cinema/", "/api/"), headers={"If-None-Match": response.headers["ETag"]})
            self.assertEqual(cached.status_code, 304)
            result = self.client.post("/api/admin/movies", headers=self.headers, json={
                "title": "共有テスト", "genre": "ドラマ", "synopsis": "画像も共有", "duration_minutes": 100,
                "poster_image": url, "release_date": "2026-09-15", "screening_start": "2026-09-15",
                "screening_end": "2026-10-01", "auto_schedule": False,
            })
            self.assertEqual(result.status_code, 201, result.json)
            self.assertEqual(reader.get("/api/movies").json[0]["poster_image"], url)

    def test_image_auth_validation_missing_files_and_database_failure(self):
        guest = app.test_client()
        self.assertEqual(guest.post("/api/admin/uploads").status_code, 401)
        self.assertEqual(self.client.post("/api/admin/uploads", headers=self.origin).status_code, 403)
        self.assertEqual(guest.get("/api/media/not-an-image").status_code, 404)
        self.assertEqual(guest.get("/api/media/" + "0" * 32 + ".webp").status_code, 404)
        malformed = self.client.post("/api/admin/uploads", headers=self.headers,
                                     data={"image": (io.BytesIO(b"not an image"), "poster.png")})
        self.assertEqual(malformed.status_code, 422)
        with patch("movie_image_storage.db_conn", side_effect=psycopg.OperationalError("private connection")):
            failed = self.client.post("/api/admin/uploads", headers=self.headers,
                                      data={"image": (io.BytesIO(image_bytes("PNG")), "poster.png")})
            self.assertEqual(failed.status_code, 503)
            self.assertNotIn("private", failed.text)

    def test_import_is_idempotent_and_preserves_bytes(self):
        filename = "1" * 32 + ".webp"
        content = image_bytes()
        (self.directory / filename).write_bytes(content)
        self.assertEqual(import_local_images(self.directory), {"imported": 1, "unchanged": 0})
        self.assertEqual(import_local_images(self.directory), {"imported": 0, "unchanged": 1})
        response = app.test_client().get(f"/api/media/{filename}")
        self.assertEqual(response.data, content)

    def test_conflicting_import_rolls_back_the_entire_batch(self):
        first, conflict = "1" * 32 + ".webp", "2" * 32 + ".webp"
        original = image_bytes(color="red")
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("INSERT INTO movie_images (filename, content) VALUES (%s, %s)", (conflict, original))
        for name in (first, conflict):
            (self.directory / name).write_bytes(image_bytes())
        with self.assertRaisesRegex(ValueError, "different content"):
            import_local_images(self.directory)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT filename, content FROM movie_images")
            rows = cur.fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual((rows[0][0], bytes(rows[0][1])), (conflict, original))

    def test_prune_keeps_referenced_and_recent_images(self):
        referenced, recent, orphan = (character * 32 + ".webp" for character in "123")
        with db_conn() as conn, conn.cursor() as cur:
            for name in (referenced, recent, orphan):
                cur.execute("INSERT INTO movie_images (filename, content) VALUES (%s, %s)", (name, image_bytes()))
            cur.execute("UPDATE movie_images SET created_at = CURRENT_TIMESTAMP - INTERVAL '2 days' WHERE filename <> %s", (recent,))
            cur.execute("INSERT INTO movies (id,title,duration_minutes,poster_image) VALUES ('shared','Shared',100,%s)",
                        ("/api/cinema/media/" + referenced,))
        self.assertEqual(prune_images(), 1)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT filename FROM movie_images ORDER BY filename")
            self.assertEqual([row[0] for row in cur.fetchall()], [referenced, recent])

    def test_database_rejects_invalid_filename_and_empty_content(self):
        for filename, content in (("../bad.webp", image_bytes()), ("1" * 32 + ".webp", b"")):
            with self.assertRaises(psycopg.errors.CheckViolation), db_conn() as conn, conn.cursor() as cur:
                cur.execute("INSERT INTO movie_images (filename, content) VALUES (%s, %s)", (filename, content))
