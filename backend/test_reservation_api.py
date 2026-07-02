import sys
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import app as app_module  # noqa: E402


class FakeDatabase:
    def __init__(self, reserved=None, reservations=None):
        self.reserved = set(reserved or [])
        self.reservations = list(reservations or [])
        self.next_reservation_id = 100
        self.reservation_rows = []

    def connect(self):
        return FakeConnection(self)


class FakeConnection:
    def __init__(self, database):
        self.database = database

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def cursor(self):
        return FakeCursor(self.database)


class FakeCursor:
    def __init__(self, database):
        self.database = database
        self.rows = []
        self.row = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def execute(self, sql, params=None):
        normalized = " ".join(sql.split()).lower()
        params = params or ()

        if normalized.startswith("select id from users"):
            email = params[0]
            self.row = (7,) if email == "test@example.com" else None
            self.rows = []
            return

        if "select seat_label" in normalized and "= any" in normalized:
            screening_id, seat_ids = params
            self.rows = [
                (seat_id,)
                for seat_id in seat_ids
                if (screening_id, seat_id) in self.database.reserved
            ]
            self.row = None
            return

        if "select reservation_id, seat_label" in normalized:
            reservation_ids = set(params[0])
            seats = []
            for reservation in self.database.reservations:
                if reservation["id"] in reservation_ids:
                    seats.extend(
                        (reservation["id"], seat_label)
                        for seat_label in reservation["seats"]
                    )
            self.rows = seats
            self.row = None
            return

        if "select seat_label" in normalized and "from reservation_seats" in normalized:
            screening_id = params[0]
            seats = sorted(
                seat_label
                for reserved_screening_id, seat_label in self.database.reserved
                if reserved_screening_id == screening_id
            )
            self.rows = [(seat_label,) for seat_label in seats]
            self.row = None
            return

        if normalized.startswith("select") and "from reservations" in normalized:
            email = params[0] if params else None
            reservations = [
                reservation
                for reservation in self.database.reservations
                if not email or reservation["user_email"] == email
            ]
            self.rows = [
                (
                    reservation["id"],
                    reservation["user_email"],
                    reservation["movie_id"],
                    reservation["screening_id"],
                    reservation["screen_name"],
                    reservation["screening_time"],
                    reservation["ticket_count"],
                    reservation["ticket_total_price"],
                    reservation["food_total_price"],
                    reservation["total_price"],
                    reservation["status"],
                    reservation["created_at"],
                )
                for reservation in reservations
            ]
            self.row = None
            return

        if normalized.startswith("insert into reservations"):
            reservation_id = self.database.next_reservation_id
            self.database.next_reservation_id += 1
            self.database.reservation_rows.append(params)
            self.row = (reservation_id, datetime(2026, 6, 30, 12, 0, 0))
            self.rows = []
            return

        if normalized.startswith("insert into reservation_seats"):
            _reservation_id, screening_id, seat_label = params
            self.database.reserved.add((screening_id, seat_label))
            self.row = None
            self.rows = []
            return

        raise AssertionError(f"Unexpected SQL: {sql}")

    def fetchone(self):
        return self.row

    def fetchall(self):
        return self.rows


class ReservationApiTest(unittest.TestCase):
    def setUp(self):
        app_module.app.config.update(TESTING=True)
        self.client = app_module.app.test_client()

    def test_get_reserved_seats_returns_screening_scoped_reserved_seats(self):
        fake_db = FakeDatabase(
            reserved={
                ("scr-1820", "C-4"),
                ("scr-1820", "C-5"),
                ("scr-2050", "A-1"),
            }
        )

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.get("/api/screenings/scr-1820/reserved-seats")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {
                "status": "ok",
                "screening_id": "scr-1820",
                "reserved_seats": ["C-4", "C-5"],
            },
        )

    def test_create_reservation_inserts_reservation_and_seats(self):
        fake_db = FakeDatabase()

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.post(
                "/api/reservations",
                json={
                    "user_email": "test@example.com",
                    "movie_id": "movie-001",
                    "screening_id": "scr-1820",
                    "screen_name": "スクリーン 3",
                    "screening_time": "18:20",
                    "seat_ids": ["C-4", "C-5"],
                    "ticket_count": 2,
                    "ticket_total_price": 3600,
                    "food_total_price": 0,
                    "total_price": 3600,
                },
            )

        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["reservation_id"], 100)
        self.assertEqual(payload["reserved_seats"], ["C-4", "C-5"])
        self.assertIn(("scr-1820", "C-4"), fake_db.reserved)
        self.assertIn(("scr-1820", "C-5"), fake_db.reserved)

    def test_create_reservation_returns_409_when_a_seat_is_already_reserved(self):
        fake_db = FakeDatabase(reserved={("scr-1820", "C-4")})

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.post(
                "/api/reservations",
                json={
                    "movie_id": "movie-001",
                    "screening_id": "scr-1820",
                    "seat_ids": ["C-4", "C-5"],
                    "ticket_count": 2,
                    "total_price": 3600,
                },
            )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.get_json()["conflict_seats"], ["C-4"])
        self.assertNotIn(("scr-1820", "C-5"), fake_db.reserved)

    def test_get_reservations_returns_user_scoped_purchase_history(self):
        fake_db = FakeDatabase(
            reservations=[
                {
                    "id": 101,
                    "user_email": "test@example.com",
                    "movie_id": "movie-001",
                    "screening_id": "scr-1820",
                    "screen_name": "スクリーン 3",
                    "screening_time": "18:20",
                    "ticket_count": 2,
                    "ticket_total_price": 3600,
                    "food_total_price": 980,
                    "total_price": 4580,
                    "status": "reserved",
                    "created_at": datetime(2026, 6, 30, 12, 0, 0),
                    "seats": ["C-4", "C-5"],
                },
                {
                    "id": 102,
                    "user_email": "other@example.com",
                    "movie_id": "movie-001",
                    "screening_id": "scr-2050",
                    "screen_name": "スクリーン 1",
                    "screening_time": "20:50",
                    "ticket_count": 1,
                    "ticket_total_price": 1800,
                    "food_total_price": 0,
                    "total_price": 1800,
                    "status": "reserved",
                    "created_at": datetime(2026, 6, 30, 13, 0, 0),
                    "seats": ["D-1"],
                },
            ]
        )

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.get("/api/reservations?user_email=test@example.com")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {
                "status": "ok",
                "reservations": [
                    {
                        "id": 101,
                        "user_email": "test@example.com",
                        "movie_id": "movie-001",
                        "screening_id": "scr-1820",
                        "screen_name": "スクリーン 3",
                        "screening_time": "18:20",
                        "ticket_count": 2,
                        "ticket_total_price": 3600,
                        "food_total_price": 980,
                        "total_price": 4580,
                        "reservation_status": "reserved",
                        "created_at": "2026-06-30T12:00:00",
                        "seats": ["C-4", "C-5"],
                    },
                ],
            },
        )

    def test_schema_adds_reservation_tables_and_screening_seat_unique_constraint(self):
        ddl = (ROOT_DIR / "DDL.txt").read_text(encoding="utf-8")

        self.assertIn("CREATE TABLE reservations", ddl)
        self.assertIn("CREATE TABLE reservation_seats", ddl)
        self.assertIn("UNIQUE (screening_id, seat_label)", ddl)


if __name__ == "__main__":
    unittest.main()