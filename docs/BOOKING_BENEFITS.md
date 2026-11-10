# 予約メール・クーポン・ポイント

3000番ポートの公開画面に対応する機能です。公開画面は WSL の `/home/sm787/Github-Projects/movie/frontend`、稼働中のAPIとDBは Windows の `C:\Users\sm787\GitHub-Projects\movie` の Docker Compose を使用します。管理画面は `/admin/coupons`、ポイント履歴はマイページの「ポイント」から開きます。

2026-09-14に両方のソースをこのリポジトリへ統合しました。新しく取得する場合は、[README](../README.md)の手順で同じチェックアウトから画面とAPIを起動できます。以下のWindowsパスは、既存のローカル環境で設定を変更する場所です。

## 料金とポイント

- チケットとフードの単価をDBから取得し、サーバーで合計を計算します。
- クーポンは1予約につき1コード。固定額または1〜100%の割合割引で、割合の1円未満は切り捨てます。割引額は合計金額を超えません。
- コードは3〜40文字の半角英数字・ハイフン・アンダースコア。前後の空白を除き、大文字に統一します。
- 利用開始日時は任意、有効期限は必須。開始日時を含み、有効期限以降は使用できません。判定はサーバーで行います。
- クーポン適用後に1ポイント＝1円で値引きします。利用可能残高と残額を超えるポイントは受け付けません。
- 最終支払額100円につき1ポイント付与します。100円未満は切り捨て、0円決済では付与しません。
- ポイント付与・利用はログイン会員のみ。セッションのユーザーIDを使い、送信されたメールアドレスで会員を選びません。
- キャンセル期限は従来どおり上映開始の1時間前です。所有者・期限をサーバーで確認し、予約取消、座席解放、テスト決済の返金記録、獲得ポイント取消、使用ポイント返還、メール送信待ちの保存を同じトランザクションで処理します。
- キャンセルを再送しても、ポイントや返金記録を二重に戻しません。
- 獲得分を別の予約で使い切った後に元の予約をキャンセルすると、残高が負数になる場合があります。利用可能ポイントは0とし、以降の獲得分で相殺します。取消分を切り捨てません。
- 既存予約には過去分のポイント付与・メール送信を行いません。割引前金額は従来の支払額を引き継ぎます。
- 決済は既存のテスト決済のままです。実際のカード請求・金融機関への返金APIは追加していません。

## DBとAPI

`backend/database/booking_benefits_migration.sql` を `python manage.py migrate` で適用します。何度実行しても既存予約・ポイント・クーポンを初期化しません。

| 保存先 | 用途 |
| --- | --- |
| `coupons` | コード、名称、割引方式・値、開始・期限、利用可否 |
| `orders` の追加列 | `subtotal_amount`、`coupon_id`、`coupon_code`、`coupon_discount_amount`、`points_used`、`points_earned` |
| `orders.total_amount` / `payments.payment_amount` | 割引後の最終支払額。既存集計もこの値を使用 |
| `point_accounts` | 会員の残高。利用時は行ロックで同時利用を直列化 |
| `point_transactions` | `EARN`、`USE`、`EARN_REVERSED`、`USE_RETURNED`、増減・更新後残高・予約番号 |
| `reservation_email_outbox` | 予約単位・イベント単位の送信待ち、送信済み、試行回数、次回試行日時 |

| API | 内容 |
| --- | --- |
| `POST /api/reservations/quote` | 既存の予約入力と `coupon_code` / `points_to_use` から料金を確認。保存・座席確保はしない |
| `POST /api/reservations` | 上記と `expected_total` を再検証して確定。料金が変わった場合は409で再確認を求める |
| `GET /api/reservations` | 購入時の料金・割引・ポイント情報を含む本人の履歴 |
| `PATCH /api/reservations/:id/cancel` | 本人の予約を取消。ポイントとメール送信待ちも更新 |
| `GET /api/member/points` | 本人の残高・履歴。`limit` は最大50、`before` で続きを取得 |
| `GET /api/admin/coupons` | 管理者の一覧 |
| `POST /api/admin/coupons` | 管理者による作成 |
| `PUT /api/admin/coupons/:id` | 管理者による編集・無効化。取得時の `updated_at` を指定し、同時更新は409 |

会員・管理者の更新APIは既存のCookieセッションとCSRF検証を使用します。3000側からは既存の `/api/cinema/` プロキシを経由します。クーポン変更後も既存予約の金額やコード表記は変えません。

## メール設定（Resend API）

予約確認・キャンセル完了メールは、Resend APIから送信します。本文、件名、宛先、約10秒ごとの送信と失敗時の再送は従来どおりです。Googleのアプリパスワードや `SMTP_*` の設定は使用しません。

1. [ResendのDomains画面](https://resend.com/domains)に、自分で管理する送信元ドメインを追加します。表示されたDNSレコードをドメインの管理画面に登録し、認証完了を確認します。詳しくは[ドメイン認証の手順](https://resend.com/docs/dashboard/domains/introduction)を参照してください。
2. [API Keys画面](https://resend.com/api-keys)で、送信用のAPIキーを作ります。メール送信の権限があり、手順1のドメインに送信できるキーを使います。
3. Windows側の `C:\Users\sm787\GitHub-Projects\movie\.env` に、次の3項目を設定します。既にある項目は書き換えてください。

```dotenv
MAIL_ENABLED=true
MAIL_FROM_ADDRESS=no-reply@自分の認証済みドメイン
RESEND_API_KEY=Resendで発行したAPIキー
```

`MAIL_FROM_ADDRESS` はメールアドレスだけを指定します。Gmailのアドレスをそのまま送信元にはできません。`onboarding@resend.dev` はテスト用で、送信先はResendアカウントに登録した自分のアドレスに制限されます。一般ユーザーへ送るには、自分のドメインの認証が必要です。[Resendの説明](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)

APIキーは `.env` に保存し、メール送信用コンテナだけに渡します。`.env` はGit対象外です。キーをチャットやリポジトリに貼ったり、`NEXT_PUBLIC_` 付きの変数に入れたりしないでください。`.env.example` は空欄の設定例です。

4. Docker Desktopを起動し、PowerShellで次を実行します。既存環境では今回の送信方式の変更にDBマイグレーションは不要です。

```powershell
cd C:\Users\sm787\GitHub-Projects\movie
docker compose up -d --build --force-recreate mail-worker
```

`.env` を変更した後もこのコマンドで反映できます。単にコンテナを再起動するだけでは環境変数は更新されません。

5. 自分で受信できるメールアドレスの会員で予約し、予約確認メールを確認します。キャンセルするとキャンセル完了メールが届きます。ResendのEmails画面でも受付・配信状況を確認できます。

メールは約10秒ごとに送信します。`MAIL_ENABLED=false` の間も送信待ちを保存し、有効化したら未送信分を順に送ります。初回有効化時は、溜まっている送信待ちも送信対象になります。現在のローカル構成ではPCとDockerの起動中に動きます。

送信状況を調べる場合は、Windows側プロジェクトルートで次を実行します。

```powershell
docker compose logs --tail 50 mail-worker
```

`ResendHTTP401` / `ResendHTTP403` が続く場合はAPIキーの権限、送信元ドメインの認証、テスト用送信元の宛先制限を確認してください。`ResendHTTP429` は送信制限、`TimeoutError` は応答待ちの時間切れです。設定を直すと、次回の再送時刻に再試行します。

手動で送信待ちを処理する場合は `docker compose exec mail-worker python manage.py send-emails` も使えます。このコマンドは実際にメールを送信するため、通常の動作確認には上記のログとResend画面を使ってください。

送信先は会員の場合は登録メールアドレス、ゲストの場合は確認画面で入力した `contact_email` です。旧API互換のためメールアドレス未指定のゲスト予約は維持しますが、送信先がない予約のメールは作成しません。ゲスト予約を会員アカウントに自動で関連付けることはありません。

本文には作品名、上映日時（日本時間）、スクリーン、座席、予約番号、フード、割引前金額、割引・ポイント利用、支払額を記載します。取消メールには返還・取消ポイントと返金対象額を記載します。

失敗時は30秒から最大1時間の間隔で再試行し、予約結果は変えません。同じ予約では確認メールの後に取消メールを送ります。送信元・APIキーが未設定なら、送信待ちを維持して設定を待ちます。複数ワーカーの同時送信は行ロックで防ぎ、再送でも同じ `Idempotency-Key` とMessage-IDを使います。Resendが重複を防ぐ期間は24時間で、それを超える未確定の再送に完全な重複防止は保証されません。[Resendの仕様](https://resend.com/docs/dashboard/emails/idempotency-keys)

DBの送信済みは、Resend APIがメールIDを返して受付が完了した状態です。受信箱への到着はResendの配信状況で確認してください。APIキー・本文・宛先・APIのエラー本文はログに出しません。

## 確認方法

テストは末尾 `_test` の専用PostgreSQL DBで実行します。`backend/tests/init_test_db.py` が初期スキーマと機能の追加列を用意します。

```sh
python tests/init_test_db.py
python manage.py migrate
python -m unittest discover -s tests
python -m unittest test_reservation_api
```

このコマンドの `DATABASE_URL` と `ADMIN_TEST_DATABASE_URL` は専用テストDBを指定してください。通常のDBにはテストデータを作らないでください。`test_booking_benefits.py` はResend APIの代わりにローカルHTTPサーバーを使い、本文・再試行・送信順・受付後の接続断からの復旧を確認します。`test_reservation_mail.py` は認証ヘッダー、TLS設定、APIエラー、不正な応答、タイムアウト、送信無効時を確認します。外部への送信や実APIキーは使用しません。
