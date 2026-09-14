"""Create a fresh, explicitly named integration database from the project DDL."""
import os
from pathlib import Path
import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

url = os.environ["ADMIN_TEST_DATABASE_URL"]
config = conninfo_to_dict(url)
name = config["dbname"]
if not name.endswith("_test"):
    raise SystemExit("Only an explicitly named _test database is allowed")
admin_url = make_conninfo(url, dbname="postgres")
with psycopg.connect(admin_url, autocommit=True) as conn:
    exists = conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (name,)).fetchone()
    if not exists:
        conn.execute(sql.SQL("CREATE DATABASE {} TEMPLATE template0").format(sql.Identifier(name)))
with psycopg.connect(url) as conn:
    if conn.execute("SELECT 1 FROM information_schema.tables WHERE table_schema='public' LIMIT 1").fetchone():
        print("Existing test schema preserved.")
        raise SystemExit(0)
root = Path(__file__).resolve().parents[2]
ddl = root.joinpath("DDL.txt").read_text(encoding="utf-8-sig").replace("ALTER DATABASE movie SET timezone TO 'Asia/Tokyo';", "")
migration = root.joinpath("backend/database/admin_migration.sql").read_text(encoding="utf-8")
with psycopg.connect(url) as conn:
    conn.execute(ddl)
    conn.execute(migration)
    conn.execute(root.joinpath("backend/database/booking_benefits_migration.sql").read_text(encoding="utf-8"))
print("Isolated test database initialized.")
