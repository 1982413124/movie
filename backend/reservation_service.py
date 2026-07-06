import json
from datetime import date, datetime, time
from typing import Iterable


SCREENING_SLOTS = {
    "scr-1820": {"start_time": time(18, 20), "end_time": time(21, 0), "screen_name": "スクリーン 3"},
    "scr-2050": {"start_time": time(20, 50), "end_time": time(23, 10), "screen_name": "スクリーン 1"},
    "scr-2315": {"start_time": time(23, 15), "end_time": time(23, 59), "screen_name": "スクリーン 5"},
}


def parse_screening_date(value: object) -> date:
    if isinstance(value, date):
        return value

    text = str(value or "").strip()
    if not text:
        return date.today()

    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return date.today()


def normalize_seat_label(seat_label: object) -> str:
    value = str(seat_label or "").strip().upper()
    if not value:
        return ""

    if "-" in value:
        row, column = value.split("-", 1)
        if row and column.isdigit():
            return f"{row}-{int(column)}"
        return value

    match = __import__("re").match(r"^([A-Z]+)(\d+)$", value)
    if match:
        return f"{match.group(1)}-{int(match.group(2))}"

    return value


def normalize_seat_ids(seat_ids: Iterable[object]) -> list[str]:
    normalized: list[str] = []
    for seat_id in seat_ids or []:
        if seat_id is None:
            continue
        normalized_label = normalize_seat_label(seat_id)
        if normalized_label:
            normalized.append(normalized_label)
    return normalized


def find_conflicting_seats(reserved_seat_labels: Iterable[object], selected_seat_ids: Iterable[object]) -> list[str]:
    reserved_labels = {normalize_seat_label(seat_label) for seat_label in reserved_seat_labels or [] if normalize_seat_label(seat_label)}
    selected_labels = normalize_seat_ids(selected_seat_ids)
    return [seat_label for seat_label in selected_labels if seat_label in reserved_labels]


def ensure_schema(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS food_items JSONB")


def ensure_screening(conn, screening_key: str, screening_date: date) -> int:
    slot = SCREENING_SLOTS.get(screening_key) or next(iter(SCREENING_SLOTS.values()))

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id FROM screenings
            WHERE screen_name = %s AND screening_date = %s AND start_time = %s
            """,
            (slot["screen_name"], screening_date, slot["start_time"]),
        )
        existing = cur.fetchone()
        if existing:
            return existing[0]

        cur.execute("SELECT id FROM movies ORDER BY id LIMIT 1")
        movie_row = cur.fetchone()
        if movie_row:
            movie_id = movie_row[0]
        else:
            cur.execute(
                "INSERT INTO movies (title, genre, duration_minutes, age_rating) VALUES (%s, %s, %s, %s) RETURNING id",
                ("Demo Movie", "Drama", 120, "G"),
            )
            movie_id = cur.fetchone()[0]

        cur.execute("SELECT id FROM theaters ORDER BY id LIMIT 1")
        theater_row = cur.fetchone()
        if theater_row:
            theater_id = theater_row[0]
        else:
            cur.execute("INSERT INTO theaters (theater_name) VALUES (%s) RETURNING id", ("Demo Theater",))
            theater_id = cur.fetchone()[0]

        cur.execute(
            """
            INSERT INTO screenings (
                movie_id, theater_id, screening_date, start_time, end_time, screen_name, total_seats, remaining_seats
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """,
            (
                movie_id,
                theater_id,
                screening_date,
                slot["start_time"],
                slot["end_time"],
                slot["screen_name"],
                49,
                49,
            ),
        )
        return cur.fetchone()[0]


def ensure_seat_rows(conn, screening_id: int) -> None:
    rows = ["A", "B", "C", "D", "E", "F", "G", "H"]
    columns = [1, 2, 3, 4, 5, 6, 7]

    with conn.cursor() as cur:
        for row in rows:
            for column in columns:
                seat_label = f"{row}-{column}"
                cur.execute(
                    "SELECT id FROM seats WHERE screening_id = %s AND seat_label = %s",
                    (screening_id, seat_label),
                )
                if cur.fetchone():
                    continue

                cur.execute(
                    """
                    INSERT INTO seats (screening_id, row_name, col_num, seat_label, is_reserved)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (screening_id, row, column, seat_label, False),
                )


def fetch_seat_rows(conn, screening_id: int) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT seat_label, is_reserved FROM seats WHERE screening_id = %s ORDER BY row_name, col_num",
            (screening_id,),
        )
        rows = cur.fetchall()

    seat_rows: list[dict] = []
    current_row = None
    for seat_label, is_reserved in rows:
        row_name, column_text = seat_label.split("-", 1)
        if current_row is None or current_row["row"] != row_name:
            current_row = {"row": row_name, "seats": []}
            seat_rows.append(current_row)
        current_row["seats"].append(
            {
                "id": seat_label,
                "row": row_name,
                "column": int(column_text),
                "status": "reserved" if is_reserved else "available",
            }
        )

    return seat_rows


def fetch_user_orders(conn, user_email: str) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                o.id,
                o.pay_datetime,
                o.total_price,
                o.food_items,
                m.title,
                m.poster_image,
                s.screening_date,
                s.start_time,
                s.end_time,
                s.screen_name,
                array_agg(od.seat_num ORDER BY od.seat_num) AS seat_nums,
                count(od.id) AS ticket_count,
                p.pay_status
            FROM orders o
            JOIN users u ON u.id = o.user_id
            JOIN order_details od ON od.order_id = o.id
            JOIN screenings s ON s.id = od.screening_id
            JOIN movies m ON m.id = s.movie_id
            LEFT JOIN payments p ON p.order_id = o.id
            WHERE u.email = %s
            GROUP BY o.id, o.pay_datetime, o.total_price, o.food_items, m.title, m.poster_image,
                     s.screening_date, s.start_time, s.end_time, s.screen_name, p.pay_status
            ORDER BY o.pay_datetime DESC NULLS LAST, o.id DESC
            """,
            (user_email.strip().lower(),),
        )
        rows = cur.fetchall()

    orders: list[dict] = []
    for row in rows:
        (
            order_id,
            pay_datetime,
            total_price,
            food_items,
            movie_title,
            poster_image,
            screening_date,
            start_time,
            end_time,
            screen_name,
            seat_nums,
            ticket_count,
            pay_status,
        ) = row

        if isinstance(food_items, str):
            try:
                food_items = json.loads(food_items)
            except (TypeError, ValueError):
                food_items = []

        orders.append(
            {
                "id": str(order_id),
                "purchasedAt": pay_datetime.isoformat() if pay_datetime else None,
                "movieTitle": movie_title,
                "posterUrl": poster_image or "",
                "screeningDate": screening_date.isoformat() if screening_date else None,
                "startTime": start_time.isoformat() if start_time else None,
                "endTime": end_time.isoformat() if end_time else None,
                "screen": screen_name,
                "seats": seat_nums or [],
                "ticketCount": ticket_count,
                "totalPrice": total_price,
                "status": pay_status or "-",
                "foodItems": food_items or [],
            }
        )

    return orders


def create_reservation(conn, payload: dict) -> dict:
    screening_key = str(payload.get("screeningId") or "scr-1820")
    screening_date = parse_screening_date(payload.get("screeningDate"))
    selected_seats = normalize_seat_ids(payload.get("seatIds") or [])
    user_email = (
        str(payload.get("userEmail") or payload.get("email") or payload.get("user") or "")
        .strip()
        .lower()
    )

    if not user_email:
        raise ValueError("ログイン中のユーザー情報が見つかりません。")

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (user_email,))
        user_row = cur.fetchone()
        if not user_row:
            raise ValueError("ユーザーが見つかりません。")
        user_id = user_row[0]

    screening_id = ensure_screening(conn, screening_key, screening_date)
    ensure_seat_rows(conn, screening_id)

    with conn.cursor() as cur:
        cur.execute(
            "SELECT seat_label FROM seats WHERE screening_id = %s AND is_reserved = TRUE ORDER BY row_name, col_num",
            (screening_id,),
        )
        reserved_labels = [row[0] for row in cur.fetchall()]

    conflicts = find_conflicting_seats(reserved_labels, selected_seats)
    if conflicts:
        raise ValueError(f"既に予約済みの座席があります: {', '.join(conflicts)}")

    total_price = int(payload.get("totalPrice") or 0)
    food_items = payload.get("foodItems") or []
    payment_method = str(payload.get("paymentMethod") or "credit-card")

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO orders (user_id, order_num, pay_datetime, total_price, food_items)
            VALUES (%s, %s, NOW(), %s, %s) RETURNING id
            """,
            (user_id, f"ORD-{int(__import__('time').time())}", total_price, json.dumps(food_items)),
        )
        order_id = cur.fetchone()[0]

        seat_price = int(payload.get("seatPrice") or 0)
        for seat_label in selected_seats:
            canonical_label = normalize_seat_label(seat_label)
            cur.execute(
                """
                INSERT INTO order_details (order_id, screening_id, seat_num, ticket_num, price)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (order_id, screening_id, canonical_label, 1, seat_price),
            )
            cur.execute(
                "UPDATE seats SET is_reserved = TRUE WHERE screening_id = %s AND seat_label = %s",
                (screening_id, canonical_label),
            )

        cur.execute(
            """
            INSERT INTO payments (order_id, pay_method, pay_num, pay_status, paid_at)
            VALUES (%s, %s, %s, %s, NOW())
            """,
            (order_id, payment_method, f"PAY-{order_id}", "paid"),
        )

    return {
        "screeningId": screening_key,
        "screeningDate": screening_date.isoformat(),
        "screeningDatabaseId": screening_id,
        "reservedSeats": selected_seats,
        "totalPrice": total_price,
        "foodItems": food_items,
        "paymentMethod": payment_method,
    }
