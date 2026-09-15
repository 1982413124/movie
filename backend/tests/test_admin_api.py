"""Integration tests against an isolated PostgreSQL database, never the user DB.

ADMIN_TEST_DATABASE_URL must point to a database whose name ends in _test.
"""
import io
import os
import secrets
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

import psycopg
from PIL import Image
from werkzeug.security import generate_password_hash

from app import app
from database.db import db_conn
from movie_domain import japan_today, movie_status, validate_movie, youtube_id

ORIGIN = {"Origin": "http://localhost:3000"}


def hold_seats(client, showing_id, seat_ids):
    session = client.post("/api/reservations/hold-session", headers=ORIGIN)
    assert session.status_code == 200, session.json
    for seat_id in seat_ids:
        response = client.put(f"/api/screenings/{showing_id}/holds/{seat_id}", headers=ORIGIN)
        assert response.status_code == 200, response.json


def png_bytes():
    stream = io.BytesIO()
    Image.new("RGB", (24, 36), (73, 96, 62)).save(stream, "PNG")
    return stream.getvalue()


class MovieRulesTest(unittest.TestCase):
    def test_status_includes_both_boundary_days(self):
        start, end = date(2026, 9, 10), date(2026, 9, 20)
        for day, expected in ((9, "COMING_SOON"), (10, "NOW_SHOWING"), (20, "NOW_SHOWING"), (21, "ENDED")):
            self.assertEqual(movie_status(start, end, date(2026, 9, day)), expected)
        self.assertEqual(movie_status(None, None), "UNSCHEDULED")

    def test_youtube_urls_reject_lookalike_hosts_and_injection(self):
        video = "dQw4w9WgXcQ"
        for value in (f"https://www.youtube.com/watch?v={video}&t=1", f"https://youtu.be/{video}", f"https://youtube.com/embed/{video}", f"https://m.youtube.com/shorts/{video}"):
            self.assertEqual(youtube_id(value), video)
        for value in ("javascript:alert(1)", f"https://youtube.com.evil.test/watch?v={video}", f"https://youtube.com@evil.test/watch?v={video}", "https://youtube.com/watch?v=bad", f"https://user@youtube.com/embed/{video}"):
            self.assertIsNone(youtube_id(value))

    def test_validation_checks_all_required_fields(self):
        _, errors = validate_movie({})
        self.assertTrue({"title", "poster_image", "duration_minutes", "release_date", "screening_start", "screening_end"} <= errors.keys())
        _, errors = validate_movie({"title": "x", "duration_minutes": True, "screening_start": "2026-02-30", "screening_end": "2026-02-02", "release_date": "2026-02-30", "poster_image": "javascript:alert(1)", "trailer_url": "https://evil.test"})
        self.assertIn("duration_minutes", errors)
        self.assertIn("poster_image", errors)
        self.assertIn("trailer_url", errors)
        self.assertIn("screening_start", errors)


@unittest.skipUnless(os.getenv("ADMIN_TEST_DATABASE_URL"), "Set ADMIN_TEST_DATABASE_URL for PostgreSQL integration tests")
class AdminApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.url = os.environ["ADMIN_TEST_DATABASE_URL"]
        with psycopg.connect(cls.url) as conn:
            if not conn.info.dbname.endswith("_test"):
                raise RuntimeError("Refusing to use a non-test database")
        cls.env = patch.dict(os.environ, {"DATABASE_URL": cls.url})
        cls.env.start()
        app.config.update(TESTING=True, ADMIN_COOKIE_SECURE=False, UPLOAD_DIRECTORY="/tmp/hal-admin-test-uploads")
        cls.password = secrets.token_urlsafe(20)

    @classmethod
    def tearDownClass(cls):
        cls.env.stop()

    def setUp(self):
        self.client = app.test_client()
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("TRUNCATE users, movies, theaters, ticket_types, foods, admin_login_attempts, member_login_attempts RESTART IDENTITY CASCADE")
            cur.execute("INSERT INTO users (name,email,password,role) VALUES ('Test admin','staff@example.test',%s,'ADMIN'), ('Test user','user@example.test',%s,'USER')", (generate_password_hash(self.password), generate_password_hash(self.password)))
            cur.execute("INSERT INTO theaters (theater_name) VALUES ('Test theater') RETURNING id")
            theater_id = cur.fetchone()[0]
            cur.execute("INSERT INTO screens (id,theater_id,name,seat_count) VALUES ('test-screen',%s,'Test screen',20)", (theater_id,))
            cur.execute("INSERT INTO ticket_types (id,label,current_price) VALUES ('general','一般',1800)")
        response = self.client.post("/api/admin/login", json={"email": "staff@example.test", "password": self.password}, headers=ORIGIN)
        self.assertEqual(response.status_code, 200)
        self.headers = {**ORIGIN, "X-CSRF-Token": response.json["csrf_token"]}
        self.customer = app.test_client()
        customer_login = self.customer.post("/api/login", json={"email": "user@example.test", "password": self.password}, headers=ORIGIN)
        self.assertEqual(customer_login.status_code, 200, customer_login.json)
        self.customer_headers = {**ORIGIN, "X-CSRF-Token": customer_login.json["csrf_token"]}
        self.today = japan_today()
        self.payload = {"title": "統合テスト作品", "genre": "ドラマ", "duration_minutes": 110, "age_rating": "G", "synopsis": "作品紹介", "poster_image": "/images/man.jpg", "release_date": self.today.isoformat(), "screening_start": self.today.isoformat(), "screening_end": (self.today + timedelta(days=30)).isoformat(), "trailer_url": "https://youtu.be/dQw4w9WgXcQ"}

    def create(self):
        result = self.client.post("/api/admin/movies", json={**self.payload, "auto_schedule": False}, headers=self.headers)
        self.assertEqual(result.status_code, 201, result.json)
        return result.json["movie"]

    def showing(self, movie):
        return self.client.post("/api/admin/showings", json={"movie_id": movie["id"], "screen_id": "test-screen", "show_date": (self.today + timedelta(days=1)).isoformat(), "start_time": "12:00"}, headers=self.headers)

    def test_create_edit_delete_roundtrip_persists_in_postgres_and_public_api(self):
        movie = self.create()
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT title FROM movies WHERE id = %s", (movie["id"],))
            self.assertEqual(cur.fetchone()[0], self.payload["title"])
        self.assertEqual(self.client.get("/api/movies").json[0]["title"], movie["title"])
        updated = {**self.payload, "title": "更新した作品", "updated_at": movie["updated_at"]}
        response = self.client.put(f"/api/admin/movies/{movie['id']}", json=updated, headers=self.headers)
        self.assertEqual(response.status_code, 200, response.json)
        version = response.json["movie"]["updated_at"]
        self.assertEqual(self.client.get(f"/api/movies/{movie['id']}").json["movie"]["title"], "更新した作品")
        result = self.client.delete(f"/api/admin/movies/{movie['id']}", json={"updated_at": version}, headers=self.headers)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(self.client.get("/api/movies").json, [])
        self.assertEqual(self.client.get(f"/api/movies/{movie['id']}").status_code, 404)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM movies")
            self.assertEqual(cur.fetchone()[0], 0)

    def test_admin_auth_csrf_expiry_and_revocation(self):
        guest = app.test_client()
        for endpoint in ("/api/admin/movies", "/api/admin/operations", "/api/admin/session"):
            self.assertEqual(guest.get(endpoint).status_code, 401)
        self.assertEqual(guest.post("/api/admin/login", json={"email": "user@example.test", "password": self.password}, headers=ORIGIN).status_code, 403)
        self.assertEqual(self.client.post("/api/admin/movies", json=self.payload, headers=ORIGIN).status_code, 403)
        self.assertEqual(self.client.post("/api/admin/movies", json=self.payload, headers={**self.headers, "Origin": "https://evil.test"}).status_code, 403)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("UPDATE users SET role = 'USER' WHERE email='staff@example.test'")
        self.assertEqual(self.client.get("/api/admin/session").status_code, 403)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("UPDATE admin_sessions SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second'")
        self.assertEqual(self.client.get("/api/admin/session").status_code, 401)

    def test_cookies_logout_and_rate_limit(self):
        client = app.test_client()
        response = client.post("/api/admin/login", json={"email": "staff@example.test", "password": self.password}, headers=ORIGIN)
        cookie = response.headers["Set-Cookie"]
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=Strict", cookie)
        self.assertEqual(client.post("/api/admin/logout", headers={**ORIGIN, "X-CSRF-Token": response.json["csrf_token"]}).status_code, 200)
        self.assertEqual(client.get("/api/admin/session").status_code, 401)
        for _ in range(9):
            response = client.post("/api/admin/login", json={"email": "absent@example.test", "password": "invalid"}, headers=ORIGIN)
        self.assertEqual(response.status_code, 429)

    def test_regular_registration_cannot_create_an_admin(self):
        result = self.client.post("/api/register", json={"name": "Regular", "email": "new@example.test", "password": self.password, "role": "ADMIN"}, headers=ORIGIN)
        self.assertEqual(result.status_code, 201)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT role FROM users WHERE email='new@example.test'")
            self.assertEqual(cur.fetchone()[0], "USER")

    def test_stale_update_and_delete_are_rejected(self):
        movie = self.create()
        result = self.client.put(f"/api/admin/movies/{movie['id']}", json={**self.payload, "updated_at": "stale"}, headers=self.headers)
        self.assertEqual(result.status_code, 409)
        self.assertEqual(self.client.delete(f"/api/admin/movies/{movie['id']}", json={"updated_at": "stale"}, headers=self.headers).status_code, 409)

    def test_validation_and_database_failure(self):
        result = self.client.post("/api/admin/movies", json={**self.payload, "screening_end": "1900-01-01", "duration_minutes": 0}, headers=self.headers)
        self.assertEqual(result.status_code, 422)
        self.assertIn("screening_end", result.json["errors"])
        self.assertIn("duration_minutes", result.json["errors"])
        with patch("movie_repository.db_conn", side_effect=psycopg.OperationalError("private connection data")):
            response = self.client.get("/api/admin/movies")
            self.assertEqual(response.status_code, 503)
            self.assertNotIn("private connection", response.text)

    def test_upload_decodes_image_and_stores_path_only(self):
        result = self.client.post("/api/admin/uploads", data={"image": (io.BytesIO(png_bytes()), "../../poster.png")}, headers=self.headers)
        self.assertEqual(result.status_code, 201, result.json)
        image_url = result.json["url"]
        self.assertRegex(image_url, r"/api/cinema/media/[a-f0-9]{32}\.webp")
        response = self.client.get(image_url.replace("/api/cinema/", "/api/"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, "image/webp")
        response.close()
        self.payload["poster_image"] = image_url
        self.assertEqual(self.create()["poster_image"], image_url)

    def test_upload_rejects_spoofed_corrupt_and_large_files(self):
        for raw, name, expected in ((b"<svg></svg>", "bad.svg", 422), (b"not png", "bad.png", 422), (b"x" * (5 * 1024 * 1024 + 1), "big.png", 413)):
            result = self.client.post("/api/admin/uploads", data={"image": (io.BytesIO(raw), name)}, headers=self.headers)
            self.assertEqual(result.status_code, expected, result.json)

    def test_showing_overlap_seats_and_reservation_protect_movie(self):
        movie = self.create()
        result = self.showing(movie)
        self.assertEqual(result.status_code, 201, result.json)
        showing_id = result.json["id"]
        self.assertEqual(self.showing(movie).status_code, 409)
        detail = self.client.get(f"/api/screenings/{showing_id}").json
        self.assertEqual(len(detail["seats"]), 20)
        seat_id = detail["seats"][0]["id"]
        hold_seats(self.customer, showing_id, [seat_id])
        booking = self.customer.post("/api/reservations", headers=self.customer_headers, json={"movie_id": movie["id"], "screening_id": showing_id, "seat_ids": [seat_id], "ticket_count": 1, "ticket_types": [{"ticket_type_id": "general", "label": "Tampered", "unit_price": 1, "quantity": 1}], "payment_method": "credit-card", "user_email": "user@example.test"})
        self.assertEqual(booking.status_code, 201, booking.json)
        history = self.customer.get("/api/reservations?user_email=user@example.test").json["reservations"][0]
        self.assertEqual(history["movie_title"], movie["title"])
        self.assertEqual(history["screening_date"], (self.today + timedelta(days=1)).isoformat())
        self.assertEqual(history["seat_labels"], ["A-1"])
        self.assertEqual(booking.json["movie_title"], movie["title"])
        self.assertEqual(booking.json["ticket_total_price"], 1800)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT total_amount, order_num FROM orders WHERE id=%s", (booking.json["reservation_id"],))
            self.assertEqual(cur.fetchone(), (1800, booking.json["order_num"]))
        self.assertEqual(self.client.delete(f"/api/admin/movies/{movie['id']}", json={"updated_at": movie["updated_at"]}, headers=self.headers).status_code, 409)
        self.assertEqual(self.client.delete(f"/api/admin/showings/{showing_id}", headers=self.headers).status_code, 409)
        self.assertTrue(self.client.get(f"/api/screenings/{showing_id}").json["seats"][0]["reserved"])

    def test_public_booking_cannot_recreate_deleted_masters_or_book_past_showings(self):
        movie = self.create()
        showing_id = self.showing(movie).json["id"]
        seat_id = self.client.get(f"/api/screenings/{showing_id}").json["seats"][0]["id"]
        payload = {"movie_id": movie["id"], "screening_id": showing_id, "seat_ids": [seat_id], "ticket_types": [{"ticket_type_id": "general", "quantity": 1}], "ticket_count": 1}
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("UPDATE showings SET show_date = %s WHERE id = %s", (self.today - timedelta(days=1), showing_id))
        self.assertEqual(self.client.post("/api/reservations", json=payload).status_code, 400)
        self.assertEqual(self.client.delete(f"/api/admin/movies/{movie['id']}", json={"updated_at": movie["updated_at"]}, headers=self.headers).status_code, 200)
        self.assertEqual(self.client.post("/api/reservations", json=payload).status_code, 400)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM movies")
            self.assertEqual(cur.fetchone()[0], 0)

    def test_upload_storage_failure_has_retryable_feedback(self):
        with patch("movie_image_storage.Path.mkdir", side_effect=OSError("private disk path")):
            response = self.client.post("/api/admin/uploads", data={"image": (io.BytesIO(png_bytes()), "poster.png")}, headers=self.headers)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("private disk", response.text)


if __name__ == "__main__":
    unittest.main()
