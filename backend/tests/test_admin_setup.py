"""Exercise operator commands against a legacy schema in an isolated test DB."""
import os
import secrets
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import psycopg
from werkzeug.security import check_password_hash, generate_password_hash

from app import app
from database.db import db_conn


@unittest.skipUnless(os.getenv("ADMIN_TEST_DATABASE_URL"), "Set ADMIN_TEST_DATABASE_URL for PostgreSQL integration tests")
class AdminSetupTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.url = os.environ["ADMIN_TEST_DATABASE_URL"]
        with psycopg.connect(cls.url) as conn:
            if not conn.info.dbname.endswith("_test"):
                raise RuntimeError("Refusing to use a non-test database")

    def setUp(self):
        self.enterContext(patch.dict(os.environ, {"DATABASE_URL": self.url}))
        self.enterContext(patch.dict(app.config, {"TESTING": True, "ADMIN_COOKIE_SECURE": False}))
        self.email = "existing-admin@example.test"
        self.old_password = secrets.token_urlsafe(24)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("TRUNCATE users, admin_login_attempts RESTART IDENTITY CASCADE")
            # The existing user database predates the updated_at column in DDL.txt.
            cur.execute("ALTER TABLE users DROP COLUMN IF EXISTS updated_at")
            cur.execute("INSERT INTO users (name, email, password, role) VALUES ('Existing admin', %s, %s, 'ADMIN') RETURNING id",
                        (self.email, generate_password_hash(self.old_password)))
            self.user_id = cur.fetchone()[0]

    def command(self, *args, password=None):
        result = subprocess.run(
            [sys.executable, "manage.py", *args],
            cwd=Path(__file__).resolve().parents[1],
            input=f"{password}\n{password}\n" if password else None,
            capture_output=True, text=True, encoding="utf-8", timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        if password:
            self.assertNotIn(password, result.stdout + result.stderr)
        return result.stdout

    def user_row(self):
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT id, name, email, password, created_at, role FROM users WHERE id = %s", (self.user_id,))
            return cur.fetchone()

    def login(self, client, email, password):
        return client.post("/api/admin/login", json={"email": email, "password": password},
                           headers={"Origin": "http://localhost:3000"})

    def test_migration_repairs_legacy_users_and_preserves_rows_on_repeat(self):
        before = self.user_row()
        self.assertIn("Admin schema migration applied", self.command("migrate"))
        self.assertEqual(self.user_row(), before)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT updated_at FROM users WHERE id = %s", (self.user_id,))
            self.assertIsNotNone(cur.fetchone()[0])
            cur.execute("UPDATE users SET updated_at = '2001-01-01T00:00:00Z' WHERE id = %s", (self.user_id,))
        self.command("migrate")
        self.assertEqual(self.user_row(), before)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT updated_at FROM users WHERE id = %s", (self.user_id,))
            self.assertEqual(cur.fetchone()[0].year, 2001)

    def test_password_reset_after_upgrade_allows_login_and_revokes_old_session(self):
        self.command("migrate")
        old_client = app.test_client()
        self.assertEqual(self.login(old_client, self.email, self.old_password).status_code, 200)
        password = secrets.token_urlsafe(24)
        self.assertIn("Admin account saved", self.command("admin", "--email", self.email,
                                                         "--name", "Updated admin", password=password))
        row = self.user_row()
        self.assertEqual((row[0], row[1], row[5]), (self.user_id, "Updated admin", "ADMIN"))
        self.assertTrue(check_password_hash(row[3], password))
        self.assertFalse(check_password_hash(row[3], self.old_password))
        self.assertEqual(old_client.get("/api/admin/session").status_code, 401)
        new_client = app.test_client()
        self.assertEqual(self.login(new_client, self.email, self.old_password).status_code, 401)
        self.assertEqual(self.login(new_client, self.email, password).status_code, 200)
        self.assertEqual(new_client.get("/api/admin/session").json["user"]["id"], self.user_id)

    def test_new_admin_after_upgrade_can_log_in(self):
        self.command("migrate")
        email = "new-admin@example.test"
        password = secrets.token_urlsafe(24)
        self.command("admin", "--email", email, "--name", "New admin", password=password)
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT role, password, updated_at FROM users WHERE email = %s", (email,))
            role, stored_hash, updated_at = cur.fetchone()
        self.assertEqual(role, "ADMIN")
        self.assertTrue(check_password_hash(stored_hash, password))
        self.assertIsNotNone(updated_at)
        client = app.test_client()
        self.assertEqual(self.login(client, email, password).status_code, 200)
        self.assertEqual(client.get("/api/admin/session").json["user"]["email"], email)


if __name__ == "__main__":
    unittest.main()
