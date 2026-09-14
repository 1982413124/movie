"""Explicit operator commands: python manage.py migrate / admin / prune-uploads."""
import argparse
import getpass
import json
import os
import re
import secrets
import time
from pathlib import Path

from werkzeug.security import generate_password_hash
from database.db import db_conn


def migrate():
    sql = Path(__file__).with_name("database").joinpath("admin_migration.sql").read_text(encoding="utf-8")
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute(sql)
        cur.execute(Path(__file__).with_name("database").joinpath("booking_benefits_migration.sql").read_text(encoding="utf-8"))
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
    print("Admin schema migration applied. Existing records preserved.")


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
    directory = Path(os.getenv("UPLOAD_DIRECTORY", str(Path(__file__).with_name("uploads"))))
    with db_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT poster_image FROM movies WHERE poster_image IS NOT NULL")
        used = {row[0].rsplit("/", 1)[-1] for row in cur.fetchall()}
    count = 0
    for file in directory.glob("*.webp"):
        if re.fullmatch(r"[a-f0-9]{32}\.webp", file.name) and file.name not in used and file.stat().st_mtime < time.time() - 86400:
            file.unlink()
            count += 1
    print(f"Removed {count} unreferenced uploads older than 24 hours.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("migrate")
    account = commands.add_parser("admin")
    account.add_argument("--email", required=True)
    account.add_argument("--name", required=True)
    prepared = commands.add_parser("prepare-admin")
    prepared.add_argument("--email", required=True)
    prepared.add_argument("--name", required=True)
    commands.add_parser("prune-uploads")
    commands.add_parser("mail-worker")
    commands.add_parser("send-emails")
    args = parser.parse_args()
    if args.command == "migrate":
        migrate()
    elif args.command == "admin":
        admin(args.email, args.name)
    elif args.command == "prepare-admin":
        prepare_admin(args.email, args.name)
    elif args.command == "mail-worker":
        from reservation_mail import run_worker
        run_worker()
    elif args.command == "send-emails":
        from reservation_mail import deliver_batch
        print(json.dumps(deliver_batch()))
    else:
        prune_uploads()
