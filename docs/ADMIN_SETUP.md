# 管理システムの起動と運用

## 起動

Docker Desktopを起動し、Windowsのプロジェクト直下（`C:\Users\sm787\GitHub-Projects\movie`）で実行します。

```powershell
docker compose --profile frontend up -d --build
```

管理者は [http://localhost:3001/admin/login](http://localhost:3001/admin/login) を直接開きます。一般画面に管理者へのリンクはありません。ホストでNext.jsを動かす場合はfrontendで npm run dev を実行し、API_INTERNAL_URLをFlaskのアドレスに合わせます。

DockerのNext.js生成キャッシュは専用のfrontend_nextボリュームに置きます。Windows側のビルド出力と共有しないため、両環境の型生成が干渉しません。

DB移行はバックエンドコンテナの起動時に自動実行されます。手動で再実行する場合も、プロジェクト直下で次のコマンドを使います。

```powershell
docker compose exec backend python manage.py migrate
```

このコマンドは `backend/manage.py` をコンテナ内のPythonで実行します。プロジェクト直下に `manage.py` はないため、Windowsで `python manage.py migrate` だけを実行するとファイルが見つからず失敗します。成功時は `Admin schema migration applied. Existing records preserved.` と表示されます。

既存行を残して管理者用カラム・テーブルを追加し、従来の商品12件・券種4件のうち不足分だけを一度取り込みます。既存の価格は上書きしません。既存movie-001の空の画像パスには従来使用していた画像を引き継ぎます。上映日・公開日・あらすじは推測して補完しません。

## 初回管理者

- メール: admin@halcinema.example
- 表示名: HAL CINEMA管理者

指定されたアカウントを準備します。パスワードは次のスクリプトでローカル入力してください。スクリプトは先にDB移行を実行し、成功してからパスワード入力へ進みます。入力中の文字は表示されません。

```powershell
.\scripts\Set-AdminPassword.ps1
```

12文字以上を2回入力します。パスワードはハッシュで保存し、以前の管理者セッションは失効します。作成・再設定の共通コマンドは次のとおりです。

```powershell
docker compose exec backend python manage.py admin --email 'admin@halcinema.example' --name 'HAL CINEMA管理者'
```

prepare-adminコマンドは、未作成の場合だけアカウントを準備します。ランダムな不明パスワードのハッシュで初期化し、元の値は保存・表示しません。既存アカウントのパスワードは変更しません。

## 作品と上映回

1. 作品ライブラリから映画を追加し、作品情報と上映期間を保存します。初期設定では上映回も同時に作成します。
2. 画像はCtrl+V、ドラッグ、ファイル選択に対応します。JPEG / PNG / WebP、5MB・20MP以下です。
3. 自動割り当ては1日3回が初期値です。登録画面で1〜6回に変更できます。手動で決めたい場合は、自動割り当てのチェックを外して保存し、上映スケジュールで作品・スクリーン・日時を指定します。
4. 一般画面の作品詳細から、この上映回の座席を予約できます。

上映開始日と終了日はどちらも上映中に含み、日本時間で判定します。未設定の既存作品は期間未設定と表示します。予約履歴がある作品・上映回は削除できません。今後の上映回がある作品の上映時間の変更は、回の終了時刻との不整合を防ぐため拒否します。同時編集は更新日時で検出します。

自動割り当ては、日本時間の今日から上映終了日まで（開始日が未来なら開始日から）、最大366日分が対象です。10:00〜23:00に上映が収まり、前後の上映との間隔が20分以上空くスクリーンを選びます。当日は現在時刻の30分後以降に開始し、3回設定では10:00・14:00・18:00を優先します。空き状況に合わせて時間やスクリーンを調整します。終了時刻は作品の上映時間から計算します。

空きが足りない場合も、映画と作成できた上映回は保存し、不足する回数を表示します。登録済みの映画には、上映スケジュール画面の「自動で割り当てる」を使えます。既存の上映回・予約を残し、各日の設定回数に足りない分だけを追加するため、同じ設定で繰り返しても二重登録しません。作品の上映期間を延ばした場合もこのボタンで追加します。

映画の新規登録と上映回・座席の準備は同じDBトランザクションで保存します。DBエラー時はまとめて取り消します。自動・手動の登録はスクリーンのロックと20分の間隔チェックを共有し、同時操作による重複を防ぎます。この機能のためのDB移行は不要です。

## 画像とバックアップ

画像はbackend/uploadsにUUID名のWebPとして保存します。DBには /api/cinema/media/... のパスだけを保存します。最大辺2400pxに縮小し、向きと形式を揃えてメタデータを除去します。Docker開発構成はbackendディレクトリをマウントするため、コンテナ再作成後も残ります。

DBのバックアップとuploadsディレクトリの両方を保管してください。今回の変更前のDBバックアップは backups/movie-before-admin-20260910.sql です。ソース管理には含めません。未使用の画像は、24時間経過後に次のコマンドで削除できます。

```powershell
docker compose exec backend python manage.py prune-uploads
```

## API

ブラウザからは同一オリジンの /api/cinema を経由します。Flask側のパスは以下です。

| メソッド / パス | 内容 |
| --- | --- |
| POST /api/admin/login, /logout | ログイン・ログアウト |
| GET /api/admin/session | セッションとADMIN権限の検証 |
| GET /api/admin/movies | 管理者の映画一覧 |
| GET /api/admin/movies/:id | 映画の詳細と上映回 |
| POST /api/admin/movies | 映画と上映回の登録（auto_scheduleは省略時true、daily_showingsは省略時3） |
| POST /api/admin/movies/:id/auto-schedule | 設定回数に足りない上映回の追加（daily_showings: 1〜6） |
| PUT /api/admin/movies/:id | 更新日時付きの更新 |
| DELETE /api/admin/movies/:id | 更新日時付きの削除 |
| POST /api/admin/uploads | 画像検証・保存 |
| GET /api/admin/operations | スクリーン・上映回・直近100予約 |
| POST /api/admin/showings | 上映回登録 |
| DELETE /api/admin/showings/:id | 予約のない上映回の削除 |
| GET /api/movies, /api/movies/:id | 一般画面の作品情報 |
| GET /api/screenings/:id | 実座席・予約状況・DBの券種 |
| GET /api/media/:filename | 保存した画像 |

既存の予約APIはパスを維持し、DBで確認した作品・座席・券種・価格だけを購入します。クライアントの情報から映画や上映回を自動生成する旧処理を廃止しました。購入応答にはDBの注文番号・購入時の作品名・金額を追加しています。

## 公開時の設定と制約

- このCompose構成はローカル開発用です。公開時はHTTPS、適切なアプリサーバー、DBと画像の永続ストレージ・バックアップを用意してください。
- ADMIN_COOKIE_SECURE=true、ADMIN_ORIGINSには公開サイトの正確なオリジンを設定します。API_INTERNAL_URLはサーバーから接続できるFlaskのアドレスです。プロキシはブラウザのHostを保持します。
- 管理者セッションは8時間、HttpOnly / SameSite=Strict。更新時にはOriginとCSRFを検証します。ADMIN権限はリクエストごとにDBで確認します。
- 会員ログインもDBのセッションで確認します。決済サービスは未接続で、購入・返金はテスト用の支払い記録だけを更新します。決済事業者への実課金・返金やメール送信は行いません。
- YouTubeの埋め込み可否は動画側の設定とネットワークに依存します。画像の自動権利確認は行いません。
- スクリーン画面は既存設備の参照、予約画面は直近100件の参照です。日付をまたぐ上映には未対応です。

## 検証コマンド

frontendで npm run lint、npx tsc --noEmit、node --test lib/*.test.mjs、npm run build を実行します。バックエンドは python -m unittest test_reservation_api と、独立したテストDBで python -m unittest discover -s tests を実行します。test_auto_schedule.pyで自動割り当て・同時登録・失敗時のロールバック・予約への反映を確認します。

管理APIの実DBテストはADMIN_TEST_DATABASE_URLの指定が必須です。データベース名が _test で終わらない接続先は拒否します。tests/init_test_db.pyは空の専用DBを準備し、tests/seed_browser.pyは50作品の画面検証用データを作成します。テストには実運用DBを使わないでください。

## 会員の予約キャンセル

3000のマイページの予約詳細から、上映開始の1時間前までキャンセルできます。ちょうど1時間前は受付対象です。期限と判定に使う上映日時は日本時間で、サーバーがDBの上映回から確認します。上映日時が不明、期限切れ、期限失効した予約は受け付けません。

- `POST /api/login`、`POST /api/register`で会員セッションを発行し、`GET /api/member/session`で確認します。有効期限は8時間です。`POST /api/member/logout`でDBから失効させます。管理者用Cookieとは別です。
- ブラウザーは同一オリジンの`/api/cinema`経由で通信します。CookieはHttpOnly / SameSite=Strict、更新時はOriginとCSRFトークンを検証します。公開時のSecure属性は`ADMIN_COOKIE_SECURE=true`に従います。
- `GET /api/reservations`はログイン中のユーザーIDに紐づく履歴だけを返します。送信されたメールアドレスを本人確認には使いません。新しい会員予約の所有者もサーバーのセッションから決めます。
- `PATCH /api/reservations/:id/cancel`は注文行をロックし、所有者・ステータス・期限を確認します。DBの予約本体は既存の`orders`です。`order_status='cancelled'`、取消日時、`reservation_seats.released_at`、支払い済み記録の`payment_status='refunded'`を同じトランザクションで保存します。
- 再送・同時送信でも処理は重複しません。座席IDや購入時の金額・フード明細は履歴として残し、取消済み注文のフード受取案内は表示しません。
- 現在の`refund_mode`は`simulation`です。実決済を接続するときは、事業者の返金API・冪等キー・失敗や処理中からの再実行を別途実装してください。支払い記録を変えるだけで実際に返金されたことにはできません。

反映時はプロジェクトルートで`docker compose exec backend python manage.py migrate`を実行します。追加するのは会員セッション・試行回数のテーブルだけです。既存の映画・上映回・予約・支払いは変更しません。以前のブラウザー内ログイン情報は認証に使えないため、更新後に一度ログインし直してください。

`test_member_cancellation.py`で所有者確認・1時間前の境界・同時取消・座席再予約・失敗時のロールバック・セッション失効を検証します。フロントエンドは`reservationCancellation.test.mjs`で日時とAPI応答を検証します。
