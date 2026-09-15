#!/bin/sh
set -eu

: "${DATABASE_URL:?Set DATABASE_URL to the new empty Neon database}"
if [ "$#" -ne 1 ] || [ ! -r "$1" ]; then
  echo "Usage: sh restore-team-database.sh /backup/movie.dump" >&2
  exit 1
fi

# Refuse to overwrite an existing application schema. Restore is atomic.
tables=$(psql "$DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")
if [ "$tables" != "0" ]; then
  echo "The destination is not empty. No data was restored." >&2
  exit 1
fi
pg_restore --dbname="$DATABASE_URL" --no-owner --no-privileges --no-tablespaces --single-transaction --exit-on-error "$1"
echo "Database restored. Apply migrations and import movie images before starting the shared API."
