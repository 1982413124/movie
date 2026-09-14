"""Browser-only fixtures in the isolated _test database; no production seeds."""
import os
import json
from pathlib import Path
from datetime import timedelta
from werkzeug.security import generate_password_hash
from database.db import db_conn
from movie_domain import japan_today

password = os.environ["ADMIN_TEST_PASSWORD"]
today = japan_today()
with db_conn() as conn, conn.cursor() as cur:
    if not conn.info.dbname.endswith("_test"):
        raise SystemExit("Refusing to seed a non-test database")
    cur.execute("TRUNCATE users, movies, theaters, ticket_types, foods, admin_login_attempts RESTART IDENTITY CASCADE")
    cur.execute("INSERT INTO users (name,email,password,role) VALUES ('検証用スタッフ','staff@example.test',%s,'ADMIN'),('一般会員','user@example.test',%s,'USER')", (generate_password_hash(password), generate_password_hash(password)))
    cur.execute("INSERT INTO theaters (theater_name) VALUES ('HAL CINEMA 名古屋栄') RETURNING id")
    theater = cur.fetchone()[0]
    for number, capacity in ((1, 200), (2, 200), (3, 200), (4, 120), (5, 120), (6, 70), (7, 70), (8, 70)):
        cur.execute("INSERT INTO screens (id,theater_id,name,seat_count) VALUES (%s,%s,%s,%s)", (f"screen-{number}", theater, f"スクリーン {number}", capacity))
    for values in (("general", "一般", 1800), ("student", "大学生等", 1600), ("junior", "中学・高校", 1400), ("child", "小学生・幼児", 1000)):
        cur.execute("INSERT INTO ticket_types (id,label,current_price) VALUES (%s,%s,%s)", values)
    for food in json.loads(Path(__file__).parents[1].joinpath("database/legacy_catalog.json").read_text())["foods"]:
        cur.execute("INSERT INTO foods (id,name,current_price) VALUES (%s,%s,%s)", (food["id"], food["name"], food["price"]))
    for index in range(50):
        title, image, genre = (("SPIDER MAN", "/images/man.jpg", "アクション"), ("GODZILLA", "/images/gozira.jpg", "SF"), ("SPIDER MAN CLASSICS", "/images/man.jpg", "アクション"))[index % 3]
        start, end = ((today - timedelta(days=7), today + timedelta(days=20)) if index < 24 else (today + timedelta(days=7), today + timedelta(days=30)) if index < 39 else (today - timedelta(days=30), today - timedelta(days=1)))
        cur.execute("""INSERT INTO movies (id,title,genre,duration_minutes,age_rating,synopsis,poster_image,release_date,screening_start,screening_end)
            VALUES (%s,%s,%s,%s,'G',%s,%s,%s,%s,%s)""", (f"visual-{index:02}", title if index < 3 else f"{title} / 検証 {index + 1:02}", genre, 110 + index % 35, "これはブラウザ検証用の作品データです。実運用の映画情報には追加されません。", image, start, start, end))
print("50 browser fixtures created in the isolated test database.")
