"""Real PostgreSQL tests: session identity, deadline, seat reuse, retries and rollback."""
import os
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, time, timedelta
from threading import Barrier
from unittest.mock import patch

import test_admin_api as fixtures
from app import app
from database.db import db_conn
from member_auth import COOKIE, digest
from reservation_policy import JST, cancellation_info

ORIGIN = fixtures.ORIGIN


class CancellationDeadlineTest(unittest.TestCase):
    def test_exact_one_hour_boundary_is_allowed_and_unknown_dates_fail_closed(self):
        start = datetime(2026, 9, 15, 10, tzinfo=JST)
        for delta, expected in ((-1, True), (0, True), (1, False), (3600, False)):
            with self.subTest(seconds_after_deadline=delta):
                result = cancellation_info("paid", [(start.date(), start.time())],
                                           now=start - timedelta(hours=1) + timedelta(seconds=delta))
                self.assertEqual(result["can_cancel"], expected)
        for rows in ([], [(None, "10:00")], [("bad", "10:00")]):
            self.assertFalse(cancellation_info("paid", rows)["can_cancel"])


@unittest.skipUnless(os.getenv("ADMIN_TEST_DATABASE_URL"), "Requires an isolated _test database")
class MemberCancellationTest(unittest.TestCase):
    setUpClass = classmethod(fixtures.AdminApiTest.setUpClass.__func__)
    tearDownClass = classmethod(fixtures.AdminApiTest.tearDownClass.__func__)
    create = fixtures.AdminApiTest.create
    showing = fixtures.AdminApiTest.showing

    def setUp(self):
        fixtures.AdminApiTest.setUp(self)
        with db_conn() as conn:
            conn.execute("TRUNCATE member_login_attempts")
            conn.execute("INSERT INTO foods (id,name,current_price) VALUES ('popcorn','ポップコーン',520)")
        self.movie = self.create()
        self.showing_id = self.showing(self.movie).json["id"]
        self.seats = self.client.get(f"/api/screenings/{self.showing_id}").json["seats"]
        self.owner, self.owner_headers = self.member("user@example.test")
        self.other, self.other_headers = self.member("staff@example.test")

    def member(self, email):
        client = app.test_client()
        response = client.post("/api/login", json={"email": email, "password": self.password}, headers=ORIGIN)
        self.assertEqual(response.status_code, 200, response.json)
        return client, {**ORIGIN, "X-CSRF-Token": response.json["csrf_token"]}

    def book(self, seat=0, client=None, headers=None, **changes):
        payload = {"movie_id": self.movie["id"], "screening_id": self.showing_id,
                   "seat_ids": [self.seats[seat]["id"]], "ticket_count": 1,
                   "ticket_types": [{"ticket_type_id": "general", "quantity": 1}],
                   "food_items": [{"food_id": "popcorn", "quantity": 1}],
                   "payment_method": "credit-card", "user_email": "user@example.test", **changes}
        fixtures.hold_seats(client or self.owner, self.showing_id, payload["seat_ids"])
        result = (client or self.owner).post("/api/reservations", json=payload, headers=headers or self.owner_headers)
        self.assertEqual(result.status_code, 201, result.json)
        return result.json["reservation_id"]

    def cancel(self, order, client=None, headers=None, **body):
        return (client or self.owner).patch(f"/api/reservations/{order}/cancel", json=body,
                                            headers=self.owner_headers if headers is None else headers)

    def records(self, order):
        with db_conn() as conn:
            return (
                conn.execute("SELECT row_to_json(o) FROM orders o WHERE id=%s", (order,)).fetchone(),
                conn.execute("SELECT row_to_json(s) FROM reservation_seats s WHERE order_id=%s ORDER BY id", (order,)).fetchall(),
                conn.execute("SELECT row_to_json(p) FROM payments p WHERE order_id=%s ORDER BY id", (order,)).fetchall(),
                conn.execute("SELECT row_to_json(f) FROM food_order_details f WHERE order_id=%s ORDER BY id", (order,)).fetchall(),
            )

    def test_cancel_paid_order_releases_seat_preserves_history_and_allows_rebooking(self):
        order = self.book()
        before = self.records(order)
        response = self.cancel(order)
        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(response.json["reservation_status"], "cancelled")
        self.assertEqual(response.json["refunded_amount"], 2320)
        self.assertEqual(response.json["refund_mode"], "simulation")
        after = self.records(order)
        self.assertEqual(after[0][0]["order_status"], "cancelled")
        self.assertIsNotNone(after[1][0][0]["released_at"])
        self.assertEqual(after[2][0][0]["payment_status"], "refunded")
        self.assertEqual(before[3], after[3])
        self.assertEqual(before[1][0][0]["seat_id"], after[1][0][0]["seat_id"])
        history = self.owner.get("/api/reservations").json["reservations"][0]
        self.assertEqual(history["seat_labels"], ["A-1"])
        self.assertEqual(history["screening_date"], (self.today + timedelta(days=1)).isoformat())
        self.assertFalse(history["can_cancel"])
        self.assertEqual(self.owner.get(f"/api/screenings/{self.showing_id}/reserved-seats").json["reserved_seats"], [])
        self.book(client=self.other, headers=self.other_headers)

    def test_owner_is_server_session_not_submitted_email(self):
        order = self.book()
        before = self.records(order)
        self.assertEqual(app.test_client().patch(f"/api/reservations/{order}/cancel", json={"user_email": "user@example.test"}).status_code, 401)
        self.assertEqual(self.cancel(order, self.other, self.other_headers, user_email="user@example.test").status_code, 404)
        self.assertEqual(self.records(order), before)
        self.assertEqual(self.other.get("/api/reservations?user_email=user@example.test").json["reservations"], [])
        self.assertEqual(app.test_client().get("/api/reservations?user_email=user@example.test").status_code, 401)
        forged = self.book(1, user_email="staff@example.test")
        with db_conn() as conn:
            row = conn.execute("SELECT u.email,o.user_email FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=%s", (forged,)).fetchone()
            self.assertEqual(row, ("user@example.test", "user@example.test"))

    def test_missing_csrf_bad_origin_and_guest_email_booking_fail(self):
        order = self.book()
        before = self.records(order)
        for headers in (ORIGIN, {**self.owner_headers, "X-CSRF-Token": "invalid"},
                        {**self.owner_headers, "Origin": "https://evil.test"}):
            self.assertEqual(self.cancel(order, headers=headers).status_code, 403)
        self.assertEqual(self.records(order), before)
        self.assertEqual(app.test_client().post("/api/reservations", json={"user_email": "user@example.test"}).status_code, 401)
        self.assertEqual(self.owner.get("/api/admin/session").status_code, 401)

    def test_server_checks_exact_deadline_and_ignores_client_time(self):
        start = datetime.combine(self.today + timedelta(days=1), time(12), tzinfo=JST)
        for seat, seconds, expected in ((0, -1, 200), (1, 0, 200), (2, 1, 409), (3, 3600, 409)):
            order = self.book(seat)
            before = self.records(order)
            with patch("reservation_policy.now_jst", return_value=start - timedelta(hours=1) + timedelta(seconds=seconds)):
                response = self.cancel(order, show_start_at="2099-01-01T12:00:00+09:00", now="2000-01-01")
                self.assertEqual(response.status_code, expected, response.json)
            if expected == 409:
                self.assertEqual(self.records(order), before)

    def test_cancel_retries_are_idempotent_even_after_deadline(self):
        order = self.book()
        self.assertEqual(self.cancel(order).status_code, 200)
        before = self.records(order)
        with patch("reservation_policy.now_jst", return_value=datetime(2099, 1, 1, tzinfo=JST)):
            again = self.cancel(order)
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.json["released_seats"], [])
        self.assertEqual(self.records(order), before)

    def test_concurrent_cancellations_release_only_once(self):
        order = self.book()
        client2, headers2 = self.member("user@example.test")
        barrier = Barrier(2)
        def request(client, headers):
            barrier.wait(timeout=10)
            return self.cancel(order, client, headers)
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(request, self.owner, self.owner_headers), pool.submit(request, client2, headers2)]
            results = [future.result(timeout=20) for future in futures]
        self.assertEqual([result.status_code for result in results], [200, 200])
        self.assertEqual(sum(len(result.json["released_seats"]) for result in results), 1)

    def test_failure_after_payment_update_rolls_back_everything(self):
        order = self.book()
        before = self.records(order)
        with db_conn() as conn:
            conn.execute("""CREATE FUNCTION reject_seat_release() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN RAISE EXCEPTION 'intentional rollback test'; END $$;
                CREATE TRIGGER reject_seat_release BEFORE UPDATE ON reservation_seats
                FOR EACH ROW EXECUTE FUNCTION reject_seat_release();""")
        try:
            self.assertEqual(self.cancel(order).status_code, 503)
            self.assertEqual(self.records(order), before)
        finally:
            with db_conn() as conn:
                conn.execute("DROP TRIGGER reject_seat_release ON reservation_seats; DROP FUNCTION reject_seat_release();")

    def test_pending_cancels_without_refund_and_expired_does_not_release(self):
        pending = self.book()
        expired = self.book(1)
        with db_conn() as conn:
            conn.execute("UPDATE orders SET order_status='pending' WHERE id=%s", (pending,))
            conn.execute("UPDATE payments SET payment_status='unpaid' WHERE order_id=%s", (pending,))
            conn.execute("UPDATE orders SET order_status='expired' WHERE id=%s", (expired,))
        response = self.cancel(pending)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["payment_status"], "unpaid")
        self.assertEqual(response.json["refunded_amount"], 0)
        before = self.records(expired)
        self.assertEqual(self.cancel(expired).status_code, 409)
        self.assertEqual(self.records(expired), before)

    def test_login_register_cookie_expiry_and_logout_revocation(self):
        client = app.test_client()
        self.assertEqual(client.post("/api/login", json={"email": "user@example.test", "password": self.password}).status_code, 403)
        response = client.post("/api/register", json={"name": "New member", "email": "new-member@example.test", "password": self.password, "role": "ADMIN"}, headers=ORIGIN)
        self.assertEqual(response.status_code, 201, response.json)
        cookie = response.headers["Set-Cookie"]
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=Strict", cookie)
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        token = client.get_cookie(COOKIE).value
        with db_conn() as conn:
            stored = conn.execute("SELECT token_hash FROM member_sessions WHERE user_id=%s", (response.json["user"]["id"],)).fetchone()[0]
            self.assertEqual(stored, digest(token))
            self.assertNotEqual(stored, token)
        self.assertEqual(client.get("/api/member/session").status_code, 200)
        headers = {**ORIGIN, "X-CSRF-Token": response.json["csrf_token"]}
        self.assertEqual(client.post("/api/member/logout", headers=headers).status_code, 200)
        client.set_cookie(COOKIE, token)
        self.assertEqual(client.get("/api/member/session").status_code, 401)
        with db_conn() as conn:
            conn.execute("UPDATE member_sessions SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second'")
        self.assertEqual(self.owner.get("/api/member/session").status_code, 401)

    def test_additive_migration_preserves_orders_and_is_repeatable(self):
        from manage import migrate
        order = self.book()
        before = self.records(order)
        migrate()
        migrate()
        self.assertEqual(self.records(order), before)
