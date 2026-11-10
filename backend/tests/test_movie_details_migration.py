"""Check an older movies table without changing real data or the test catalog."""
import os
import unittest
from pathlib import Path

import psycopg


@unittest.skipUnless(os.getenv("ADMIN_TEST_DATABASE_URL"), "Requires isolated _test PostgreSQL")
class MovieDetailsMigrationTest(unittest.TestCase):
    def test_legacy_rows_and_new_details_survive_repeated_migration(self):
        with psycopg.connect(os.environ["ADMIN_TEST_DATABASE_URL"]) as conn:
            self.assertTrue(conn.info.dbname.endswith("_test"))
            conn.execute("CREATE TEMP TABLE movies (id TEXT PRIMARY KEY, title TEXT, updated_at TIMESTAMPTZ)")
            conn.execute("INSERT INTO movies VALUES ('legacy', '既存作品', '2026-09-01T10:00:00+09:00')")
            before = conn.execute("SELECT * FROM movies").fetchone()
            migration = Path(__file__).resolve().parents[1].joinpath("database/movie_details_migration.sql").read_text(encoding="utf-8")
            conn.execute(migration)
            self.assertEqual(conn.execute("SELECT id, title, updated_at FROM movies").fetchone(), before)
            self.assertEqual(conn.execute("SELECT director, cast_members, distributor, official_site_url FROM movies").fetchone(), ("", "", "", ""))
            conn.execute("UPDATE movies SET director='監督', cast_members='出演者', distributor='配給', official_site_url='https://example.com/'")
            saved = conn.execute("SELECT * FROM movies").fetchone()
            conn.execute(migration)
            self.assertEqual(conn.execute("SELECT * FROM movies").fetchone(), saved)
