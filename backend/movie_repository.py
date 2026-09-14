from psycopg.rows import dict_row
from database.db import db_conn
from movie_domain import movie_status, youtube_id

MOVIE_COLUMNS = """m.id, m.title, m.genre, m.duration_minutes, m.age_rating,
    m.synopsis, m.poster_image, m.release_date, m.screening_start, m.screening_end,
    m.trailer_url, m.created_at, m.updated_at"""


def serialize_movie(row):
    result = dict(row)
    result["status"] = movie_status(row["screening_start"], row["screening_end"])
    result["youtube_id"] = youtube_id(row["trailer_url"])
    for key in ("release_date", "screening_start", "screening_end", "created_at", "updated_at"):
        result[key] = row[key].isoformat() if row[key] else None
    return result


def list_movies():
    with db_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(f"""SELECT {MOVIE_COLUMNS},
            (SELECT count(*) FROM showings s WHERE s.movie_id = m.id) AS showing_count,
            EXISTS (SELECT 1 FROM reservation_seats rs JOIN showings s ON s.id = rs.showing_id WHERE s.movie_id = m.id) AS has_reservations
            FROM movies m ORDER BY m.updated_at DESC, m.id""")
        return [serialize_movie(row) for row in cur.fetchall()]


def get_movie(movie_id):
    with db_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(f"SELECT {MOVIE_COLUMNS} FROM movies m WHERE m.id = %s", (movie_id,))
        row = cur.fetchone()
        return serialize_movie(row) if row else None


def list_showings(movie_id=None):
    with db_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""SELECT sh.id, sh.movie_id, m.title AS movie_title, sh.screen_id,
            sc.name AS screen_name, sc.seat_count AS capacity, t.theater_name,
            sh.show_date::text, sh.start_time::text, sh.end_time::text,
            (SELECT count(*) FROM reservation_seats rs JOIN orders o ON o.id = rs.order_id
                WHERE rs.showing_id = sh.id AND rs.released_at IS NULL
                AND o.order_status IN ('pending', 'paid')) AS reserved_count,
            (SELECT count(*) FROM seat_holds h WHERE h.showing_id = sh.id
                AND h.expires_at > clock_timestamp()) AS held_count,
            EXISTS (SELECT 1 FROM reservation_seats rs WHERE rs.showing_id = sh.id) AS has_reservations
            FROM showings sh JOIN movies m ON m.id = sh.movie_id
            JOIN screens sc ON sc.id = sh.screen_id JOIN theaters t ON t.id = sc.theater_id
            WHERE (%s::text IS NULL OR sh.movie_id = %s)
            ORDER BY sh.show_date, sh.start_time, sc.name""", (movie_id, movie_id))
        return [dict(row) for row in cur.fetchall()]
