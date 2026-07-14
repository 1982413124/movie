import os
# Pythonからデータベースを操作するためのライブラリ(特にPostgreSQL)
import psycopg

DB_TIMEZONE_OPTION = "-c timezone=Asia/Tokyo"


def db_conn():
    """
    PostgreSQLに接続する関数。
    DB内のtimestamptzを日本時間で確認しやすいよう、接続時のtimezone=Asia/Tokyoを固定する。
    """
    database_url = os.getenv("DATABASE_URL")
    connection_options = {"options": DB_TIMEZONE_OPTION}

    if database_url:
        return psycopg.connect(database_url, **connection_options)

    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("POSTGRES_PORT", "5433"),
        dbname=os.getenv("POSTGRES_DB", "movie"),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "postgres"),
        **connection_options,
    )