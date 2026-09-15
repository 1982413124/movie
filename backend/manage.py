"""Explicit operator commands: python manage.py migrate / admin / prune-uploads."""
import argparse
import getpass
import json
import os
import re
import secrets
from pathlib import Path

from werkzeug.security import generate_password_hash
from database.db import db_conn


def migrate():
    sql = Path(__file__).with_name("database").joinpath("admin_migration.sql").read_text(encoding="utf-8")
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute(sql)
        cur.execute(Path(__file__).with_name("database").joinpath("booking_benefits_migration.sql").read_text(encoding="utf-8"))
        cur.execute(Path(__file__).with_name("database").joinpath("seat_holds_migration.sql").read_text(encoding="utf-8"))
        cur.execute(Path(__file__).with_name("database").joinpath("shared_images_migration.sql").read_text(encoding="utf-8"))
        cur.execute("CREATE TABLE IF NOT EXISTS cinema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)")
        cur.execute("INSERT INTO cinema_migrations (name) VALUES ('existing-catalog-20260910') ON CONFLICT DO NOTHING RETURNING name")
        if cur.fetchone():
            catalog = json.loads(Path(__file__).with_name("database").joinpath("legacy_catalog.json").read_text(encoding="utf-8"))
            for food in catalog["foods"]:
                cur.execute("INSERT INTO foods (id, name, current_price) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING", (food["id"], food["name"], food["price"]))
            for ticket in catalog["tickets"]:
                cur.execute("INSERT INTO ticket_types (id, label, current_price) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING", (ticket["id"], ticket["label"], ticket["price"]))
            # Preserve the image used by the former public catalog for this existing row.
            cur.execute("UPDATE movies SET poster_image = '/images/man.jpg' WHERE id = 'movie-001' AND (poster_image IS NULL OR poster_image = '')")
        cur.execute("INSERT INTO cinema_migrations (name) VALUES ('shared-images-20260915') ON CONFLICT DO NOTHING")
    print("Admin schema migration applied. Existing records preserved.")


def check_shared_db():
    if not os.getenv("DATABASE_URL"):
        raise SystemExit("DATABASE_URL is required for shared development.")
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1 FROM cinema_migrations WHERE name = 'shared-images-20260915'")
        if not cur.fetchone():
            raise SystemExit("Ask the database operator to apply the latest migration first.")
        cur.execute("""SELECT count(*) FROM movies m
            WHERE m.poster_image LIKE '/api/cinema/media/%'
              AND NOT EXISTS (SELECT 1 FROM movie_images i
                  WHERE m.poster_image = '/api/cinema/media/' || i.filename)""")
        if cur.fetchone()[0]:
            raise SystemExit("Shared movie images are missing. Ask the operator to import-movie-images first.")
    print("Shared database and movie images are ready.")


def admin(email, name):
    password = getpass.getpass("New admin password (12+ characters): ")
    confirm = getpass.getpass("Repeat password: ")
    if not 12 <= len(password) <= 1024 or password != confirm:
        raise SystemExit("Passwords must match and contain 12-1024 characters.")
    email = email.strip().lower()
    if len(email) > 255 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or not 1 <= len(name.strip()) <= 255:
        raise SystemExit("A valid email and display name are required.")
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute("""INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, 'ADMIN')
            ON CONFLICT (email) DO UPDATE SET role = 'ADMIN', name = EXCLUDED.name,
            password = EXCLUDED.password, updated_at = CURRENT_TIMESTAMP RETURNING id""",
                    (name.strip(), email, generate_password_hash(password)))
        user_id = cur.fetchone()[0]
        cur.execute("DELETE FROM admin_sessions WHERE user_id = %s", (user_id,))
    print("Admin account saved; previous sessions revoked.")


def prepare_admin(email, name):
    """Provision an account with an unknown password until the operator sets it locally."""
    email = email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or not 1 <= len(name.strip()) <= 255:
        raise SystemExit("A valid email and display name are required.")
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute("""INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, 'ADMIN')
            ON CONFLICT (email) DO NOTHING RETURNING id""", (name.strip(), email, generate_password_hash(secrets.token_urlsafe(64))))
        created = cur.fetchone() is not None
    print("Admin account prepared. Set its password locally with the admin command." if created else "Existing account preserved. Use the admin command to set its password and role.")


def prune_uploads():
    from movie_image_storage import prune_images
    count = prune_images()
    print(f"Removed {count} unreferenced uploads older than 24 hours.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("migrate")
    commands.add_parser("check-shared-db")
    account = commands.add_parser("admin")
    account.add_argument("--email", required=True)
    account.add_argument("--name", required=True)
    prepared = commands.add_parser("prepare-admin")
    prepared.add_argument("--email", required=True)
    prepared.add_argument("--name", required=True)
    commands.add_parser("prune-uploads")
    images = commands.add_parser("import-movie-images")
    images.add_argument("--directory", default=os.getenv("UPLOAD_DIRECTORY", str(Path(__file__).with_name("uploads"))))
    commands.add_parser("mail-worker")
    commands.add_parser("send-emails")
    args = parser.parse_args()
    if args.command == "migrate":
        migrate()
    elif args.command == "check-shared-db":
        check_shared_db()
    elif args.command == "admin":
        admin(args.email, args.name)
    elif args.command == "prepare-admin":
        prepare_admin(args.email, args.name)
    elif args.command == "import-movie-images":
        from movie_image_storage import import_local_images
        print(json.dumps(import_local_images(args.directory)))
    elif args.command == "mail-worker":
        from reservation_mail import run_worker
        run_worker()
    elif args.command == "send-emails":
        from reservation_mail import deliver_batch
        print(json.dumps(deliver_batch()))
    else:
        prune_uploads()
