from datetime import date, datetime, timedelta, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS
from database.db import db_conn
from psycopg import errors
from werkzeug.security import generate_password_hash, check_password_hash


app = Flask(__name__)
CORS(app)
DEFAULT_THEATER_NAME = "HAL CINEMA 名古屋栄"

@app.get("/health")
def health():
    """
    サーバーが起動しているか確認するAPI。
    """
    return jsonify({"status": "ok"})


@app.get("/health/db")
def health_db():
    """
    DBに接続できるか確認するAPI。
    """
    try:
        with db_conn() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                row = cursor.fetchone()

        return jsonify({"status": "ok", "db": row[0]})

    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.get("/api/movies")
def get_movies():
    """
    moviesテーブルの一覧を返すAPI。
    """
    try:
        with db_conn() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, title, genre, duration_minutes, age_rating, release_date
                    FROM movies
                    ORDER BY id;
                    """
                )
                rows = cursor.fetchall()

        return jsonify(
            [
                {
                    "id": row[0],
                    "title": row[1],
                    "genre": row[2],
                    "duration_minutes": row[3],
                    "age_rating": row[4],
                    "release_date": row[5].isoformat() if row[5] else None,
                }
                for row in rows
            ]
        )

    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


def normalize_seat_ids(value):
    """
    API入力のseat_idsを、空白を除いた文字列配列に正規化する。
    """
    if not isinstance(value, list):
        return []

    normalized = []
    for seat_id in value:
        seat_label = str(seat_id or "").strip()
        if seat_label:
            normalized.append(seat_label)

    return normalized


def to_non_negative_int(value, default=0):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default

    return max(0, number)


def normalize_ticket_types(value, fallback_ticket_count=0, fallback_ticket_total_price=0):
    """
    API入力のticket_typesを、券種ごとの枚数配列に正規化する。
    """
    if not isinstance(value, list):
        fallback_quantity = to_non_negative_int(fallback_ticket_count)
        if fallback_quantity <= 0:
            return []

        total_price = to_non_negative_int(fallback_ticket_total_price)
        unit_price = total_price // fallback_quantity if total_price else 0
        return [
            {
                "ticket_type_id": "general",
                "label": "一般",
                "unit_price": unit_price,
                "quantity": fallback_quantity,
            }
        ]

    normalized = []
    for ticket_type in value:
        if not isinstance(ticket_type, dict):
            continue

        ticket_type_id = str(
            ticket_type.get("ticket_type_id") or ticket_type.get("ticketTypeId") or ticket_type.get("id") or ""
        ).strip()
        label = str(ticket_type.get("label") or ticket_type_id).strip()
        unit_price = to_non_negative_int(ticket_type.get("unit_price") or ticket_type.get("unitPrice"))
        quantity = to_non_negative_int(ticket_type.get("quantity"))

        if ticket_type_id and label and quantity > 0:
            normalized.append(
                {
                    "ticket_type_id": ticket_type_id,
                    "label": label,
                    "unit_price": unit_price,
                    "quantity": quantity,
                }
            )

    return normalized


def normalize_food_items(value):
    """
    API入力のfood_itemsを、注文に保存できる明細へ正規化する。
    """
    if not isinstance(value, list):
        return []

    normalized = []
    for item in value:
        if not isinstance(item, dict):
            continue

        food_id = str(item.get("food_id") or item.get("foodId") or item.get("id") or "").strip()
        name = str(item.get("name") or food_id).strip()
        unit_price = to_non_negative_int(item.get("unit_price") or item.get("unitPrice") or item.get("price"))
        quantity = to_non_negative_int(item.get("quantity"))
        subtotal = to_non_negative_int(item.get("subtotal") or item.get("lineTotal") or unit_price * quantity)

        if food_id and name and quantity > 0:
            normalized.append(
                {
                    "food_id": food_id,
                    "name": name,
                    "unit_price": unit_price,
                    "quantity": quantity,
                    "subtotal": subtotal,
                }
            )

    return normalized


def sum_ticket_quantities(ticket_types):
    return sum(ticket_type["quantity"] for ticket_type in ticket_types)


def sum_ticket_prices(ticket_types):
    return sum(ticket_type["unit_price"] * ticket_type["quantity"] for ticket_type in ticket_types)


def sum_food_prices(food_items):
    return sum(item["subtotal"] for item in food_items)


def expand_ticket_types_for_seats(ticket_types):
    expanded = []
    for ticket_type in ticket_types:
        for _ in range(ticket_type["quantity"]):
            expanded.append(ticket_type)
    return expanded


def create_order_num():
    now = datetime.now(timezone.utc)
    return f"ORD-{now.strftime('%y%m%d-%H%M%S%f')}"


def derive_screen_id(screen_name):
    normalized_name = str(screen_name or "").strip()
    digits = "".join(char for char in normalized_name if char.isdigit())

    if digits:
        return f"screen-{digits}"

    return "screen-unknown"


def normalize_show_date(value):
    normalized = str(value or "").strip()
    if normalized:
        return normalized

    return date.today().isoformat()


def add_minutes_to_time(start_time, duration_minutes):
    normalized_time = str(start_time or "00:00").strip() or "00:00"
    minutes = to_non_negative_int(duration_minutes, 120) or 120

    try:
        start = datetime.strptime(normalized_time, "%H:%M")
    except ValueError:
        return "00:00"

    return (start + timedelta(minutes=minutes)).strftime("%H:%M")


def split_seat_label(seat_id):
    normalized = str(seat_id or "").strip()
    if "-" in normalized:
        row_name, seat_number_text = normalized.split("-", 1)
    else:
        row_name = normalized[:1] or "A"
        seat_number_text = normalized[1:] or "0"

    return row_name, to_non_negative_int(seat_number_text, 0)


def ensure_purchase_masters(
    cursor,
    *,
    movie_id,
    movie_title,
    movie_duration_minutes,
    theater_name,
    screen_id,
    screen_name,
    screen_capacity,
    showing_id,
    show_date,
    start_time,
    end_time,
    seat_ids,
    ticket_types,
    food_items,
):
    """
    暫定処理。静的フロントとDBマスタの移行期間だけ、存在しない最小マスタを補う。
    既存マスタはフロント値で上書きしない。本来はseedか管理者画面から登録する。
    """
    cursor.execute(
        """
        INSERT INTO movies (id, title, duration_minutes)
        VALUES (%s, %s, %s)
        ON CONFLICT (id) DO NOTHING;
        """,
        (movie_id, movie_title, movie_duration_minutes),
    )

    cursor.execute(
        """
        SELECT id
        FROM theaters
        WHERE theater_name = %s;
        """,
        (theater_name,),
    )
    theater_row = cursor.fetchone()

    if theater_row:
        theater_id = theater_row[0]
    else:
        cursor.execute(
            """
            INSERT INTO theaters (theater_name)
            VALUES (%s)
            RETURNING id;
            """,
            (theater_name,),
        )
        theater_id = cursor.fetchone()[0]

    cursor.execute(
        """
        INSERT INTO screens (id, theater_id, name, seat_count)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING;
        """,
        (screen_id, theater_id, screen_name, screen_capacity),
    )

    cursor.execute(
        """
        INSERT INTO showings (id, movie_id, screen_id, show_date, start_time, end_time)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING;
        """,
        (showing_id, movie_id, screen_id, show_date, start_time, end_time),
    )

    for seat_id in seat_ids:
        row_name, seat_number = split_seat_label(seat_id)
        cursor.execute(
            """
            INSERT INTO seats (id, screen_id, row_name, seat_number, seat_label)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING;
            """,
            (seat_id, screen_id, row_name, seat_number, seat_id),
        )

    for ticket_type in ticket_types:
        cursor.execute(
            """
            INSERT INTO ticket_types (id, label, current_price)
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO NOTHING;
            """,
            (ticket_type["ticket_type_id"], ticket_type["label"], ticket_type["unit_price"]),
        )

    for food_item in food_items:
        cursor.execute(
            """
            INSERT INTO foods (id, name, current_price)
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO NOTHING;
            """,
            (food_item["food_id"], food_item["name"], food_item["unit_price"]),
        )

def format_time_value(value):
    if hasattr(value, "strftime"):
        return value.strftime("%H:%M")

    normalized = str(value or "00:00").strip() or "00:00"
    return normalized[:5]


def unique_values(values):
    seen = set()
    unique = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        unique.append(value)
    return unique


def load_purchase_master_snapshot(cursor, *, showing_id, requested_movie_id, seat_ids, ticket_types, food_items):
    cursor.execute(
        """
        SELECT sh.movie_id, m.title, sh.screen_id, sc.name, sh.start_time
        FROM showings sh
        JOIN movies m
          ON m.id = sh.movie_id
        JOIN screens sc
          ON sc.id = sh.screen_id
        WHERE sh.id = %s;
        """,
        (showing_id,),
    )
    showing_row = cursor.fetchone()

    if not showing_row:
        return None, "上映回が見つかりません。"

    showing_movie_id, movie_title, showing_screen_id, screen_name, showing_time = showing_row
    if requested_movie_id and requested_movie_id != showing_movie_id:
        return None, "上映回と映画が一致していません。"

    cursor.execute(
        """
        SELECT id, screen_id
        FROM seats
        WHERE id = ANY(%s);
        """,
        (seat_ids,),
    )
    seat_screen_by_id = {seat_id: screen_id for seat_id, screen_id in cursor.fetchall()}
    missing_seats = [seat_id for seat_id in seat_ids if seat_id not in seat_screen_by_id]
    if missing_seats:
        return None, "選択した座席が見つかりません。"

    invalid_screen_seats = [
        seat_id
        for seat_id in seat_ids
        if seat_screen_by_id[seat_id] != showing_screen_id
    ]
    if invalid_screen_seats:
        return None, "選択した座席はこの上映回のスクリーンに存在しません。"

    ticket_type_ids = unique_values(ticket_type["ticket_type_id"] for ticket_type in ticket_types)
    cursor.execute(
        """
        SELECT id, label, current_price
        FROM ticket_types
        WHERE id = ANY(%s);
        """,
        (ticket_type_ids,),
    )
    ticket_type_by_id = {
        ticket_type_id: {"label": label, "unit_price": current_price}
        for ticket_type_id, label, current_price in cursor.fetchall()
    }
    missing_ticket_types = [ticket_type_id for ticket_type_id in ticket_type_ids if ticket_type_id not in ticket_type_by_id]
    if missing_ticket_types:
        return None, "券種が見つかりません。"

    priced_ticket_types = [
        {
            "ticket_type_id": ticket_type["ticket_type_id"],
            "label": ticket_type_by_id[ticket_type["ticket_type_id"]]["label"],
            "unit_price": ticket_type_by_id[ticket_type["ticket_type_id"]]["unit_price"],
            "quantity": ticket_type["quantity"],
        }
        for ticket_type in ticket_types
    ]

    food_ids = unique_values(item["food_id"] for item in food_items)
    food_by_id = {}
    if food_ids:
        cursor.execute(
            """
            SELECT id, name, current_price
            FROM foods
            WHERE id = ANY(%s);
            """,
            (food_ids,),
        )
        food_by_id = {
            food_id: {"name": name, "unit_price": current_price}
            for food_id, name, current_price in cursor.fetchall()
        }
        missing_foods = [food_id for food_id in food_ids if food_id not in food_by_id]
        if missing_foods:
            return None, "フード商品が見つかりません。"

    priced_food_items = [
        {
            "food_id": item["food_id"],
            "name": food_by_id[item["food_id"]]["name"],
            "unit_price": food_by_id[item["food_id"]]["unit_price"],
            "quantity": item["quantity"],
            "subtotal": food_by_id[item["food_id"]]["unit_price"] * item["quantity"],
        }
        for item in food_items
    ]

    return (
        {
            "movie_id": showing_movie_id,
            "movie_title_at_purchase": movie_title or showing_movie_id,
            "screen_id": showing_screen_id,
            "screen_name": screen_name or showing_screen_id,
            "showing_time": format_time_value(showing_time),
            "ticket_types": priced_ticket_types,
            "food_items": priced_food_items,
        },
        None,
    )

def find_user_id_by_email(cursor, email):
    """
    既存ログインを壊さないため、emailがある時だけusers.idを紐付ける。
    """
    if not email:
        return None

    cursor.execute("SELECT id FROM users WHERE email = %s;", (email,))
    row = cursor.fetchone()
    return row[0] if row else None


def append_ticket_type(ticket_types, row):
    ticket_type_id = row["ticket_type_id"]
    label = row["ticket_type_label"]
    unit_price = row["price_at_purchase"]
    key = (ticket_type_id, label, unit_price)

    if key not in ticket_types:
        ticket_types[key] = {
            "ticket_type_id": ticket_type_id,
            "label": label,
            "unit_price": unit_price,
            "quantity": 0,
        }

    ticket_types[key]["quantity"] += 1


@app.get("/api/screenings/<screening_id>/reserved-seats")
def get_reserved_seats(screening_id):
    """
    上映回ごとの予約済み座席を返すAPI。
    URL名は既存フロントに合わせ、DB上はshowing_idとして扱う。
    """
    normalized_screening_id = str(screening_id or "").strip()

    if not normalized_screening_id:
        return jsonify({"status": "error", "message": "screening_id is required"}), 400

    try:
        with db_conn() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT rs.seat_id
                    FROM reservation_seats rs
                    JOIN orders o
                      ON o.id = rs.order_id
                    WHERE rs.showing_id = %s
                      AND rs.released_at IS NULL
                      AND o.order_status IN ('pending', 'paid')
                    ORDER BY rs.seat_id;
                    """,
                    (normalized_screening_id,),
                )
                rows = cursor.fetchall()

        return jsonify(
            {
                "status": "ok",
                "screening_id": normalized_screening_id,
                "reserved_seats": [row[0] for row in rows],
            }
        )

    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.get("/api/reservations")
def get_reservations():
    """
    ログインユーザーの予約・購入履歴を返すAPI。
    レスポンス名は既存フロントに合わせ、DB上はordersを中心に読む。
    """
    user_email = str(request.args.get("user_email", "")).strip().lower()

    if not user_email:
        return jsonify({"status": "error", "message": "user_email is required"}), 400

    try:
        with db_conn() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, user_email, total_amount, order_status, created_at
                    FROM orders
                    WHERE user_email = %s
                    ORDER BY created_at DESC, id DESC;
                    """,
                    (user_email,),
                )
                order_rows = cursor.fetchall()
                order_ids = [row[0] for row in order_rows]
                seats_by_order = {order_id: [] for order_id in order_ids}
                foods_by_order = {order_id: [] for order_id in order_ids}
                payments_by_order = {order_id: "unpaid" for order_id in order_ids}

                if order_ids:
                    cursor.execute(
                        """
                        SELECT
                            rs.order_id,
                            sh.movie_id,
                            rs.movie_title_at_purchase,
                            rs.showing_id,
                            rs.screen_name,
                            rs.showing_time,
                            rs.seat_id,
                            rs.ticket_type_id,
                            rs.ticket_type_label,
                            rs.price_at_purchase
                        FROM reservation_seats rs
                        JOIN showings sh
                          ON sh.id = rs.showing_id
                        WHERE rs.order_id = ANY(%s)
                        ORDER BY rs.order_id, rs.id;
                        """,
                        (order_ids,),
                    )
                    for row in cursor.fetchall():
                        seats_by_order.setdefault(row[0], []).append(
                            {
                                "movie_id": row[1],
                                "movie_title_at_purchase": row[2],
                                "showing_id": row[3],
                                "screen_name": row[4],
                                "showing_time": row[5],
                                "seat_id": row[6],
                                "ticket_type_id": row[7],
                                "ticket_type_label": row[8],
                                "price_at_purchase": row[9],
                            }
                        )

                    cursor.execute(
                        """
                        SELECT order_id, food_id, name, quantity, unit_price, subtotal
                        FROM food_order_details
                        WHERE order_id = ANY(%s)
                        ORDER BY order_id, id;
                        """,
                        (order_ids,),
                    )
                    for order_id, food_id, name, quantity, unit_price, subtotal in cursor.fetchall():
                        foods_by_order.setdefault(order_id, []).append(
                            {
                                "food_id": food_id,
                                "name": name,
                                "quantity": quantity,
                                "unit_price": unit_price,
                                "subtotal": subtotal,
                            }
                        )

                    cursor.execute(
                        """
                        SELECT order_id, payment_method, payment_amount, payment_status, paid_at
                        FROM payments
                        WHERE order_id = ANY(%s)
                        ORDER BY order_id, id;
                        """,
                        (order_ids,),
                    )
                    for order_id, _method, _amount, payment_status, _paid_at in cursor.fetchall():
                        payments_by_order[order_id] = payment_status

        reservations = []
        for row in order_rows:
            order_id = row[0]
            seat_rows = seats_by_order.get(order_id, [])
            food_items = foods_by_order.get(order_id, [])
            if not seat_rows and not food_items:
                continue
            ticket_types = {}

            for seat_row in seat_rows:
                append_ticket_type(ticket_types, seat_row)

            first_seat = seat_rows[0] if seat_rows else {}
            reservations.append(
                {
                    "id": order_id,
                    "user_email": row[1],
                    "movie_id": first_seat.get("movie_id"),
                    "screening_id": first_seat.get("showing_id"),
                    "screen_name": first_seat.get("screen_name"),
                    "screening_time": first_seat.get("showing_time"),
                    "ticket_count": len(seat_rows),
                    "ticket_total_price": sum(item["price_at_purchase"] for item in seat_rows),
                    "food_total_price": sum(item["subtotal"] for item in food_items),
                    "total_price": row[2],
                    "reservation_status": row[3],
                    "payment_status": payments_by_order.get(order_id, "unpaid"),
                    "created_at": row[4].isoformat() if row[4] else None,
                    "seats": [item["seat_id"] for item in seat_rows],
                    "ticket_types": list(ticket_types.values()),
                    "food_items": food_items,
                }
            )

        return jsonify({"status": "ok", "reservations": reservations})

    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.patch("/api/reservations/<int:reservation_id>/cancel")
def cancel_reservation(reservation_id):
    """
    注文をキャンセルし、確保していた座席を再予約可能にするAPI。
    """
    payload = request.get_json(silent=True) or {}
    user_email = str(payload.get("user_email", "")).strip().lower()

    if not user_email:
        return jsonify({"status": "error", "message": "user_email is required"}), 400

    try:
        with db_conn() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, order_status
                    FROM orders
                    WHERE id = %s
                      AND user_email = %s;
                    """,
                    (reservation_id, user_email),
                )
                order_row = cursor.fetchone()

                if not order_row:
                    return jsonify({"status": "error", "message": "reservation not found"}), 404

                cursor.execute(
                    """
                    UPDATE orders
                    SET order_status = 'cancelled',
                        cancelled_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id, order_status, cancelled_at;
                    """,
                    (reservation_id,),
                )
                updated_row = cursor.fetchone()

                cursor.execute(
                    """
                    UPDATE payments
                    SET payment_status = 'refunded',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE order_id = %s
                      AND payment_status = 'paid'
                    RETURNING payment_status;
                    """,
                    (reservation_id,),
                )
                refunded_payment_rows = cursor.fetchall()
                payment_status = refunded_payment_rows[-1][0] if refunded_payment_rows else None

                cursor.execute(
                    """
                    UPDATE reservation_seats
                    SET released_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE order_id = %s
                      AND released_at IS NULL
                    RETURNING showing_id, seat_id;
                    """,
                    (reservation_id,),
                )
                released_seats = [row[1] for row in cursor.fetchall()]

        return jsonify(
            {
                "status": "ok",
                "reservation_id": updated_row[0],
                "reservation_status": updated_row[1],
                "payment_status": payment_status,
                "cancelled_at": updated_row[2].isoformat() if updated_row[2] else None,
                "released_seats": released_seats,
            }
        )

    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.post("/api/reservations")
def create_reservation():
    """
    座席予約を確定するAPI。
    既存フロントの入力をorders、reservation_seats、food_order_details、paymentsへ分けて保存する。
    """
    payload = request.get_json(silent=True) or {}
    showing_id = str(payload.get("screening_id", "")).strip()
    movie_id = str(payload.get("movie_id", "")).strip()
    seat_ids = normalize_seat_ids(payload.get("seat_ids"))
    user_email = str(payload.get("user_email", "")).strip().lower() or None
    movie_title = str(payload.get("movie_title") or payload.get("movieTitle") or movie_id).strip()
    movie_duration_minutes = to_non_negative_int(
        payload.get("movie_duration_minutes") or payload.get("movieDurationMinutes"),
        120,
    ) or 120
    screen_name = str(payload.get("screen_name", "")).strip() or None
    screen_id = str(payload.get("screen_id") or payload.get("screenId") or derive_screen_id(screen_name)).strip()
    screen_name = screen_name or screen_id
    screen_capacity = to_non_negative_int(payload.get("screen_capacity") or payload.get("screenCapacity"), len(seat_ids))
    screen_capacity = max(screen_capacity, len(seat_ids), 1)
    theater_name = str(payload.get("theater_name") or payload.get("theaterName") or DEFAULT_THEATER_NAME).strip()
    show_date = normalize_show_date(payload.get("screening_date") or payload.get("show_date") or payload.get("dateId"))
    showing_time = str(payload.get("screening_time", "")).strip() or "00:00"
    showing_end_time = str(payload.get("end_time") or payload.get("endTime") or "").strip() or add_minutes_to_time(showing_time, movie_duration_minutes)
    payment_method = str(payload.get("payment_method", "")).strip() or "unknown"
    requested_ticket_count = to_non_negative_int(payload.get("ticket_count") or len(seat_ids))
    requested_ticket_total_price = to_non_negative_int(payload.get("ticket_total_price") or 0)
    ticket_types = normalize_ticket_types(
        payload.get("ticket_types"),
        requested_ticket_count,
        requested_ticket_total_price,
    )
    food_items = normalize_food_items(payload.get("food_items"))
    ticket_count = sum_ticket_quantities(ticket_types)
    ticket_total_price = requested_ticket_total_price or sum_ticket_prices(ticket_types)
    food_total_price = to_non_negative_int(payload.get("food_total_price") or sum_food_prices(food_items))
    total_price = to_non_negative_int(payload.get("total_price") or ticket_total_price + food_total_price)

    if not showing_id or not movie_id or not seat_ids:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "movie_id, screening_id, seat_ids are required",
                }
            ),
            400,
        )

    if len(seat_ids) != ticket_count:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "選択した座席数と券種の合計枚数が一致していません。",
                }
            ),
            400,
        )

    try:
        with db_conn() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT rs.seat_id
                    FROM reservation_seats rs
                    JOIN orders o
                      ON o.id = rs.order_id
                    WHERE rs.showing_id = %s
                      AND rs.seat_id = ANY(%s)
                      AND rs.released_at IS NULL
                      AND o.order_status IN ('pending', 'paid');
                    """,
                    (showing_id, seat_ids),
                )
                conflict_rows = cursor.fetchall()
                conflict_seats = [row[0] for row in conflict_rows]

                if conflict_seats:
                    return (
                        jsonify(
                            {
                                "status": "error",
                                "message": "選択した座席はすでに予約されています。",
                                "conflict_seats": conflict_seats,
                            }
                        ),
                        409,
                    )

                master_snapshot, validation_message = load_purchase_master_snapshot(
                    cursor,
                    showing_id=showing_id,
                    requested_movie_id=movie_id,
                    seat_ids=seat_ids,
                    ticket_types=ticket_types,
                    food_items=food_items,
                )

                temporary_seed_messages = {
                    "上映回が見つかりません。",
                    "選択した座席が見つかりません。",
                    "券種が見つかりません。",
                    "フード商品が見つかりません。",
                }
                if validation_message in temporary_seed_messages:
                    ensure_purchase_masters(
                        cursor,
                        movie_id=movie_id,
                        movie_title=movie_title,
                        movie_duration_minutes=movie_duration_minutes,
                        theater_name=theater_name,
                        screen_id=screen_id,
                        screen_name=screen_name,
                        screen_capacity=screen_capacity,
                        showing_id=showing_id,
                        show_date=show_date,
                        start_time=showing_time,
                        end_time=showing_end_time,
                        seat_ids=seat_ids,
                        ticket_types=ticket_types,
                        food_items=food_items,
                    )
                    master_snapshot, validation_message = load_purchase_master_snapshot(
                        cursor,
                        showing_id=showing_id,
                        requested_movie_id=movie_id,
                        seat_ids=seat_ids,
                        ticket_types=ticket_types,
                        food_items=food_items,
                    )

                if validation_message:
                    return jsonify({"status": "error", "message": validation_message}), 400

                movie_id = master_snapshot["movie_id"]
                movie_title_at_purchase = master_snapshot["movie_title_at_purchase"]
                screen_name = master_snapshot["screen_name"]
                showing_time = master_snapshot["showing_time"]
                ticket_types = master_snapshot["ticket_types"]
                food_items = master_snapshot["food_items"]
                ticket_total_price = sum_ticket_prices(ticket_types)
                food_total_price = sum_food_prices(food_items)
                total_price = ticket_total_price + food_total_price

                user_id = find_user_id_by_email(cursor, user_email)
                cursor.execute(
                    """
                    INSERT INTO orders (
                        user_id,
                        user_email,
                        order_num,
                        total_amount,
                        order_status
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, created_at;
                    """,
                    (user_id, user_email, create_order_num(), total_price, "paid"),
                )
                order_row = cursor.fetchone()
                order_id = order_row[0]
                created_at = order_row[1]

                expanded_ticket_types = expand_ticket_types_for_seats(ticket_types)
                for seat_id, ticket_type in zip(seat_ids, expanded_ticket_types):
                    cursor.execute(
                        """
                        INSERT INTO reservation_seats (
                            order_id,
                            showing_id,
                            seat_id,
                            movie_title_at_purchase,
                            screen_name,
                            showing_time,
                            ticket_type_id,
                            ticket_type_label,
                            price_at_purchase
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                        """,
                        (
                            order_id,
                            showing_id,
                            seat_id,
                            movie_title_at_purchase,
                            screen_name,
                            showing_time,
                            ticket_type["ticket_type_id"],
                            ticket_type["label"],
                            ticket_type["unit_price"],
                        ),
                    )

                for food_item in food_items:
                    cursor.execute(
                        """
                        INSERT INTO food_order_details (
                            order_id,
                            food_id,
                            name,
                            quantity,
                            unit_price,
                            subtotal
                        )
                        VALUES (%s, %s, %s, %s, %s, %s);
                        """,
                        (
                            order_id,
                            food_item["food_id"],
                            food_item["name"],
                            food_item["quantity"],
                            food_item["unit_price"],
                            food_item["subtotal"],
                        ),
                    )

                cursor.execute(
                    """
                    INSERT INTO payments (
                        order_id,
                        payment_method,
                        payment_amount,
                        payment_status,
                        paid_at
                    )
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP);
                    """,
                    (order_id, payment_method, total_price, "paid"),
                )

        return (
            jsonify(
                {
                    "status": "ok",
                    "reservation_id": order_id,
                    "screening_id": showing_id,
                    "reserved_seats": seat_ids,
                    "ticket_types": ticket_types,
                    "created_at": created_at.isoformat() if created_at else None,
                }
            ),
            201,
        )

    except errors.UniqueViolation:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "選択した座席はすでに予約されています。",
                    "conflict_seats": seat_ids,
                }
            ),
            409,
        )
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.post("/api/register")
def register():
    """
    ユーザー新規登録API。
    """
    payload = request.get_json(silent=True) or request.form.to_dict() or {}

    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", "")).strip()

    if not name or not email or not password:
        return (
            jsonify({"status": "error", "message": "名前とメールアドレスとパスワードは必須です"}),
            400,
        )

    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM users WHERE email = %s;", (email,))
                if cur.fetchone():
                    return (
                        jsonify({"status": "error", "message": "このメールアドレスは既に登録されています"}),
                        409,
                    )

                hashed_password = generate_password_hash(password)
                cur.execute(
                    """
                    INSERT INTO users (name, email, password)
                    VALUES (%s, %s, %s)
                    RETURNING id, name, email, created_at
                    """,
                    (name, email, hashed_password),
                )
                user_row = cur.fetchone()
        return (
            jsonify(
                {
                    "status": "ok",
                    "user": {
                        "id": user_row[0],
                        "name": user_row[1],
                        "email": user_row[2],
                        "created_at": user_row[3].isoformat() if user_row[3] else None,
                    },
                }
            ),
            201,
        )

    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.post("/api/login")
def login():
    """
    ログインAPI。
    """
    payload = request.get_json(silent=True) or request.form.to_dict() or {}

    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email or not password:
        return (
            jsonify({"status": "error", "message": "メールアドレスとパスワードは必須です"}),
            400,
        )
    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, name, email, password, created_at
                    FROM users
                    WHERE email = %s;
                    """,
                    (email,),
                )
                row = cur.fetchone()

        if not row:
            return (
                jsonify({"status": "error", "message": "メールアドレスまたはパスワードが違います"}),
                401,
            )

        stored_password_hash = row[3]
        if not check_password_hash(stored_password_hash, password):
            return (
                jsonify({"status": "error", "message": "メールアドレスまたはパスワードが違います"}),
                401,
            )

        return jsonify(
            {
                "status": "ok",
                "user": {
                    "id": row[0],
                    "name": row[1],
                    "email": row[2],
                    "created_at": row[4].isoformat() if row[4] else None,
                },
            }
        ), 200

    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)