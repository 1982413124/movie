from flask import Flask, jsonify, request
from flask_cors import CORS
from database.db import db_conn
from werkzeug.security import generate_password_hash


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

# このファイルを直接実行したときだけ起動する
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)