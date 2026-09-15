# Neonでチームの映画・予約・画像を共有する

## 共有するもの

全員のFlask APIから、同じNeonプロジェクトの**同じブランチ・同じデータベース**へ接続します。Next.jsの画面とAPIは各自のPCで動かします。管理担当のPCがOFFでも、ほかのメンバーはNeonのデータを使えます。

映画、上映回、予約、仮押さえ、会員、ポイント、クーポン、メール送信履歴を共有します。作品画像は`movie_images`にWebPで保存し、従来の`/api/cinema/media/ファイル名.webp`で配信します。静的画像や猫のアニメーションは引き続きGitから取得します。

管理画面から映画を登録すると同じDBに保存されます。ほかの画面では再読込、または別タブから戻ったときに作品一覧を取得し直します。Neonのブランチをメンバー別に分けるとデータが別になるため、この共有用途では分けません。

このチームの共有先は作成済みです。プロジェクトは`hal-cinema-team`、ブランチは`production`、DBは`neondb`です。2026-09-15に現在のDBと作品画像を移行しました。**メンバーは以下の「各メンバーが行うこと」から始めてください。移行をやり直す必要はありません。** 接続文字列は管理担当から受け取り、この文書やGitには書き込みません。

## 管理担当が最初に一度だけ行うこと

### 1. Neonの接続先を用意する

[Neon Console](https://console.neon.tech)でFreeのプロジェクトを作成します。移行元に合わせてPostgreSQL 16を選び、空のDBを用意します。既に利用中のDBには復元しません。

Connectから**Connection poolingをOFF**にし、直接接続の文字列をコピーします。現在のAPIは接続時に日本時間を指定するため、マイグレーション・取り込み・APIで直接接続を使います。Neonが付けたTLS設定は残してください。

プロジェクト直下に`.env.shared.example`をコピーした`.env.shared`を作り、`DATABASE_URL=`に接続文字列だけを入れます。`psql`というコマンド名や、外側の引用符は入れません。このファイルとバックアップはGitへ追加しません。

### 2. 最新コードと元DBを保管する

作業中の変更がある場合は先に保存し、最新の共有対応コードを取得します。最終移行では、元DBを変更するAPI・メールワーカーを停止してからバックアップします。DBコンテナは起動したままにします。

```powershell
docker compose stop backend mail-worker frontend
pwsh -File scripts/Export-TeamDatabase.ps1
```

`backups/team-日時/`に`movie.dump`、`uploads/`、SHA-256入りの`manifest.json`が作られます。元DBと元画像は残ります。別の作業コピーから実行するときは`-ProjectDirectory`に**現在DBを動かしているプロジェクト**を指定してください。

### 3. 空のNeon DBに復元する

以下の`team-日時`を、作成されたフォルダ名に置き換えます。復元スクリプトは既存テーブル・シーケンスがあるDBを拒否し、失敗時は全体をロールバックします。接続文字列をコマンドに直接書かず、`.env.shared`から読み込みます。

```powershell
$teamProject = (Get-Location).Path
$teamBackup = (Resolve-Path 'backups/team-日時').Path
docker run --rm --env-file .env.shared --mount "type=bind,source=$teamProject/scripts,target=/scripts,readonly" --mount "type=bind,source=$teamBackup,target=/backup,readonly" postgres:16-alpine sh /scripts/restore-team-database.sh /backup/movie.dump
```

コマンドが成功したら、共有先だけに追加マイグレーションと画像取り込みを実行します。画像フォルダの指定には、バックアップ内の`uploads`を使います。

```powershell
docker compose --env-file .env.shared -f docker-compose.shared.yml build backend
docker compose --env-file .env.shared -f docker-compose.shared.yml run --rm --no-deps backend python manage.py migrate
docker compose --env-file .env.shared -f docker-compose.shared.yml run --rm --no-deps -v "${teamBackup}/uploads:/import-images:ro" backend python manage.py import-movie-images --directory /import-images
docker compose --env-file .env.shared -f docker-compose.shared.yml run --rm --no-deps backend python manage.py check-shared-db
```

画像取り込みは同じ内容なら再実行できます。同名で内容が異なる画像があれば上書きせず、その取り込み全体を中止します。`check-shared-db`は最新マイグレーションと作品から参照される画像の存在を確認します。

復元前後で、映画・上映回・予約・座席・ポイントなどの件数と、画像のSHA-256を照合してから利用を開始します。以降の更新は共有側の管理画面で行ってください。元DBを再び更新してもNeonには同期されません。

## 各メンバーが行うこと

1. 作業中の変更を保存し、最新の`main`を取得します。古いコードのまま共有先へ接続しません。
2. `.env.shared.example`を`.env.shared`へコピーし、管理担当から安全な方法で受け取った同じ`DATABASE_URL`を設定します。
3. 以前のAPI・フロントエンド・メールワーカーを停止します。古いDBやDockerボリュームは削除しません。

```powershell
git switch main
git pull --ff-only origin main
docker compose stop backend mail-worker frontend
docker compose --env-file .env.shared -f docker-compose.shared.yml up -d --build backend mail-worker
cd frontend
npm ci
npm run dev -- --port 3000
```

`frontend/.env.local`に以前の`API_INTERNAL_URL`や`API_BASE_URL`がある場合は、各自PCのAPIに合わせて`http://localhost:5000`へ変更します。環境変数変更後はNext.jsを再起動します。NeonのDB接続文字列を`NEXT_PUBLIC_`変数へ入れないでください。

- 画面: http://localhost:3000
- 管理者ログイン: http://localhost:3000/admin/login
- API: http://localhost:5000

画面もDockerで動かすなら、ローカルの`npm run dev`を停止して、プロジェクト直下で次を使います。こちらも画面は3000です。

```powershell
docker compose --env-file .env.shared -f docker-compose.shared.yml --profile frontend up -d --build
```

共有環境の通常起動はDBを作成・初期化・マイグレーションしません。DB変更は管理担当が一度だけ実行します。全員の古いDBを個別に更新する必要はありません。

## メールと無料枠

予約メールを送るPCでは`.env.shared`に既存のResend設定を入れ、`MAIL_ENABLED=true`にします。メール本文・予約完了／キャンセル時の送信待ち登録は従来通りです。複数ワーカーの同時送信はDBの行ロックとResendの冪等キーで防ぎます。ワーカーが一台も動いていない間は送信待ちが残り、再起動後に送信します。

Neon Freeは、2026-09-15確認時点で1プロジェクトあたり容量0.5GB・月100 CU-hours、5分間使わないと自動休止です。常時無料で24時間動かせる保証ではありません。特にメールワーカーは10秒ごとにDBへ接続するので、メールを有効にしたPCをつけっぱなしにしないでください。座席画面の定期取得もDBを稼働させます。

作業終了時はローカルのNext.jsを止め、以下で共有用コンテナを停止します。Neonのデータは残ります。

```powershell
docker compose --env-file .env.shared -f docker-compose.shared.yml --profile frontend down
```

少量の画像を同じDBへ保存する構成です。画像が増えて0.5GBに近づいたら、不要画像の整理やオブジェクトストレージへの移行を検討します。削除済み作品の未使用画像を整理する場合のみ、管理担当が`python manage.py prune-uploads`を実行します。登録から24時間以内の画像と使用中の画像は保持します。

参照: [Neon料金](https://neon.com/pricing)、[直接接続とプーリング](https://neon.com/docs/connect/connection-pooling)、[pg_dump / pg_restoreによる移行](https://neon.com/docs/import/import-from-postgres)。
