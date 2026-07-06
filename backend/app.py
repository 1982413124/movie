import json
from urllib.parse import parse_qsl

from flask import Flask, jsonify, request
from flask_cors import CORS
from database.db import db_conn
from reservation_service import create_reservation, ensure_schema, ensure_screening, ensure_seat_rows, fetch_seat_rows, fetch_user_orders, parse_screening_date
from werkzeug.security import generate_password_hash, check_password_hash


# Flaskアプリ
app = Flask(__name__)


def parse_request_payload():
    """JSON / form / query-string を統一的にパースする。"""
    content_type = (request.content_type or "").lower()

    if "application/json" in content_type:
        raw_body = request.get_data(as_text=True)
        if raw_body:
            try:
                parsed = json.loads(raw_body)
                if isinstance(parsed, dict):
                    return parsed
            except (TypeError, ValueError):
                pass

        payload = request.get_json(silent=True)
        if isinstance(payload, dict):
            return payload

    try:
        payload = request.form.to_dict(flat=True)
        if payload:
            return payload
    except Exception:
        pass

    try:
        payload = request.args.to_dict()
        if payload:
            return payload
    except Exception:
        pass

    raw_body = request.get_data(as_text=True)
    if raw_body:
        try:
            parsed = json.loads(raw_body)
            if isinstance(parsed, dict):
                return parsed
        except (TypeError, ValueError):
            pass

        try:
            return dict(parse_qsl(raw_body))
        except Exception:
            return {}

    return {}
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
    
@app.post("/api/register")
def register():
    """
    ユーザー新規登録API
    """
    # JSON送信(fetch)と通常フォーム送信(x-www-form-urlencoded)の両方を受ける
    payload = parse_request_payload()

    name = str(payload.get("name", "")).strip() # 前後の空白を削除
    email = str(payload.get("email", payload.get("userEmail", ""))).strip().lower() # 前後の空白を削除と小文字統一
    password = str(payload.get("password", payload.get("pass", ""))).strip()

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
    payload = parse_request_payload()

    email = str(payload.get("email", payload.get("userEmail", ""))).strip().lower()
    password = str(payload.get("password", payload.get("pass", "")))

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


@app.put("/api/users/<current_email>")
def update_user(current_email):
    """
    プロフィール（名前・メールアドレス）更新API
    """
    payload = parse_request_payload()

    current_email = current_email.strip().lower()
    name = str(payload.get("name", "")).strip()
    new_email = str(payload.get("email", "")).strip().lower()

    if not name or not new_email:
        return jsonify({"status": "error", "message": "名前とメールアドレスは必須です"}), 400

    try:
        with db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM users WHERE email = %s;", (current_email,))
                user_row = cur.fetchone()

                if not user_row:
                    return jsonify({"status": "error", "message": "ユーザーが見つかりません"}), 404

                if new_email != current_email:
                    cur.execute("SELECT 1 FROM users WHERE email = %s;", (new_email,))
                    if cur.fetchone():
                        return (
                            jsonify({"status": "error", "message": "このメールアドレスは既に使用されています"}),
                            409,
                        )

                cur.execute(
                    """
                    UPDATE users SET name = %s, email = %s
                    WHERE id = %s
                    RETURNING id, name, email, created_at
                    """,
                    (name, new_email, user_row[0]),
                )
                updated_row = cur.fetchone()

        return jsonify(
            {
                "status": "ok",
                "user": {
                    "id": updated_row[0],
                    "name": updated_row[1],
                    "email": updated_row[2],
                    "created_at": updated_row[3].isoformat() if updated_row[3] else None,
                },
            }
        )

    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.get("/api/orders")
def get_orders():
    """
    ログイン中ユーザーの購入履歴を返すAPI
    """
    email = str(request.args.get("email", "")).strip().lower()

    if not email:
        return jsonify({"status": "error", "message": "メールアドレスが必要です"}), 400

    try:
        with db_conn() as conn:
            orders = fetch_user_orders(conn, email)
        return jsonify({"status": "ok", "orders": orders})
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.get("/api/screenings/<screening_id>/seats")
def get_screening_seats(screening_id):
    screening_date = parse_screening_date(request.args.get("date"))

    try:
        with db_conn() as conn:
            ensure_schema(conn)
            screening_db_id = ensure_screening(conn, screening_id, screening_date)
            ensure_seat_rows(conn, screening_db_id)
            seat_rows = fetch_seat_rows(conn, screening_db_id)

        return jsonify(
            {
                "status": "ok",
                "screeningId": screening_id,
                "screeningDate": screening_date.isoformat(),
                "seats": seat_rows,
            }
        )
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.post("/api/reservations")
def create_reservation_api():
    payload = parse_request_payload()

    try:
        with db_conn() as conn:
            ensure_schema(conn)
            reservation = create_reservation(conn, payload)
        return jsonify({"status": "ok", "reservation": reservation})
    except ValueError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 409
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


# このファイルを直接実行したときだけ起動する
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)