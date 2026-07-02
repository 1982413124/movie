from flask import Flask, jsonify, request
from flask_cors import CORS
from database.db import db_conn
from psycopg import errors
from werkzeug.security import generate_password_hash, check_password_hash


# Flaskアプリ
app = Flask(__name__)
# フロントからAPIを呼べるようにする
CORS(app)


@app.get("/health")
def health():
    """
    サーバーが起動しているか確認するAPI
    """
    return jsonify({"status": "ok"})


@app.get("/health/db")
def health_db():
    """
    DBに接続できるか確認するAPI
    """
    try:
        # db_conn()でDB接続を取得
        # withを使うと自動でクローズされる
        with db_conn() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                row = cursor.fetchone()

        # 成功時はokを返す
        return jsonify({"status": "ok", "db": row[0]})

    except Exception as exc:
        # 失敗時はエラー内容を返す
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.get("/api/movies")
def get_movies():
    """
    moviesテーブルの一覧を返すAPI
    """
    try:
        with db_conn() as connection:
            with connection.cursor() as cursor:
                # 映画一覧を取得
                cursor.execute(
                    """
                    SELECT id, title, genre, duration_minutes, age_rating, release_date
                    FROM movies
                    ORDER BY id;
                    """
                )
                rows = cursor.fetchall()

        # DBの行データをJSONに変換して返す
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


def find_user_id_by_email(cursor, email):
    """
    既存ログインを壊さないため、emailがある時だけusers.idを紐付ける。
    """
    if not email:
        return None

    cursor.execute("SELECT id FROM users WHERE email = %s;", (email,))
    row = cursor.fetchone()
    return row[0] if row else None


@app.get("/api/screenings/<screening_id>/reserved-seats")
def get_reserved_seats(screening_id):
    """
    上映回ごとの予約済み座席を返すAPI。
    """
    normalized_screening_id = str(screening_id or "").strip()

    if not normalized_screening_id:
        return jsonify({"status": "error", "message": "screening_id is required"}), 400

    try:
        with db_conn() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT seat_label
                    FROM reservation_seats
                    WHERE screening_id = %s
                    ORDER BY seat_label;
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
    現在のフロント認証はemailを保持しているため、user_emailで絞り込む。
    """
    user_email = str(request.args.get("user_email", "")).strip().lower()

    if not user_email:
        return jsonify({"status": "error", "message": "user_email is required"}), 400

    try:
        with db_conn() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        id,
                        user_email,
                        movie_id,
                        screening_id,
                        screen_name,
                        screening_time,
                        ticket_count,
                        ticket_total_price,
                        food_total_price,
                        total_price,
                        status,
                        created_at
                    FROM reservations
                    WHERE user_email = %s
                    ORDER BY created_at DESC, id DESC;
                    """,
                    (user_email,),
                )
                rows = cursor.fetchall()
                reservation_ids = [row[0] for row in rows]
                seats_by_reservation = {reservation_id: [] for reservation_id in reservation_ids}

                if reservation_ids:
                    cursor.execute(
                        """
                        SELECT reservation_id, seat_label
                        FROM reservation_seats
                        WHERE reservation_id = ANY(%s)
                        ORDER BY reservation_id, seat_label;
                        """,
                        (reservation_ids,),
                    )
                    for reservation_id, seat_label in cursor.fetchall():
                        seats_by_reservation.setdefault(reservation_id, []).append(seat_label)

        return jsonify(
            {
                "status": "ok",
                "reservations": [
                    {
                        "id": row[0],
                        "user_email": row[1],
                        "movie_id": row[2],
                        "screening_id": row[3],
                        "screen_name": row[4],
                        "screening_time": row[5],
                        "ticket_count": row[6],
                        "ticket_total_price": row[7],
                        "food_total_price": row[8],
                        "total_price": row[9],
                        "reservation_status": row[10],
                        "created_at": row[11].isoformat() if row[11] else None,
                        "seats": seats_by_reservation.get(row[0], []),
                    }
                    for row in rows
                ],
            }
        )

    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500

@app.post("/api/reservations")
def create_reservation():
    """
    座席予約を確定するAPI。
    同じ上映回の同じ座席はDBのUNIQUE制約と事前チェックで二重予約を防ぐ。
    """
    payload = request.get_json(silent=True) or {}
    screening_id = str(payload.get("screening_id", "")).strip()
    movie_id = str(payload.get("movie_id", "")).strip()
    seat_ids = normalize_seat_ids(payload.get("seat_ids"))
    user_email = str(payload.get("user_email", "")).strip().lower() or None
    screen_name = str(payload.get("screen_name", "")).strip() or None
    screening_time = str(payload.get("screening_time", "")).strip() or None
    ticket_count = int(payload.get("ticket_count") or len(seat_ids))
    ticket_total_price = int(payload.get("ticket_total_price") or 0)
    food_total_price = int(payload.get("food_total_price") or 0)
    total_price = int(payload.get("total_price") or ticket_total_price + food_total_price)

    if not screening_id or not movie_id or not seat_ids:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "movie_id, screening_id, seat_ids are required",
                }
            ),
            400,
        )

    try:
        with db_conn() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT seat_label
                    FROM reservation_seats
                    WHERE screening_id = %s
                      AND seat_label = ANY(%s);
                    """,
                    (screening_id, seat_ids),
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

                user_id = find_user_id_by_email(cursor, user_email)
                cursor.execute(
                    """
                    INSERT INTO reservations (
                        user_id,
                        user_email,
                        movie_id,
                        screening_id,
                        screen_name,
                        screening_time,
                        ticket_count,
                        ticket_total_price,
                        food_total_price,
                        total_price,
                        status
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'reserved')
                    RETURNING id, created_at;
                    """,
                    (
                        user_id,
                        user_email,
                        movie_id,
                        screening_id,
                        screen_name,
                        screening_time,
                        ticket_count,
                        ticket_total_price,
                        food_total_price,
                        total_price,
                    ),
                )
                reservation_row = cursor.fetchone()
                reservation_id = reservation_row[0]
                created_at = reservation_row[1]

                for seat_label in seat_ids:
                    cursor.execute(
                        """
                        INSERT INTO reservation_seats (reservation_id, screening_id, seat_label)
                        VALUES (%s, %s, %s);
                        """,
                        (reservation_id, screening_id, seat_label),
                    )

        return (
            jsonify(
                {
                    "status": "ok",
                    "reservation_id": reservation_id,
                    "screening_id": screening_id,
                    "reserved_seats": seat_ids,
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
    ユーザー新規登録API
    """
    # JSON送信(fetch)と通常フォーム送信(x-www-form-urlencoded)の両方を受ける
    payload = request.get_json(silent=True) or request.form.to_dict() or {}

    name = str(payload.get("name", "")).strip() # 前後の空白を削除
    email = str(payload.get("email", "")).strip().lower() # 前後の空白を削除と小文字統一
    password = str(payload.get("password", "")).strip()

    if not name or not email or not password:
        return (
            jsonify({"status": "error", "message": "名前とメールアドレスとパスワードは必須です"}),
            400,
        )
    
    try:
        # DB接続とメアド重複チェック
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM users WHERE email = %s;", (email,))
                if cur.fetchone():
                    return (
                        jsonify({"status": "error", "message": "このメールアドレスは既に登録されています"}),
                        409,
                    )
                
                # パスワードハッシュ化
                hashed_password = generate_password_hash(password)

                # DBにINSERT
                cur.execute(
                    """
                    INSERT INTO users (name, email, password)
                    VALUES (%s, %s, %s)
                    RETURNING id, name, email, created_at
                    """,
                    (name, email, hashed_password) # ←VALUESに入れる中身
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
                    }
                }
            ),
            201,
        )

    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500
    

@app.post("/api/login")
def login():
    """
    ログインAPI
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


# このファイルを直接実行したときだけ起動する
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)