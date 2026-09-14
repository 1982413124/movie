"""Real PostgreSQL allocation races, ownership, deadline, conversion and rollback."""
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from threading import Barrier
from unittest import TestCase, skipUnless
from unittest.mock import patch

import psycopg
import test_admin_api as fixtures
from app import app
from database.db import db_conn
from seat_holds import COOKIE


@skipUnless(os.getenv("ADMIN_TEST_DATABASE_URL"), "Requires isolated _test PostgreSQL")
class SeatHoldsTest(TestCase):
    setUpClass = classmethod(fixtures.AdminApiTest.setUpClass.__func__)
    tearDownClass = classmethod(fixtures.AdminApiTest.tearDownClass.__func__)
    create = fixtures.AdminApiTest.create
    showing = fixtures.AdminApiTest.showing

    def setUp(self):
        fixtures.AdminApiTest.setUp(self)
        self.movie = self.create()
        self.show = self.showing(self.movie).json["id"]
        self.seats = self.client.get(f"/api/screenings/{self.show}").json["seats"]
        self.a, self.b = app.test_client(), app.test_client()
        for client in (self.a, self.b, self.customer):
            self.assertEqual(client.post("/api/reservations/hold-session", headers=fixtures.ORIGIN).status_code, 200)

    def hold(self, client=None, seat=0, method="put"):
        return getattr(client or self.a, method)(f"/api/screenings/{self.show}/holds/{self.seats[seat]['id']}", headers=fixtures.ORIGIN)

    def book(self, client=None, seats=(0,), **changes):
        return (client or self.a).post("/api/reservations", headers=fixtures.ORIGIN, json={
            "movie_id": self.movie["id"], "screening_id": self.show,
            "seat_ids": [self.seats[seat]["id"] for seat in seats], "ticket_count": len(seats),
            "ticket_types": [{"ticket_type_id": "general", "quantity": len(seats)}],
            "payment_method": "credit-card", "contact_email": "guest@example.test", **changes})

    def expire(self):
        with db_conn() as conn:
            conn.execute("""UPDATE seat_holds SET created_at = CURRENT_TIMESTAMP - INTERVAL '11 minutes',
                expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE showing_id = %s""", (self.show,))

    def test_ten_minutes_no_extension_and_private_owner(self):
        first = self.hold().json
        remaining = (datetime.fromisoformat(first["expires_at"]) - datetime.fromisoformat(first["server_now"])).total_seconds()
        self.assertGreater(remaining, 598)
        self.assertLessEqual(remaining, 600)
        self.assertEqual(self.hold().json["expires_at"], first["expires_at"])
        self.assertEqual(self.hold(seat=1).json["expires_at"], first["expires_at"])
        self.assertEqual(self.a.get(f"/api/screenings/{self.show}/holds").json["expires_at"], first["expires_at"])
        mine = self.a.get(f"/api/screenings/{self.show}").json["seats"][0]
        other = self.b.get(f"/api/screenings/{self.show}").json["seats"][0]
        self.assertTrue(mine["held_by_me"])
        self.assertFalse(other["held_by_me"])
        self.assertEqual(other["hold_expires_at"], first["expires_at"])
        self.assertNotIn("owner_hash", other)
        self.assertEqual(self.hold(self.b).status_code, 409)
        self.assertEqual(self.book(self.b).status_code, 409)

    def test_two_users_concurrently_acquire_only_one_hold(self):
        barrier = Barrier(2)
        def acquire(client):
            barrier.wait(timeout=10)
            return self.hold(client).status_code
        with ThreadPoolExecutor(2) as pool:
            self.assertCountEqual(list(pool.map(acquire, (self.a, self.b))), [200, 409])
        with db_conn() as conn:
            self.assertEqual(conn.execute("SELECT count(*) FROM seat_holds").fetchone()[0], 1)

    def test_availability_counts_holds_and_releases_them_at_deadline(self):
        self.hold()
        self.assertEqual(self.a.get(f"/api/screenings/availability?ids={self.show}").json["reserved_seats_by_screening"][self.show], [self.seats[0]["id"]])
        self.assertEqual(self.a.get(f"/api/screenings/{self.show}").json["showing"]["held_count"], 1)
        self.expire()
        self.assertEqual(self.a.get(f"/api/screenings/availability?ids={self.show}").json["reserved_seats_by_screening"][self.show], [])

    def test_database_blocks_reservation_while_held_and_hold_while_reserved(self):
        self.hold()
        with self.assertRaises(psycopg.errors.UniqueViolation), db_conn() as conn:
            order = conn.execute("INSERT INTO orders (order_num) VALUES ('direct-test') RETURNING id").fetchone()[0]
            conn.execute("INSERT INTO reservation_seats(order_id,showing_id,seat_id,ticket_type_id,ticket_type_label) VALUES (%s,%s,%s,'general','一般')", (order, self.show, self.seats[0]["id"]))
        self.assertEqual(self.book().status_code, 201)
        with self.assertRaises(psycopg.errors.UniqueViolation), db_conn() as conn:
            conn.execute("""INSERT INTO seat_holds(showing_id,seat_id,owner_hash,created_at,expires_at)
                VALUES (%s,%s,%s,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '10 minutes')""",
                         (self.show, self.seats[0]["id"], "a" * 64))

    def test_database_race_between_hold_and_reservation_has_one_winner(self):
        barrier = Barrier(2)
        def write(hold):
            try:
                with db_conn() as conn:
                    barrier.wait(timeout=10)
                    if hold:
                        conn.execute("""INSERT INTO seat_holds(showing_id,seat_id,owner_hash,created_at,expires_at)
                            VALUES (%s,%s,%s,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '10 minutes')""",
                                     (self.show, self.seats[0]["id"], "a" * 64))
                    else:
                        order = conn.execute("INSERT INTO orders (order_num) VALUES ('direct-race') RETURNING id").fetchone()[0]
                        conn.execute("INSERT INTO reservation_seats(order_id,showing_id,seat_id,ticket_type_id,ticket_type_label) VALUES (%s,%s,%s,'general','一般')", (order, self.show, self.seats[0]["id"]))
                return "ok"
            except psycopg.errors.UniqueViolation:
                return "conflict"
        with ThreadPoolExecutor(2) as pool:
            self.assertCountEqual(list(pool.map(write, (True, False))), ["ok", "conflict"])

    def test_direct_database_inserts_are_unique(self):
        barrier = Barrier(2)
        def insert(owner):
            try:
                with db_conn() as conn:
                    barrier.wait(timeout=10)
                    conn.execute("""INSERT INTO seat_holds(showing_id,seat_id,owner_hash,created_at,expires_at)
                        VALUES (%s,%s,%s,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '10 minutes')""",
                                 (self.show, self.seats[0]["id"], owner * 64))
                return "ok"
            except psycopg.errors.UniqueViolation:
                return "conflict"
        with ThreadPoolExecutor(2) as pool:
            self.assertCountEqual(list(pool.map(insert, ("a", "b"))), ["ok", "conflict"])

    def test_expiry_is_effective_without_cleanup_and_replacement_cannot_be_released_by_old_owner(self):
        self.hold()
        self.expire()
        self.assertIsNone(self.b.get(f"/api/screenings/{self.show}").json["seats"][0]["hold_expires_at"])
        self.assertEqual(self.book().json["code"], "seat_hold_expired")
        self.assertEqual(self.hold(self.b).status_code, 200)
        self.assertEqual(self.hold(method="delete").status_code, 200)
        self.assertEqual(self.b.get(f"/api/screenings/{self.show}/holds").json["seat_ids"], [self.seats[0]["id"]])

    def test_deselect_only_releases_own_seat_and_retries_are_safe(self):
        self.hold(); self.hold(seat=1)
        self.hold(self.b, method="delete")
        self.assertEqual(self.hold(self.b).status_code, 409)
        self.assertEqual(self.hold(method="delete").json["seat_ids"], [self.seats[1]["id"]])
        self.hold(method="delete")
        self.assertEqual(self.hold(self.b).status_code, 200)

    def test_conversion_commits_reservation_and_outbox_once(self):
        self.hold()
        result = self.book()
        self.assertEqual(result.status_code, 201, result.json)
        self.assertEqual(self.a.get(f"/api/screenings/{self.show}/holds").json["seat_ids"], [])
        self.assertEqual(self.hold(self.b).status_code, 409)
        self.assertEqual(self.book().status_code, 409)
        with db_conn() as conn:
            self.assertEqual(conn.execute("SELECT count(*) FROM reservation_seats WHERE released_at IS NULL").fetchone()[0], 1)
            self.assertEqual(conn.execute("SELECT count(*) FROM reservation_email_outbox").fetchone()[0], 1)

    def test_failed_purchase_restores_hold_without_extending_deadline(self):
        before = self.hold().json
        with patch("app.enqueue_reservation_mail", side_effect=RuntimeError("intentional hold rollback")):
            self.assertEqual(self.book().status_code, 503)
        after = self.a.get(f"/api/screenings/{self.show}/holds").json
        self.assertEqual(after["seat_ids"], before["seat_ids"])
        self.assertEqual(after["expires_at"], before["expires_at"])
        with db_conn() as conn:
            for table in ("orders", "reservation_seats", "payments", "reservation_email_outbox"):
                self.assertEqual(conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0], 0)

    def test_partial_hold_cannot_create_partial_reservation(self):
        self.hold()
        self.assertEqual(self.book(seats=(0, 1)).status_code, 409)
        self.assertEqual(len(self.a.get(f"/api/screenings/{self.show}/holds").json["seat_ids"]), 1)

    def test_foreign_seat_started_showing_and_missing_session_fail(self):
        result = self.a.put(f"/api/screenings/{self.show}/holds/not-a-seat", headers=fixtures.ORIGIN)
        self.assertEqual(result.status_code, 400)
        self.assertEqual(app.test_client().put(f"/api/screenings/{self.show}/holds/{self.seats[0]['id']}", headers=fixtures.ORIGIN).status_code, 409)
        self.assertEqual(self.a.put(f"/api/screenings/{self.show}/holds/{self.seats[0]['id']}", headers={"Origin": "https://other.test"}).status_code, 403)
        with db_conn() as conn:
            conn.execute("UPDATE showings SET show_date = CURRENT_DATE - 1 WHERE id = %s", (self.show,))
        self.assertEqual(self.hold().json["code"], "showing_started")

    def test_cookie_is_http_only_and_guest_hold_survives_login(self):
        response = app.test_client().post("/api/reservations/hold-session", headers=fixtures.ORIGIN)
        self.assertIn("HttpOnly", response.headers["Set-Cookie"])
        self.assertIn("SameSite=Strict", response.headers["Set-Cookie"])
        self.hold()
        token = self.a.get_cookie(COOKIE).value
        login = self.a.post("/api/login", headers=fixtures.ORIGIN, json={"email": "user@example.test", "password": self.password})
        self.assertEqual(login.status_code, 200)
        self.assertEqual(self.a.get_cookie(COOKIE).value, token)
        self.assertEqual(len(self.a.get(f"/api/screenings/{self.show}/holds").json["seat_ids"]), 1)
