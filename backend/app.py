from flask import Flask, jsonify
from flask_cors import CORS
from database.db import db_conn


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


# このファイルを直接実行したときだけ起動する
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)