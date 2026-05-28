import os
# Pythonからデータベースを操作するためのライブラリ(特にPostgreSQL)
import psycopg

def db_conn():
    """    
    PostgreSQLに接続する関数
    """
    # データベースのURLを取得
    # docker-composeでbackendに渡してるので、値だけでいい
    database_url = os.getenv("DATABASE_URL")

    # database_urlを最優先に接続
    if database_url: # ←database_urlが存在してるなら実行、ない場合は下に進む
        return psycopg.connect(database_url) # ←PostgreSQLに接続
    
    # ↓database_urlがない場合↓
    # 個別の環境変数を使って実行
    return psycopg.connect(
        # ホスト名
        # ローカル実行ならlocalhost
        host = os.getenv("DB_HOST", "localhost"),
        # ポート番号
        port = os.getenv("POSTGRES_PORT", "5433"),
        # 接続するデータベース名
        dbname = os.getenv("POSTGRES_DB", "movie"),
        # DBユーザー名
        user = os.getenv("POSTGRES_USER", "postgres"),
        # DBパスワード
        password = os.getenv("POSTGRES_PASSWORD", "postgres"),
    )