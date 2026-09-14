"""Scheduling rules and real API/transaction checks in an isolated PostgreSQL DB."""
import os
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, time, timedelta, timezone
from threading import Barrier
from unittest.mock import patch

import test_admin_api as fixtures
from app import app
from auto_schedule import JAPAN, ScheduleInputError, daily_showings_from, plan_showings
from database.db import db_conn


class PlannerTest(unittest.TestCase):
    def setUp(self):
        self.day = date(2026, 9, 15)
        self.now = datetime(2026, 9, 14, 23, tzinfo=JAPAN)
        self.movie = {"id": "new", "duration_minutes": 110, "screening_start": self.day,
                      "screening_end": self.day + timedelta(days=1)}
        self.screens = [{"id": "room-a", "seat_count": 20}, {"id": "room-b", "seat_count": 20}]

    def plan(self, existing=(), **options):
        return plan_showings(self.movie, self.screens, existing, now=self.now, **options)

    def showing(self, start, end, movie_id="other", screen_id="room-a"):
        return {"movie_id": movie_id, "screen_id": screen_id, "show_date": self.day,
                "start_time": time.fromisoformat(start), "end_time": time.fromisoformat(end)}

    def assert_clearance(self, showings):
        for first in showings:
            for second in showings:
                if first is second or first["show_date"] != second["show_date"]:
                    continue
                if first["screen_id"] != second["screen_id"] and first["movie_id"] != second["movie_id"]:
                    continue
                start = datetime.combine(first["show_date"], first["start_time"])
                end = datetime.combine(second["show_date"], second["end_time"])
                if first["start_time"] >= second["start_time"]:
                    self.assertGreaterEqual(start - end, timedelta(minutes=20))

    def test_default_spreads_three_showings_and_includes_boundary_days(self):
        rows, result = self.plan()
        self.assertEqual(result["created_count"], 6)
        self.assertEqual(result["unfilled_count"], 0)
        for day in (self.day, self.day + timedelta(days=1)):
            self.assertEqual([row["start_time"] for row in rows if row["show_date"] == day], [time(10), time(14), time(18)])
        self.assert_clearance(rows)

    def test_japan_today_lead_time_and_closing_time(self):
        self.movie["screening_start"] = self.day - timedelta(days=5)
        # 09:41 UTC is 18:41 in Japan: the earliest slot is 19:15, not 19:00.
        self.now = datetime(2026, 9, 15, 9, 41, tzinfo=timezone.utc)
        rows, result = self.plan()
        today = [row for row in rows if row["show_date"] == self.day]
        self.assertEqual(today[0]["start_time"], time(19, 15))
        self.assertTrue(all(row["end_time"] <= time(23) for row in rows))
        self.assertTrue(all(row["show_date"] >= self.day for row in rows))
        self.assertGreater(result["unfilled_count"], 0)

    def test_rooms_and_exact_twenty_minute_gap(self):
        self.movie["screening_end"] = self.day
        self.movie["duration_minutes"] = 120
        self.screens = self.screens[:1]
        existing = [self.showing("10:00", "12:10")]
        rows, _ = self.plan(existing, daily_showings=1)
        self.assertIn(time(12, 30), [row["start_time"] for row in rows])
        self.assert_clearance([*existing, *rows])
        self.screens.append({"id": "room-b", "seat_count": 20})
        rows, _ = self.plan(existing, daily_showings=1)
        self.assertEqual((rows[0]["screen_id"], rows[0]["start_time"]), ("room-b", time(10)))
        self.assert_clearance([*existing, *rows])

    def test_existing_movie_counts_and_repeat_do_not_duplicate(self):
        existing = [self.showing("11:00", "12:50", movie_id="new")]
        rows, result = self.plan(existing)
        self.assertEqual(result["created_count"], 5)
        self.assertEqual(result["existing_count"], 1)
        self.assert_clearance([*existing, *rows])
        repeated, result = self.plan([*existing, *rows])
        self.assertEqual(repeated, [])
        self.assertEqual(result["unfilled_count"], 0)
        self.assertEqual(result["existing_count"], 6)

    def test_no_rooms_full_rooms_and_long_film_report_shortfall(self):
        self.movie["screening_end"] = self.day
        self.screens = []
        rows, result = self.plan()
        self.assertEqual(rows, [])
        self.assertEqual(result["unfilled_count"], 3)
        self.assertEqual(result["unfilled_dates"], [self.day.isoformat()])
        self.screens = [{"id": "room-a", "seat_count": 20}]
        self.assertEqual(self.plan([self.showing("09:00", "23:30")])[0], [])
        self.movie["duration_minutes"] = 600
        rows, result = self.plan()
        self.assertEqual(len(rows), 1)
        self.assertLessEqual(rows[0]["end_time"], time(23))
        self.assertEqual(result["unfilled_count"], 2)

    def test_period_and_daily_count_validation(self):
        self.movie["screening_end"] = self.day - timedelta(days=2)
        self.movie["screening_start"] = self.day - timedelta(days=3)
        rows, result = self.plan()
        self.assertEqual(rows, [])
        self.assertIsNone(result["first_date"])
        self.movie["screening_start"] = None
        with self.assertRaises(ScheduleInputError):
            self.plan()
        self.movie["screening_start"] = self.day
        self.movie["screening_end"] = self.day + timedelta(days=366)
        with self.assertRaises(ScheduleInputError):
            self.plan()
        for value in (True, 0, 7, "3", 1.5, None):
            with self.subTest(value=value), self.assertRaises(ScheduleInputError):
                daily_showings_from({"daily_showings": value})
        self.assertEqual(daily_showings_from({}), 3)

    def test_preferred_times_do_not_leave_usable_slots_empty(self):
        self.movie["screening_end"] = self.day
        rows, result = self.plan(daily_showings=6)
        # 110 minutes + a 20-minute gap, on a 15-minute grid: five fit before 23:00.
        self.assertEqual(len(rows), 5)
        self.assertEqual(result["unfilled_count"], 1)
        self.assert_clearance(rows)
        self.movie["duration_minutes"] = 100
        rows, result = self.plan(daily_showings=6)
        self.assertEqual(len(rows), 6)
        self.assertEqual(result["unfilled_count"], 0)
        self.assert_clearance(rows)


@unittest.skipUnless(os.getenv("ADMIN_TEST_DATABASE_URL"), "Set ADMIN_TEST_DATABASE_URL for PostgreSQL integration tests")
class AutoScheduleApiTest(unittest.TestCase):
    # Reuse only the isolated database/auth fixture, not the original test methods.
    setUpClass = classmethod(fixtures.AdminApiTest.setUpClass.__func__)
    tearDownClass = classmethod(fixtures.AdminApiTest.tearDownClass.__func__)
    create = fixtures.AdminApiTest.create

    def setUp(self):
        fixtures.AdminApiTest.setUp(self)
        self.day = self.today + timedelta(days=1)
        self.payload.update(screening_start=self.day.isoformat(), screening_end=(self.day + timedelta(days=1)).isoformat())

    def auto(self, movie_id, **body):
        return self.client.post(f"/api/admin/movies/{movie_id}/auto-schedule", json=body, headers=self.headers)

    def showings(self, movie_id=None):
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT id, movie_id, screen_id, show_date, start_time, end_time FROM showings ORDER BY show_date, start_time")
            return [row for row in cur.fetchall() if movie_id is None or row[1] == movie_id]

    def test_default_create_is_published_and_bookable(self):
        result = self.client.post("/api/admin/movies", json=self.payload, headers=self.headers)
        self.assertEqual(result.status_code, 201, result.json)
        self.assertEqual(result.json["auto_schedule"]["created_count"], 6)
        movie = result.json["movie"]
        detail = self.client.get(f"/api/movies/{movie['id']}").json
        self.assertEqual(len(detail["showings"]), 6)
        self.assertEqual(self.client.get("/api/movies").json[0]["id"], movie["id"])
        showing_id = detail["showings"][0]["id"]
        seats = self.client.get(f"/api/screenings/{showing_id}").json["seats"]
        self.assertEqual(len(seats), 20)
        fixtures.hold_seats(self.customer, showing_id, [seats[0]["id"]])
        booking = self.customer.post("/api/reservations", headers=self.customer_headers, json={"movie_id": movie["id"], "screening_id": showing_id,
            "seat_ids": [seats[0]["id"]], "ticket_count": 1, "ticket_types": [{"ticket_type_id": "general", "quantity": 1}],
            "payment_method": "credit-card", "user_email": "user@example.test"})
        self.assertEqual(booking.status_code, 201, booking.json)
        before = self.showings()
        repeat = self.auto(movie["id"])
        self.assertEqual(repeat.json["auto_schedule"]["created_count"], 0)
        self.assertEqual(self.showings(), before)
        self.assertTrue(self.client.get(f"/api/screenings/{showing_id}").json["seats"][0]["reserved"])
        self.assertEqual(self.client.delete(f"/api/admin/showings/{showing_id}", headers=self.headers).status_code, 409)

    def test_opt_out_then_fill_existing_and_top_up_only(self):
        movie = self.create()
        self.assertEqual(self.showings(), [])
        first = self.auto(movie["id"], daily_showings=1)
        self.assertEqual(first.json["auto_schedule"]["created_count"], 2)
        before_ids = {row[0] for row in self.showings()}
        second = self.auto(movie["id"], daily_showings=3)
        self.assertEqual(second.json["auto_schedule"]["created_count"], 4)
        self.assertTrue(before_ids <= {row[0] for row in self.showings()})
        self.assertEqual(self.auto(movie["id"]).json["auto_schedule"]["created_count"], 0)

    def test_missing_rooms_saves_movie_and_reports_every_unfilled_day(self):
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM screens")
        result = self.client.post("/api/admin/movies", json=self.payload, headers=self.headers)
        self.assertEqual(result.status_code, 201, result.json)
        report = result.json["auto_schedule"]
        self.assertEqual((report["created_count"], report["unfilled_count"]), (0, 6))
        self.assertEqual(len(report["unfilled_dates"]), 2)
        self.assertIn("割り当てられませんでした", result.json["message"])

    def test_invalid_settings_leave_no_movie_and_missing_movie_returns_404(self):
        for changes in ({"daily_showings": True}, {"daily_showings": 7}, {"auto_schedule": "true"},
                        {"screening_end": (self.day + timedelta(days=366)).isoformat()}):
            with self.subTest(changes=changes):
                result = self.client.post("/api/admin/movies", json={**self.payload, **changes}, headers=self.headers)
                self.assertEqual(result.status_code, 422, result.json)
                self.assertEqual(self.client.get("/api/movies").json, [])
        self.assertEqual(self.auto("absent").status_code, 404)

    def test_transaction_rolls_back_movie_showings_and_seats_on_failure(self):
        from screening_service import ensure_screen_seats

        def fail_after_seats(cur, screen):
            ensure_screen_seats(cur, screen)
            raise RuntimeError("injected storage failure")

        with patch("auto_schedule.ensure_screen_seats", side_effect=fail_after_seats):
            response = self.client.post("/api/admin/movies", json=self.payload, headers=self.headers)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("injected", response.text)
        with db_conn() as conn, conn.cursor() as cur:
            for table in ("movies", "showings", "seats"):
                cur.execute(f"SELECT count(*) FROM {table}")
                self.assertEqual(cur.fetchone()[0], 0)

    def test_existing_endpoint_requires_admin_and_csrf(self):
        movie = self.create()
        path = f"/api/admin/movies/{movie['id']}/auto-schedule"
        self.assertEqual(app.test_client().post(path, json={}).status_code, 401)
        self.assertEqual(self.client.post(path, json={}, headers=fixtures.ORIGIN).status_code, 403)
        self.assertEqual(self.client.post(path, json={}, headers={**self.headers, "Origin": "https://evil.test"}).status_code, 403)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("UPDATE users SET role='USER' WHERE email='staff@example.test'")
        self.assertEqual(self.auto(movie["id"]).status_code, 403)
        self.assertEqual(self.showings(), [])

    def test_manual_showings_obey_same_twenty_minute_clearance(self):
        movie = self.create()
        self.assertEqual(self.auto(movie["id"], daily_showings=1).status_code, 200)
        data = {"movie_id": movie["id"], "screen_id": "test-screen", "show_date": self.day.isoformat()}
        self.assertEqual(self.client.post("/api/admin/showings", json={**data, "start_time": "12:09"}, headers=self.headers).status_code, 409)
        self.assertEqual(self.client.post("/api/admin/showings", json={**data, "start_time": "12:10"}, headers=self.headers).status_code, 201)

    def concurrent_requests(self, requests):
        barrier = Barrier(len(requests))

        def run(values):
            client = app.test_client()
            login = client.post("/api/admin/login", json={"email": "staff@example.test", "password": self.password}, headers=fixtures.ORIGIN)
            headers = {**fixtures.ORIGIN, "X-CSRF-Token": login.json["csrf_token"]}
            barrier.wait(timeout=10)
            return client.post(values[0], json=values[1], headers=headers)

        with ThreadPoolExecutor(max_workers=len(requests)) as pool:
            return list(pool.map(run, requests))

    def assert_rooms_do_not_overlap(self):
        rows = self.showings()
        for earlier in rows:
            for later in rows:
                if earlier[0] == later[0] or earlier[2:4] != later[2:4] or earlier[4] > later[4]:
                    continue
                gap = datetime.combine(later[3], later[4]) - datetime.combine(earlier[3], earlier[5])
                self.assertGreaterEqual(gap, timedelta(minutes=20))

    def test_concurrent_new_movies_cannot_overbook_a_room(self):
        responses = self.concurrent_requests([("/api/admin/movies", {**self.payload, "title": title}) for title in ("A", "B")])
        self.assertEqual([response.status_code for response in responses], [201, 201])
        self.assert_rooms_do_not_overlap()

    def test_concurrent_fill_of_same_movie_is_idempotent(self):
        movie = self.create()
        path = f"/api/admin/movies/{movie['id']}/auto-schedule"
        responses = self.concurrent_requests([(path, {}), (path, {})])
        self.assertEqual([response.status_code for response in responses], [200, 200])
        self.assertEqual(sorted(response.json["auto_schedule"]["created_count"] for response in responses), [0, 6])
        self.assertEqual(len(self.showings()), 6)
        self.assert_rooms_do_not_overlap()

    def test_concurrent_manual_and_automatic_insertion_share_room_lock(self):
        movie = self.create()
        self.payload["title"] = "Another film"
        another = self.create()
        responses = self.concurrent_requests([
            (f"/api/admin/movies/{movie['id']}/auto-schedule", {}),
            ("/api/admin/showings", {"movie_id": another["id"], "screen_id": "test-screen", "show_date": self.day.isoformat(), "start_time": "10:00"})])
        self.assertEqual(responses[0].status_code, 200, responses[0].json)
        self.assertIn(responses[1].status_code, (201, 409))
        self.assert_rooms_do_not_overlap()


if __name__ == "__main__":
    unittest.main()
