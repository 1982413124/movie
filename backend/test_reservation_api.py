import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import app as app_module  # noqa: E402


class FakeDatabase:
    def __init__(self, reserved=None, orders=None, fail_on=None):
        self.reserved = set(reserved or [])
        self.orders = list(orders or [])
        self.next_order_id = 100
        self.order_rows = []
        self.legacy_reservation_rows = []
        self.reservation_seat_rows = []
        self.legacy_ticket_type_rows = []
        self.food_order_detail_rows = []
        self.payment_rows = []
        self.movie_rows = []
        self.theater_rows = []
        self.screen_rows = []
        self.showing_rows = []
        self.seat_master_rows = []
        self.ticket_type_master_rows = []
        self.food_master_rows = []
        self.operation_log = []
        self.released_seats = set()
        self.fail_on = fail_on
        self.last_connection = None
        self.point_balance = 0
        self.movie_masters = {
            "movie-001": {"title": "映画のタイトル", "duration_minutes": 124},
        }
        self.screen_masters = {
            "screen-3": {"theater_id": 1, "name": "スクリーン 3", "seat_count": 200},
        }
        self.showing_masters = {
            "scr-1820": {
                "movie_id": "movie-001",
                "screen_id": "screen-3",
                "show_date": "2026-07-03",
                "start_time": "18:20",
                "end_time": "20:24",
            },
        }
        self.seat_masters = {
            "A-5": {"screen_id": "screen-3", "row_name": "A", "seat_number": 5, "seat_label": "A-5"},
            "A-6": {"screen_id": "screen-3", "row_name": "A", "seat_number": 6, "seat_label": "A-6"},
            "A-7": {"screen_id": "screen-3", "row_name": "A", "seat_number": 7, "seat_label": "A-7"},
            "C-4": {"screen_id": "screen-3", "row_name": "C", "seat_number": 4, "seat_label": "C-4"},
            "C-5": {"screen_id": "screen-3", "row_name": "C", "seat_number": 5, "seat_label": "C-5"},
        }
        self.ticket_type_masters = {
            "general": {"label": "一般", "current_price": 1800},
            "child": {"label": "子供", "current_price": 1000},
        }
        self.food_masters = {
            "set-a": {"name": "シネマセットA", "current_price": 980},
        }

    def connect(self):
        connection = FakeConnection(self)
        self.last_connection = connection
        return connection


class FakeConnection:
    def __init__(self, database):
        self.database = database
        self.committed = False
        self.rolled_back = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        if exc_type:
            self.rolled_back = True
        else:
            self.committed = True
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

        if self.database.fail_on and normalized.startswith(self.database.fail_on):
            raise RuntimeError("forced database failure")

        if normalized.startswith("insert into point_accounts") or normalized.startswith("insert into point_transactions"):
            self.row = None
            self.rows = []
            return
        if normalized.startswith("select balance from point_accounts"):
            self.row = (self.database.point_balance,)
            self.rows = []
            return
        if normalized.startswith("update point_accounts"):
            self.database.point_balance = params[0]
            return
        if normalized.startswith("select points_used, points_earned from orders"):
            self.row = (0, 0)  # Historical fixtures predate point accrual.
            return

        if normalized.startswith("select id from users"):
            email = params[0]
            self.row = (7,) if email == "test@example.com" else None
            self.rows = []
            return

        if normalized.startswith("select id") and "from theaters" in normalized:
            self.row = (1,)
            self.rows = []
            return

        if normalized.startswith("select sh.movie_id") and "from showings" in normalized:
            showing_id = params[0]
            showing = self.database.showing_masters.get(showing_id)
            if not showing:
                self.row = None
            else:
                movie = self.database.movie_masters.get(showing["movie_id"], {})
                screen = self.database.screen_masters.get(showing["screen_id"], {})
                self.row = (
                    showing["movie_id"],
                    movie.get("title"),
                    showing["screen_id"],
                    screen.get("name"),
                    showing["start_time"],
                    showing.get("started", False),
                )
            self.rows = []
            return

        if normalized.startswith("select id, screen_id") and "from seats" in normalized:
            seat_ids = params[0]
            self.rows = [
                (seat_id, seat["screen_id"])
                for seat_id in seat_ids
                for seat in [self.database.seat_masters.get(seat_id)]
                if seat
            ]
            self.row = None
            return

        if normalized.startswith("select id, label, current_price") and "from ticket_types" in normalized:
            ticket_type_ids = params[0]
            self.rows = [
                (ticket_type_id, ticket_type["label"], ticket_type["current_price"])
                for ticket_type_id in ticket_type_ids
                for ticket_type in [self.database.ticket_type_masters.get(ticket_type_id)]
                if ticket_type
            ]
            self.row = None
            return

        if normalized.startswith("select id, name, current_price") and "from foods" in normalized:
            food_ids = params[0]
            self.rows = [
                (food_id, food["name"], food["current_price"])
                for food_id in food_ids
                for food in [self.database.food_masters.get(food_id)]
                if food
            ]
            self.row = None
            return

        if "from reservation_seats" in normalized and "seat_id = any" in normalized:
            showing_id, seat_ids = params
            self.rows = [
                (seat_id,)
                for seat_id in seat_ids
                if (showing_id, seat_id) in self.database.reserved
                and (showing_id, seat_id) not in self.database.released_seats
            ]
            self.row = None
            return

        if "from reservation_seats" in normalized and "seat_label = any" in normalized:
            screening_id, seat_ids = params
            self.rows = [
                (seat_id,)
                for seat_id in seat_ids
                if (screening_id, seat_id) in self.database.reserved
                and (screening_id, seat_id) not in self.database.released_seats
            ]
            self.row = None
            return

        if normalized.startswith("insert into movies"):
            self.database.operation_log.append("movies")
            movie_id, title, duration_minutes = params[:3]
            if movie_id not in self.database.movie_masters:
                self.database.movie_rows.append(params)
                self.database.movie_masters[movie_id] = {
                    "title": title,
                    "duration_minutes": duration_minutes,
                }
            self.row = None
            self.rows = []
            return

        if normalized.startswith("insert into theaters"):
            self.database.theater_rows.append(params)
            self.database.operation_log.append("theaters")
            self.row = (1,)
            self.rows = []
            return

        if normalized.startswith("insert into screens"):
            self.database.operation_log.append("screens")
            screen_id, theater_id, name, seat_count = params[:4]
            if screen_id not in self.database.screen_masters:
                self.database.screen_rows.append(params)
                self.database.screen_masters[screen_id] = {
                    "theater_id": theater_id,
                    "name": name,
                    "seat_count": seat_count,
                }
            self.row = None
            self.rows = []
            return

        if normalized.startswith("insert into showings"):
            self.database.operation_log.append("showings")
            showing_id, movie_id, screen_id, show_date, start_time, end_time = params[:6]
            if showing_id not in self.database.showing_masters:
                self.database.showing_rows.append(params)
                self.database.showing_masters[showing_id] = {
                    "movie_id": movie_id,
                    "screen_id": screen_id,
                    "show_date": show_date,
                    "start_time": start_time,
                    "end_time": end_time,
                }
            self.row = None
            self.rows = []
            return

        if normalized.startswith("insert into seats"):
            self.database.operation_log.append("seats")
            seat_id, screen_id, row_name, seat_number, seat_label = params[:5]
            if seat_id not in self.database.seat_masters:
                self.database.seat_master_rows.append(params)
                self.database.seat_masters[seat_id] = {
                    "screen_id": screen_id,
                    "row_name": row_name,
                    "seat_number": seat_number,
                    "seat_label": seat_label,
                }
            self.row = None
            self.rows = []
            return

        if normalized.startswith("insert into ticket_types"):
            self.database.operation_log.append("ticket_types")
            ticket_type_id, label, current_price = params[:3]
            if ticket_type_id not in self.database.ticket_type_masters:
                self.database.ticket_type_master_rows.append(params)
                self.database.ticket_type_masters[ticket_type_id] = {
                    "label": label,
                    "current_price": current_price,
                }
            self.row = None
            self.rows = []
            return

        if normalized.startswith("insert into foods"):
            self.database.operation_log.append("foods")
            food_id, name, current_price = params[:3]
            if food_id not in self.database.food_masters:
                self.database.food_master_rows.append(params)
                self.database.food_masters[food_id] = {
                    "name": name,
                    "current_price": current_price,
                }
            self.row = None
            self.rows = []
            return
        if normalized.startswith("insert into orders"):
            order_id = self.database.next_order_id
            self.database.next_order_id += 1
            self.database.order_rows.append(params)
            self.database.operation_log.append("orders")
            self.row = (order_id, datetime(2026, 6, 30, 12, 0, 0))
            self.rows = []
            return

        if normalized.startswith("insert into reservations"):
            reservation_id = self.database.next_order_id
            self.database.next_order_id += 1
            self.database.legacy_reservation_rows.append(params)
            self.row = (reservation_id, datetime(2026, 6, 30, 12, 0, 0))
            self.rows = []
            return

        if normalized.startswith("insert into reservation_seats"):
            self.database.reservation_seat_rows.append(params)
            self.database.operation_log.append("reservation_seats")
            if len(params) >= 3:
                showing_id = params[1]
                seat_id = params[2]
                self.database.reserved.add((showing_id, seat_id))
            self.row = None
            self.rows = []
            return

        if normalized.startswith("insert into reservation_ticket_types"):
            self.database.legacy_ticket_type_rows.append(params)
            self.row = None
            self.rows = []
            return

        if normalized.startswith("insert into food_order_details"):
            self.database.food_order_detail_rows.append(params)
            self.database.operation_log.append("food_order_details")
            self.row = None
            self.rows = []
            return

        if normalized.startswith("insert into payments"):
            self.database.payment_rows.append(params)
            self.row = None
            self.rows = []
            return

        if normalized.startswith("select id, order_status") and "from orders" in normalized:
            order_id, user_id = params
            email = "test@example.com" if user_id == 7 else "other@example.com"
            order = next(
                (
                    item
                    for item in self.database.orders
                    if item["id"] == order_id and item["user_email"] == email
                ),
                None,
            )
            self.row = (order["id"], order["order_status"], order.get("cancelled_at")) if order else None
            self.rows = []
            return

        if normalized.startswith("select id, status") and "from reservations" in normalized:
            self.row = None
            self.rows = []
            return

        if normalized.startswith("select") and "from orders" in normalized:
            email = "test@example.com" if params[0] == 7 else "other@example.com"
            orders = [
                order
                for order in self.database.orders
                if not email or order["user_email"] == email
            ]
            self.rows = [
                (
                    order["id"],
                    order["user_email"],
                    order["total_amount"],
                    order["order_status"],
                    order["created_at"],
                    order.get("subtotal_amount", order["total_amount"]),
                    order.get("coupon_code"), order.get("coupon_discount_amount", 0),
                    order.get("points_used", 0), order.get("points_earned", 0),
                    order.get("order_num", str(order["id"])),
                )
                for order in orders
            ]
            self.row = None
            return

        if normalized.startswith("select sh.show_date, sh.start_time"):
            order = next(item for item in self.database.orders if item["id"] == params[0])
            self.rows = [(self.database.showing_masters[seat["showing_id"]]["show_date"],
                          self.database.showing_masters[seat["showing_id"]]["start_time"])
                         for seat in order["reservation_seats"]]
            return

        if "from reservation_seats" in normalized and "join showings" in normalized:
            order_ids = set(params[0])
            rows = []
            filters_active_seats = "rs.released_at is null" in normalized
            for order in self.database.orders:
                if order["id"] not in order_ids:
                    continue
                for seat in order["reservation_seats"]:
                    if filters_active_seats and seat.get("released_at") is not None:
                        continue
                    showing = self.database.showing_masters.get(seat["showing_id"], {})
                    rows.append(
                        (
                            order["id"],
                            showing.get("movie_id", seat.get("movie_id")),
                            seat.get("movie_title_at_purchase", "映画のタイトル"),
                            seat["showing_id"],
                            seat["screen_name"],
                            seat["showing_time"],
                            seat["seat_id"],
                            seat["ticket_type_id"],
                            seat["ticket_type_label"],
                            seat["price_at_purchase"],
                            showing.get("show_date"),
                            seat.get("seat_label", seat["seat_id"]),
                        )
                    )
            self.rows = rows
            self.row = None
            return


        if "from food_order_details" in normalized and normalized.startswith("select"):
            order_ids = set(params[0])
            rows = []
            for order in self.database.orders:
                if order["id"] not in order_ids:
                    continue
                rows.extend(
                    (
                        order["id"],
                        item["food_id"],
                        item["name"],
                        item["quantity"],
                        item["unit_price"],
                        item["subtotal"],
                    )
                    for item in order.get("food_order_details", [])
                )
            self.rows = rows
            self.row = None
            return

        if "from payments" in normalized and normalized.startswith("select"):
            order_ids = set(params[0])
            rows = []
            for order in self.database.orders:
                if order["id"] not in order_ids or not order.get("payment"):
                    continue
                payment = order["payment"]
                rows.append(
                    (
                        order["id"],
                        payment["payment_method"],
                        payment["payment_amount"],
                        payment["payment_status"],
                        payment["paid_at"],
                    )
                )
            self.rows = rows
            self.row = None
            return

        if "from reservation_seats" in normalized and "where" in normalized and ("showing_id = %s" in normalized or "screening_id = %s" in normalized):
            showing_id = params[0]
            seats = sorted(
                seat_id
                for reserved_showing_id, seat_id in self.database.reserved
                if reserved_showing_id == showing_id
                and (reserved_showing_id, seat_id) not in self.database.released_seats
            )
            self.rows = [(seat_id,) for seat_id in seats]
            self.row = None
            return

        if normalized.startswith("select") and "from reservations" in normalized:
            self.rows = []
            self.row = None
            return

        if normalized.startswith("update orders"):
            order_id = params[0]
            order = next(
                (item for item in self.database.orders if item["id"] == order_id),
                None,
            )
            if order:
                order["order_status"] = "cancelled"
                if "cancelled_at" in normalized:
                    order["cancelled_at"] = datetime(2026, 6, 30, 12, 5, 0)
                self.row = (order["id"], order["order_status"], order.get("cancelled_at"))
            else:
                self.row = None
            self.rows = []
            return

        if normalized.startswith("update payments"):
            order_id = params[0]
            order = next(
                (item for item in self.database.orders if item["id"] == order_id),
                None,
            )
            rows = []
            if order and order.get("payment"):
                payment = order["payment"]
                if payment["payment_status"] == "paid":
                    payment["payment_status"] = "refunded"
                    rows.append(("refunded",))
            self.rows = rows
            self.row = rows[0] if rows else None
            return

        if normalized.startswith("update reservations"):
            self.row = None
            self.rows = []
            return

        if normalized.startswith("update reservation_seats"):
            order_id = params[0]
            order = next(
                (item for item in self.database.orders if item["id"] == order_id),
                None,
            )
            released = []
            if order:
                for seat in order["reservation_seats"]:
                    if seat.get("released_at") is not None:
                        continue
                    key = (seat["showing_id"], seat["seat_id"])
                    self.database.released_seats.add(key)
                    seat["released_at"] = datetime(2026, 6, 30, 12, 5, 0)
                    released.append(key)
            self.rows = released
            self.row = None
            return

        raise AssertionError(f"Unexpected SQL: {sql}")

    def fetchone(self):
        return self.row

    def fetchall(self):
        return self.rows


class ReservationApiTest(unittest.TestCase):
    def setUp(self):
        app_module.app.config.update(TESTING=True)
        # Outbox SQL/Resend delivery is covered against real PostgreSQL in test_booking_benefits.
        self.enterContext(patch.object(app_module, "enqueue_reservation_mail", return_value="queued"))
        # Ownership, expiry and concurrent consumption use real PostgreSQL in test_seat_holds.
        self.enterContext(patch.object(app_module, "consume_holds"))
        self.enterContext(patch.object(app_module, "lock_showing"))
        self.client = app_module.app.test_client()
        self.client.environ_base.update(HTTP_ORIGIN="http://localhost:3000", HTTP_X_CSRF_TOKEN="unit-csrf")
        member = patch("member_auth.load_member", return_value={"id": 7, "name": "Test", "email": "test@example.com", "csrf_token": "unit-csrf"})
        member.start()
        self.addCleanup(member.stop)
        clock = patch("reservation_policy.now_jst", return_value=datetime(2026, 6, 30, tzinfo=timezone(timedelta(hours=9))))
        clock.start()
        self.addCleanup(clock.stop)

    def test_get_reserved_seats_returns_showing_scoped_reserved_seats(self):
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

    def test_create_reservation_creates_order_seats_food_details_and_payment(self):
        fake_db = FakeDatabase()

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.post(
                "/api/reservations",
                json={
                    "user_email": "test@example.com",
                    "movie_id": "movie-001",
                    "movie_title": "映画のタイトル",
                    "movie_duration_minutes": 124,
                    "screening_id": "scr-1820",
                    "screen_id": "screen-3",
                    "screen_name": "スクリーン 3",
                    "screen_capacity": 200,
                    "screening_date": "2026-07-03",
                    "screening_time": "18:20",
                    "seat_ids": ["A-5", "A-6"],
                    "ticket_types": [
                        {
                            "ticket_type_id": "general",
                            "label": "一般",
                            "unit_price": 1,
                            "quantity": 1,
                        },
                        {
                            "ticket_type_id": "child",
                            "label": "子供",
                            "unit_price": 1,
                            "quantity": 1,
                        },
                    ],
                    "food_items": [
                        {
                            "food_id": "set-a",
                            "name": "シネマセットA",
                            "unit_price": 1,
                            "quantity": 1,
                            "subtotal": 1,
                        }
                    ],
                    "payment_method": "credit-card",
                    "ticket_count": 2,
                    "ticket_total_price": 2,
                    "food_total_price": 1,
                    "total_price": 3,
                },
            )

        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["reservation_id"], 100)
        self.assertEqual(payload["reserved_seats"], ["A-5", "A-6"])
        self.assertEqual(fake_db.ticket_type_master_rows, [])
        self.assertEqual(fake_db.food_master_rows, [])
        self.assertEqual(len(fake_db.order_rows), 1)
        self.assertEqual(fake_db.order_rows[0][0], 7)
        self.assertEqual(fake_db.order_rows[0][1], "test@example.com")
        self.assertEqual(fake_db.order_rows[0][3], 3780)
        self.assertEqual(fake_db.order_rows[0][4], "paid")
        self.assertEqual(
            fake_db.reservation_seat_rows,
            [
                (100, "scr-1820", "A-5", "映画のタイトル", "スクリーン 3", "18:20", "general", "一般", 1800),
                (100, "scr-1820", "A-6", "映画のタイトル", "スクリーン 3", "18:20", "child", "子供", 1000),
            ],
        )
        self.assertEqual(
            fake_db.food_order_detail_rows,
            [(100, "set-a", "シネマセットA", 1, 980, 980)],
        )
        self.assertEqual(fake_db.payment_rows, [(100, "credit-card", 3780, "paid")])
        self.assertEqual(fake_db.legacy_reservation_rows, [])

    def test_create_reservation_returns_400_when_ticket_count_does_not_match_seats(self):
        fake_db = FakeDatabase()

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.post(
                "/api/reservations",
                json={
                    "movie_id": "movie-001",
                    "screening_id": "scr-1820",
                    "seat_ids": ["A-5", "A-6", "A-7"],
                    "ticket_types": [
                        {
                            "ticket_type_id": "general",
                            "label": "一般",
                            "unit_price": 1,
                            "quantity": 1,
                        }
                    ],
                    "ticket_count": 1,
                    "ticket_total_price": 1800,
                    "total_price": 1800,
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["message"], "選択した座席数と券種の合計枚数が一致していません。")
        self.assertEqual(fake_db.order_rows, [])
        self.assertEqual(fake_db.reservation_seat_rows, [])

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

    def test_create_reservation_rejects_movie_that_does_not_match_showing(self):
        fake_db = FakeDatabase()

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.post(
                "/api/reservations",
                json={
                    "movie_id": "movie-other",
                    "screening_id": "scr-1820",
                    "seat_ids": ["A-5"],
                    "ticket_types": [
                        {
                            "ticket_type_id": "general",
                            "label": "一般",
                            "unit_price": 1800,
                            "quantity": 1,
                        }
                    ],
                    "ticket_count": 1,
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["message"], "上映回と映画が一致していません。")
        self.assertEqual(fake_db.movie_rows, [])
        self.assertEqual(fake_db.order_rows, [])
        self.assertEqual(fake_db.reservation_seat_rows, [])

    def test_create_reservation_rejects_seat_from_different_screen(self):
        fake_db = FakeDatabase()
        fake_db.seat_masters["A-5"]["screen_id"] = "screen-9"

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.post(
                "/api/reservations",
                json={
                    "movie_id": "movie-001",
                    "screening_id": "scr-1820",
                    "seat_ids": ["A-5"],
                    "ticket_types": [
                        {
                            "ticket_type_id": "general",
                            "label": "一般",
                            "unit_price": 1800,
                            "quantity": 1,
                        }
                    ],
                    "ticket_count": 1,
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["message"], "選択した座席はこの上映回のスクリーンに存在しません。")
        self.assertEqual(fake_db.order_rows, [])
        self.assertEqual(fake_db.reservation_seat_rows, [])

    def test_create_reservation_rolls_back_when_detail_insert_fails(self):
        fake_db = FakeDatabase(fail_on="insert into food_order_details")

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.post(
                "/api/reservations",
                json={
                    "user_email": "test@example.com",
                    "movie_id": "movie-001",
                    "screening_id": "scr-1820",
                    "seat_ids": ["A-5"],
                    "ticket_types": [
                        {
                            "ticket_type_id": "general",
                            "label": "一般",
                            "unit_price": 1800,
                            "quantity": 1,
                        }
                    ],
                    "food_items": [
                        {
                            "food_id": "set-a",
                            "name": "シネマセットA",
                            "unit_price": 980,
                            "quantity": 1,
                            "subtotal": 980,
                        }
                    ],
                    "payment_method": "credit-card",
                    "ticket_count": 1,
                },
            )

        self.assertEqual(response.status_code, 503)
        self.assertTrue(fake_db.last_connection.rolled_back)
    def test_get_reservations_returns_user_scoped_purchase_history(self):
        fake_db = FakeDatabase(
            orders=[
                {
                    "id": 101,
                    "user_email": "test@example.com",
                    "total_amount": 4580,
                    "order_status": "paid",
                    "created_at": datetime(2026, 6, 30, 12, 0, 0),
                    "reservation_seats": [
                        {
                            "movie_id": "movie-001",
                            "showing_id": "scr-1820",
                            "screen_name": "スクリーン 3",
                            "showing_time": "18:20",
                            "seat_id": "C-4",
                            "ticket_type_id": "general",
                            "ticket_type_label": "一般",
                            "price_at_purchase": 1800,
                        },
                        {
                            "movie_id": "movie-001",
                            "showing_id": "scr-1820",
                            "screen_name": "スクリーン 3",
                            "showing_time": "18:20",
                            "seat_id": "C-5",
                            "ticket_type_id": "child",
                            "ticket_type_label": "子供",
                            "price_at_purchase": 1000,
                        },
                    ],
                    "food_order_details": [
                        {
                            "food_id": "set-a",
                            "name": "シネマセットA",
                            "quantity": 1,
                            "unit_price": 980,
                            "subtotal": 980,
                        }
                    ],
                    "payment": {
                        "payment_method": "credit-card",
                        "payment_amount": 4580,
                        "payment_status": "paid",
                        "paid_at": datetime(2026, 6, 30, 12, 1, 0),
                    },
                },
                {
                    "id": 103,
                    "user_email": "test@example.com",
                    "total_amount": 3600,
                    "order_status": "cancelled",
                    "created_at": datetime(2026, 6, 30, 13, 0, 0),
                    "reservation_seats": [],
                    "food_order_details": [],
                    "payment": None,
                },
                {
                    "id": 102,
                    "user_email": "other@example.com",
                    "total_amount": 1800,
                    "order_status": "paid",
                    "created_at": datetime(2026, 6, 30, 13, 0, 0),
                    "reservation_seats": [],
                    "food_order_details": [],
                    "payment": None,
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
                        "movie_title": "映画のタイトル",
                        "screening_date": "2026-07-03",
                        "show_date": "2026-07-03",
                        "show_start_at": "2026-07-03T18:20:00+09:00",
                        "can_cancel": True,
                        "cancel_reason": None,
                        "cancel_deadline": "2026-07-03T17:20:00+09:00",
                        "refund_mode": "simulation",
                        "screen_name": "スクリーン 3",
                        "screening_time": "18:20",
                        "ticket_count": 2,
                        "ticket_total_price": 2800,
                        "food_total_price": 980,
                        "total_price": 4580,
                        "subtotal_amount": 4580,
                        "coupon_code": None,
                        "coupon_discount_amount": 0,
                        "points_used": 0,
                        "points_earned": 0,
                        "order_num": "101",
                        "reservation_status": "paid",
                        "payment_status": "paid",
                        "created_at": "2026-06-30T12:00:00",
                        "seats": ["C-4", "C-5"],
                        "seat_labels": ["C-4", "C-5"],
                        "ticket_types": [
                            {
                                "ticket_type_id": "general",
                                "label": "一般",
                                "unit_price": 1800,
                                "quantity": 1,
                            },
                            {
                                "ticket_type_id": "child",
                                "label": "子供",
                                "unit_price": 1000,
                                "quantity": 1,
                            },
                        ],
                        "food_items": [
                            {
                                "food_id": "set-a",
                                "name": "シネマセットA",
                                "quantity": 1,
                                "unit_price": 980,
                                "subtotal": 980,
                            }
                        ],
                    },
                ],
            },
        )

    def test_cancel_reservation_marks_order_cancelled_and_releases_seats(self):
        fake_db = FakeDatabase(
            reserved={("scr-1820", "C-4"), ("scr-1820", "C-5")},
            orders=[
                {
                    "id": 101,
                    "user_email": "test@example.com",
                    "total_amount": 3600,
                    "order_status": "paid",
                    "created_at": datetime(2026, 6, 30, 12, 0, 0),
                    "reservation_seats": [
                        {
                            "movie_id": "movie-001",
                            "showing_id": "scr-1820",
                            "screen_name": "スクリーン 3",
                            "showing_time": "18:20",
                            "seat_id": "C-4",
                            "ticket_type_id": "general",
                            "ticket_type_label": "一般",
                            "price_at_purchase": 1800,
                        },
                        {
                            "movie_id": "movie-001",
                            "showing_id": "scr-1820",
                            "screen_name": "スクリーン 3",
                            "showing_time": "18:20",
                            "seat_id": "C-5",
                            "ticket_type_id": "general",
                            "ticket_type_label": "一般",
                            "price_at_purchase": 1800,
                        },
                    ],
                    "food_order_details": [],
                    "payment": None,
                }
            ],
        )

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.patch(
                "/api/reservations/101/cancel",
                json={"user_email": "test@example.com"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["reservation_status"], "cancelled")
        self.assertEqual(fake_db.orders[0]["order_status"], "cancelled")
        self.assertIn(("scr-1820", "C-4"), fake_db.released_seats)
        self.assertIn(("scr-1820", "C-5"), fake_db.released_seats)

    def test_cancel_reservation_marks_paid_payment_refunded(self):
        fake_db = FakeDatabase(
            orders=[
                {
                    "id": 101,
                    "user_email": "test@example.com",
                    "total_amount": 1800,
                    "order_status": "paid",
                    "cancelled_at": None,
                    "created_at": datetime(2026, 6, 30, 12, 0, 0),
                    "reservation_seats": [
                        {
                            "movie_id": "movie-001",
                            "showing_id": "scr-1820",
                            "screen_name": "スクリーン 3",
                            "showing_time": "18:20",
                            "seat_id": "C-4",
                            "ticket_type_id": "general",
                            "ticket_type_label": "一般",
                            "price_at_purchase": 1800,
                            "released_at": None,
                        }
                    ],
                    "food_order_details": [],
                    "payment": {
                        "payment_method": "credit-card",
                        "payment_amount": 1800,
                        "payment_status": "paid",
                        "paid_at": datetime(2026, 6, 30, 12, 1, 0),
                    },
                }
            ],
        )

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.patch(
                "/api/reservations/101/cancel",
                json={"user_email": "test@example.com"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["payment_status"], "refunded")
        self.assertEqual(fake_db.orders[0]["payment"]["payment_status"], "refunded")

    def test_get_reservations_keeps_cancelled_history_seats_after_release(self):
        fake_db = FakeDatabase(
            orders=[
                {
                    "id": 103,
                    "user_email": "test@example.com",
                    "total_amount": 3600,
                    "order_status": "cancelled",
                    "cancelled_at": datetime(2026, 6, 30, 12, 5, 0),
                    "created_at": datetime(2026, 6, 30, 12, 0, 0),
                    "reservation_seats": [
                        {
                            "movie_id": "movie-001",
                            "movie_title_at_purchase": "映画のタイトル",
                            "showing_id": "scr-1820",
                            "screen_name": "スクリーン 3",
                            "showing_time": "18:20",
                            "seat_id": "C-4",
                            "ticket_type_id": "general",
                            "ticket_type_label": "一般",
                            "price_at_purchase": 1800,
                            "released_at": datetime(2026, 6, 30, 12, 5, 0),
                        },
                        {
                            "movie_id": "movie-001",
                            "movie_title_at_purchase": "映画のタイトル",
                            "showing_id": "scr-1820",
                            "screen_name": "スクリーン 3",
                            "showing_time": "18:20",
                            "seat_id": "C-5",
                            "ticket_type_id": "general",
                            "ticket_type_label": "一般",
                            "price_at_purchase": 1800,
                            "released_at": datetime(2026, 6, 30, 12, 5, 0),
                        },
                    ],
                    "food_order_details": [],
                    "payment": None,
                }
            ],
        )

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.get("/api/reservations?user_email=test@example.com")

        self.assertEqual(response.status_code, 200)
        reservation = response.get_json()["reservations"][0]
        self.assertEqual(reservation["reservation_status"], "cancelled")
        self.assertEqual(reservation["screening_id"], "scr-1820")
        self.assertEqual(reservation["seats"], ["C-4", "C-5"])
        self.assertEqual(reservation["ticket_count"], 2)

    def test_cancel_reservation_records_cancelled_at_and_preserves_history_values(self):
        fake_db = FakeDatabase(
            reserved={("scr-1820", "C-4")},
            orders=[
                {
                    "id": 101,
                    "user_email": "test@example.com",
                    "total_amount": 1800,
                    "order_status": "paid",
                    "cancelled_at": None,
                    "created_at": datetime(2026, 6, 30, 12, 0, 0),
                    "reservation_seats": [
                        {
                            "movie_id": "movie-001",
                            "showing_id": "scr-1820",
                            "screen_name": "スクリーン 3",
                            "showing_time": "18:20",
                            "seat_id": "C-4",
                            "ticket_type_id": "general",
                            "ticket_type_label": "一般",
                            "price_at_purchase": 1800,
                            "released_at": None,
                        },
                    ],
                    "food_order_details": [],
                    "payment": None,
                }
            ],
        )

        with patch.object(app_module, "db_conn", fake_db.connect):
            response = self.client.patch(
                "/api/reservations/101/cancel",
                json={"user_email": "test@example.com"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(fake_db.orders[0]["order_status"], "cancelled")
        self.assertIsNotNone(fake_db.orders[0]["cancelled_at"])
        seat = fake_db.orders[0]["reservation_seats"][0]
        self.assertEqual(seat["showing_id"], "scr-1820")
        self.assertEqual(seat["seat_id"], "C-4")
        self.assertIsNotNone(seat["released_at"])

    def test_active_seat_queries_use_status_and_released_at_not_nulling(self):
        source = (BACKEND_DIR / "app.py").read_text(encoding="utf-8")

        self.assertIn("o.order_status IN ('pending', 'paid')", source)
        self.assertIn("rs.released_at IS NULL", source)
        self.assertNotIn("o.order_status <> 'cancelled'", source)
        self.assertNotIn("screening_id = NULL", source)
        self.assertNotIn("seat_id = NULL", source)
        self.assertNotIn("seat_label = NULL", source)
        self.assertNotIn("order_id = NULL", source)

    def test_schema_adds_cancelled_at_jst_timezone_and_legacy_cleanup_notes(self):
        ddl = (ROOT_DIR / "DDL.txt").read_text(encoding="utf-8")
        migration = (ROOT_DIR / "backend" / "database" / "add_reservations.sql").read_text(encoding="utf-8")
        db_py = (ROOT_DIR / "backend" / "database" / "db.py").read_text(encoding="utf-8")

        self.assertIn("cancelled_at TIMESTAMPTZ", ddl)
        self.assertIn("CHECK (order_status IN ('pending', 'paid', 'cancelled', 'expired'))", ddl)
        self.assertIn("released_at TIMESTAMPTZ", ddl)
        self.assertIn("paid_at TIMESTAMPTZ", ddl)
        self.assertIn("ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ", migration)
        self.assertIn("UPDATE orders", migration)
        self.assertIn("order_status = 'paid'", migration)
        self.assertIn("DROP COLUMN IF EXISTS reservation_id", migration)
        self.assertIn("DROP COLUMN IF EXISTS screening_id", migration)
        self.assertIn("DROP COLUMN IF EXISTS seat_label", migration)
        self.assertIn("DROP COLUMN IF EXISTS movie_id", migration)
        self.assertIn("DROP TABLE screenings", migration)
        self.assertIn("DROP CONSTRAINT IF EXISTS fk_seats_screening", migration)
        self.assertIn("DROP COLUMN IF EXISTS col_num", migration)
        self.assertIn("DROP COLUMN IF EXISTS is_reserved", migration)
        self.assertIn("DROP COLUMN IF EXISTS pay_datetime", migration)
        self.assertIn("DROP COLUMN IF EXISTS total_price", migration)
        self.assertIn("DROP COLUMN IF EXISTS pay_method", migration)
        self.assertIn("DROP COLUMN IF EXISTS pay_num", migration)
        self.assertIn("DROP COLUMN IF EXISTS pay_status", migration)
        self.assertIn("p.payment_status = 'paid'", migration)
        self.assertIn("o.order_status = 'cancelled'", migration)
        self.assertIn("release_reservation_seats_for_expired_order", ddl)
        self.assertIn("NEW.order_status = 'expired'", ddl)
        self.assertIn("o.order_status = 'expired'", migration)
        self.assertIn("使われていないと判断した理由", migration)
        self.assertIn("timezone=Asia/Tokyo", db_py)
    def test_schema_uses_screen_showing_order_detail_and_payment_tables(self):
        ddl = (ROOT_DIR / "DDL.txt").read_text(encoding="utf-8")
        migration = (ROOT_DIR / "backend" / "database" / "add_reservations.sql").read_text(encoding="utf-8")
        compose = (ROOT_DIR / "docker-compose.yml").read_text(encoding="utf-8")

        self.assertIn("CREATE TABLE screens", ddl)
        self.assertIn("CREATE TABLE showings", ddl)
        self.assertIn("CREATE TABLE orders", ddl)
        self.assertIn("order_status", ddl)
        self.assertIn("CREATE TABLE reservation_seats", ddl)
        self.assertIn("showing_id", ddl)
        self.assertIn("seat_id", ddl)
        self.assertIn("price_at_purchase", ddl)
        self.assertIn("REFERENCES showings(id)", ddl)
        self.assertIn("REFERENCES seats(id)", ddl)
        self.assertIn("REFERENCES movies(id)", ddl)
        self.assertIn("movie_title_at_purchase", ddl)
        self.assertNotIn("CONSTRAINT fk_reservation_seats_movie", ddl)
        self.assertNotIn("idx_reservation_seats_movie_id", ddl)
        self.assertIn("REFERENCES ticket_types(id)", ddl)
        self.assertIn("idx_reservation_seats_seat_id", ddl)
        self.assertIn("idx_reservation_seats_ticket_type_id", ddl)
        self.assertIn("CREATE TABLE food_order_details", ddl)
        self.assertIn("REFERENCES foods(id)", ddl)
        self.assertIn("idx_food_order_details_food_id", ddl)
        self.assertIn("fk_reservation_seats_showing", migration)
        self.assertIn("fk_reservation_seats_seat", migration)
        self.assertIn("movie_title_at_purchase", migration)
        self.assertIn("ALTER COLUMN id TYPE VARCHAR(100)", migration)
        self.assertIn("ALTER COLUMN movie_id TYPE VARCHAR(100)", migration)
        self.assertIn("DROP CONSTRAINT IF EXISTS fk_reservation_seats_movie", migration)
        self.assertNotIn("ADD CONSTRAINT fk_reservation_seats_movie", migration)
        self.assertIn("fk_reservation_seats_ticket_type", migration)
        self.assertIn("fk_food_order_details_food", migration)
        self.assertIn("uq_theaters_name", migration)
        self.assertIn("CREATE TABLE payments", ddl)
        self.assertIn("payment_status", ddl)
        self.assertIn("uq_reservation_seats_showing_seat_active", ddl)
        self.assertIn("WHERE released_at IS NULL", ddl)
        self.assertIn("postgres:16-alpine", compose)
        self.assertNotIn("CREATE TABLE screenings", ddl)
        self.assertNotIn("CREATE TABLE order_details", ddl)
        self.assertNotIn("CREATE TABLE reservations", ddl)


if __name__ == "__main__":
    unittest.main()
