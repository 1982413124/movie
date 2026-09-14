# 3000の画面と管理機能

利用者画面: http://localhost:3000/movie-now

管理者ログイン: http://localhost:3000/admin/login

3000はWSLの `/home/sm787/Github-Projects/movie/frontend` で起動します。利用者画面のデザインはこのフォルダーのものです。

```bash
cd /home/sm787/Github-Projects/movie/frontend
npm run dev -- --port 3000
```

作品・上映回・管理者認証・アップロード画像は、5000の共通バックエンドを参照します。現在はWindowsの `C:\Users\sm787\GitHub-Projects\movie` で動いているDockerのbackend/dbを使います。Windows側のPowerShellで起動できます。

```powershell
cd C:\Users\sm787\GitHub-Projects\movie
docker compose up -d backend db
```

`API_INTERNAL_URL`、`API_BASE_URL`、`NEXT_PUBLIC_API_BASE_URL` を指定する場合は、この同じバックエンドを設定してください。未指定時は `http://localhost:5000` です。別のDBやWSL側の旧バックエンドを起動すると登録データが一致しません。

3001のDockerフロントエンドは比較用に残っています。普段は3000を使ってください。2026-09-14にWSLの最新画面とWindowsのバックエンドをこのリポジトリへ統合しました。新しく取得する場合は、[README](../README.md)の手順で同じチェックアウトから両方を起動できます。上記のWindows/WSLのパスは、現在稼働しているローカル環境の配置です。

作品一覧・検索・ホームの作品欄は公開APIを読み、別タブから戻ったときにも更新します。上映回が未登録でも作品詳細を表示し、予約は管理画面で登録した実際の上映回がある場合だけ進めます。上映期間未設定の作品は「上映期間未設定」で確認できます。

猫の動画はログイン画面だけで再生し、管理画面へ入ると表示しません。猫が座っている間もidle動画をループします。

## 接続確認（2026-09-13）

- 3000と3001の公開APIが、同じ作品ID・タイトル・更新日時を返すことを確認。
- 実際の「映画ちいかわ 人魚の島のひみつ」を一覧・ホーム・詳細で確認。上映回は0件のため準備中と表示。
- 未認証の管理ページはログインへ遷移し、管理APIは401。ログイン画面の猫は継続再生。
- 成功・失敗の演出、上映回選択→座席選択→フードへの受け渡し、座席競合はブラウザ内のテスト応答で検証。実際のパスワードによる再ログインや予約作成は行っていません。
- 関連Nodeテスト42件、変更箇所のlint、TypeScript、本番ビルドを確認。390pxでも作品一覧の横はみ出しなし。
