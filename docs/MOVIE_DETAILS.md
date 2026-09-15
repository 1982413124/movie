# 作品詳細の入力と表示

管理画面の「作品ライブラリ」から作品を編集し、「05 キャスト・スタッフ・公式サイト」に入力します。新規登録でも同じ項目を使えます。

| 項目 | DB・APIの名前 | 上限 |
| --- | --- | --- |
| 監督 | `director` | 255文字 |
| キャスト | `cast_members` | 4,000文字。改行で複数名を入力可能 |
| 配給 | `distributor` | 255文字 |
| 公式サイトURL | `official_site_url` | 2,000文字。HTTP/HTTPSの絶対URL |

すべて任意です。空欄の項目は公開画面に表示しません。公式サイトは別タブで開きます。ログイン情報付きURLやスクリプトなどは、画面とAPIの両方で拒否します。

作品詳細では「あらすじ」「キャスト・スタッフ」「予告動画」を別々の枠で表示します。4行に収まらないあらすじは「続きを読む」で開閉できます。予告動画は登録済みポスターと再生ボタンを表示し、押したときにYouTubeを読み込みます。

## DBの更新

`database/movie_details_migration.sql` が `movies` に4列を追加します。既存レコードは空文字で初期化し、再実行しても入力済みの値を消しません。新しいコードで起動する前に、管理担当が一度だけ実行します。

```powershell
docker compose --env-file .env.shared -f docker-compose.shared.yml run --rm --no-deps backend python manage.py migrate
```

共有DBの起動確認は `movie-details-20260915` の適用も確認します。コードを更新していない旧フォームからPUTした場合、送信されていない追加項目は保持します。空文字またはnullを明示した場合は空欄として保存します。

## 確認

- バックエンド：`python -m unittest discover -s tests` と `python -m unittest test_reservation_api test_screening_availability`。DBを使うテストは必ず専用の `_test` DBを指定します。
- フロント：`node --test lib/*.test.mjs`、Next.jsの型生成後のTypeScriptチェック、変更したコンポーネントのlint、本番ビルド。
- 旧テーブルからの移行、再適用、作成・編集・空欄化、省略した項目の保持、管理権限、URL入力を回帰テストで確認します。
