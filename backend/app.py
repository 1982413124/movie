import os

from flask import Flask, jsonify
from flask_cors import CORS
import psycopg


app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv("DATABASE_URL")


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/health/db")
def health_db():
    try:
        with psycopg.connect(DATABASE_URL) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                row = cursor.fetchone()

        return jsonify({"status": "ok", "db": row[0]})
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.get("/api/movies")
def movies():
    try:
        with psycopg.connect(DATABASE_URL) as connection:
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