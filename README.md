# HAL CINEMA

映画・上映情報の管理、座席予約、予約キャンセルに対応する映画館サイトです。管理者ログイン、トースト通知、クーポン、ポイント、Resend APIによる予約メールを含みます。

## 開発環境の起動

Docker Desktopを起動し、プロジェクト直下に `.env.example` をコピーした `.env` を用意します。APIキーなどの実際の値は `.env` だけに保存してください。

```powershell
docker compose up -d --build db backend mail-worker
cd frontend
npm ci
npm run dev -- --port 3000
```

- 一般画面: http://localhost:3000
- 管理者ログイン: http://localhost:3000/admin/login
- バックエンドAPI: http://localhost:5000

画面もDockerで動かす場合は `docker compose --profile frontend up -d --build` を使います。この場合の画面は http://localhost:3001 です。両方とも同じAPI・DBを使用します。

既存環境ではDBを初期化せず、バックエンド起動時に必要な列・テーブルを追加します。管理者の作成手順は [ADMIN_SETUP.md](docs/ADMIN_SETUP.md)、予約メール・クーポン・ポイントは [BOOKING_BENEFITS.md](docs/BOOKING_BENEFITS.md) に記載しています。

## 主な仕様

- 映画登録時に上映回と座席を自動で用意します。手動での上映登録・変更にも対応します。
- 予約キャンセルは本人のみ、上映開始の1時間前までです。座席を解放し、使用ポイントを返還、獲得ポイントを取り消します。
- 固定額・割合クーポンの適用後にポイントを使います。最終支払額100円ごとに1ポイント、1ポイントは1円です。
- 予約・キャンセルメールは送信待ちをDBに保存し、Resend APIから自動送信します。初期設定では無効です。
- 決済・返金はテスト用の記録です。実際のカード請求・返金は行いません。

WindowsとWSLに分かれていた画面・APIの変更を、このリポジトリに統合しています。DBの内容、アップロード済みの作品画像、環境変数の実際の値はGitには含めません。
