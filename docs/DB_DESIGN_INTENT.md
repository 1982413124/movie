# DB設計改善メモ

## 今回の変更目的
- Fチームのレビューで指摘された型名ミス、明細不足、スクリーン情報と上映予定の混在を直す。
- 購入履歴、予約詳細、管理者画面をDBから組み立てられる形にする。
- キャンセル後も購入履歴を残しつつ、同じ座席を再予約できるようにする。

## 変更前の主な問題点
- 問題点：`screenings` にスクリーン名、座席数、上映日、開始時刻が混ざっていた。
- なぜ問題だったか：スクリーンは部屋、上映日は上映回の情報なので、同じテーブルに置くと部屋情報が重複する。

- 問題点：旧 `order_details` は何を注文した明細なのか判断しにくかった。
- なぜ問題だったか：座席予約とフード注文を同じ明細で扱うと、映画チケット、座席、フード、支払いを自然にたどれない。

- 問題点：`reservation_seats` に `reservation_id`、`screening_id`、`seat_label`、`movie_id` が残り、新しい `orders` 中心の構造と二重になっていた。
- なぜ問題だったか：最新APIは `order_id`、`showing_id`、`seat_id` を使うため、古い列が残るとどちらを正とするか分かりにくい。

- 問題点：キャンセル時に座席情報を消す設計だと、購入履歴から座席や上映回を確認できなくなる。
- なぜ問題だったか：キャンセル済みでも、ユーザーには何を予約していたかを見せる必要がある。

## 変更後の設計方針
- 方針：`screens` は部屋、`showings` は上映回として分ける。
- 意図：同じスクリーンで、別の映画や別の時間帯の上映を管理できるようにする。

- 方針：`orders` を購入の親にする。
- 意図：座席予約、フード明細、支払いを1つの注文として扱う。映画チケットだけ、映画チケットとフード、どちらの購入にも対応できる。

- 方針：`reservation_seats` は `movie_id` を持たない。
- 意図：映画IDは `reservation_seats.showing_id` から `showings.movie_id` をたどる。履歴表示用には `movie_title_at_purchase` を残す。

- 方針：キャンセルは座席行を消さず、`released_at` を入れる。
- 意図：購入履歴には座席を残し、空席判定では `released_at IS NULL` かつ `orders.order_status IN ('pending', 'paid')` の座席だけを予約済みとして扱う。

- 方針：支払い済み注文をキャンセルしたら `payments.payment_status` を `refunded` にする。
- 意図：現状は外部決済連携がないため、アプリ上のキャンセル完了と同時に返金済みとして扱う。未払いや支払い失敗の注文は返金対象ではないので、その状態は変えない。

- 方針：`expired` を使う注文では `reservation_seats.released_at` も必ず入れる。
- 意図：条件つきユニーク索引は `released_at IS NULL` を見るため、期限切れ注文が座席を塞ぎ続けないようにする。

- 方針：日時は `TIMESTAMPTZ` とDB接続の `timezone=Asia/Tokyo` で扱う。
- 意図：保存値を単純に9時間足すのではなく、PostgreSQLのタイムゾーン変換で日本時間として表示する。

## 主要テーブルの役割

### users
- 役割：ログインユーザーを表す。
- 主なカラム：`id`、`name`、`email`、`password`、`created_at`、`updated_at`
- 他テーブルとの関係：`orders.user_id` から参照される。
- 設計意図：購入履歴をユーザー単位で取得できるようにする。

### movies
- 役割：映画のマスタ。
- 主なカラム：`id`、`title`、`genre`、`duration_minutes`、`age_rating`、`synopsis`、`poster_image`、`release_date`
- 他テーブルとの関係：`showings.movie_id` から参照される。
- 設計意図：上映回や予約明細に映画情報を直接重複させない。

### screens
- 役割：映画館のスクリーンという部屋を表す。
- 主なカラム：`id`、`theater_id`、`name`、`seat_count`、`description`
- 他テーブルとの関係：`theaters` に属し、`showings.screen_id` と `seats.screen_id` から参照される。
- 設計意図：上映日や開始時刻を持たせず、部屋の情報だけを管理する。

### showings
- 役割：どの映画を、どのスクリーンで、いつ上映するかを表す。
- 主なカラム：`id`、`movie_id`、`screen_id`、`show_date`、`start_time`、`end_time`
- 他テーブルとの関係：`movies` と `screens` を参照し、`reservation_seats.showing_id` から参照される。
- 設計意図：上映回ごとに変わる日付と時間をここへ寄せる。

### seats
- 役割：スクリーン内の座席マスタ。
- 主なカラム：`id`、`screen_id`、`row_name`、`seat_number`、`seat_label`
- 他テーブルとの関係：`screens` に属し、`reservation_seats.seat_id` から参照される。
- 設計意図：座席そのものはスクリーンに属する固定情報として扱う。

### ticket_types
- 役割：一般、学生、子供などの券種マスタ。
- 主なカラム：`id`、`label`、`current_price`
- 他テーブルとの関係：`reservation_seats.ticket_type_id` から参照される。
- 設計意図：購入時の券種と価格をDB側で決める。

### foods
- 役割：フード商品のマスタ。
- 主なカラム：`id`、`name`、`category`、`current_price`、`is_active`
- 他テーブルとの関係：`food_order_details.food_id` から参照される。
- 設計意図：フード明細から実在する商品へたどれるようにする。

### orders
- 役割：ユーザーの1回の購入全体を表す。
- 主なカラム：`id`、`user_id`、`user_email`、`order_num`、`total_amount`、`order_status`、`cancelled_at`
- 他テーブルとの関係：`reservation_seats`、`food_order_details`、`payments` が `order_id` で紐づく。
- 設計意図：購入単位で状態と合計金額を管理する。状態は `pending`、`paid`、`cancelled`、`expired` に絞る。

### reservation_seats
- 役割：注文に含まれる予約座席を表す。
- 主なカラム：`id`、`order_id`、`showing_id`、`seat_id`、`movie_title_at_purchase`、`screen_name`、`showing_time`、`ticket_type_id`、`ticket_type_label`、`price_at_purchase`、`released_at`
- 他テーブルとの関係：`orders`、`showings`、`seats`、`ticket_types` を参照する。
- 設計意図：購入時点の映画タイトル、スクリーン名、上映時間、券種名、価格を履歴用に残す。キャンセルしても行は残し、座席解放は `released_at` で表す。

### food_order_details
- 役割：注文に含まれるフード明細を表す。
- 主なカラム：`id`、`order_id`、`food_id`、`name`、`quantity`、`unit_price`、`subtotal`
- 他テーブルとの関係：`orders` と `foods` を参照する。
- 設計意図：商品マスタを参照しながら、購入時点の商品名と単価を残す。

### payments
- 役割：注文に対する支払い情報を表す。
- 主なカラム：`id`、`order_id`、`payment_method`、`payment_amount`、`payment_status`、`paid_at`
- 他テーブルとの関係：`orders` に属する。
- 設計意図：注文状態と支払い状態を分ける。支払い状態は `unpaid`、`paid`、`failed`、`refunded` で管理する。支払い済み注文のキャンセルは `refunded` にする。

## 追加した制約と理由
- 制約：`fk_showings_movie`、`fk_showings_screen`
- 対象テーブル：`showings`
- 防ぎたい問題：存在しない映画やスクリーンの上映回を作ること。
- 設計意図：上映回は映画と部屋の組み合わせとして保存する。

- 制約：`fk_reservation_seats_order`、`fk_reservation_seats_showing`、`fk_reservation_seats_seat`、`fk_reservation_seats_ticket_type`
- 対象テーブル：`reservation_seats`
- 防ぎたい問題：存在しない注文、上映回、座席、券種を予約明細に入れること。
- 設計意図：予約明細からマスタを自然にたどれるようにする。

- 制約：`uq_reservation_seats_showing_seat_active`
- 対象テーブル：`reservation_seats`
- 防ぎたい問題：同じ上映回で同じ座席を二重に予約すること。
- 設計意図：PostgreSQLの条件つきユニーク索引で `WHERE released_at IS NULL` を使う。キャンセル済みの座席は履歴に残しつつ、再予約できる。

- 制約：金額と数量のCHECK制約
- 対象テーブル：`orders`、`reservation_seats`、`food_order_details`、`payments`
- 防ぎたい問題：負の金額や0個以下のフード明細を保存すること。
- 設計意図：APIのバグや不正な値が入ってもDB側で止める。

- 制約：`chk_orders_status`、`chk_payments_status`
- 対象テーブル：`orders`、`payments`
- 防ぎたい問題：画面やAPIが想定していない状態値を保存すること。
- 設計意図：注文状態と支払い状態を分け、キャンセルや返金をあとから扱いやすくする。

## 旧テーブルと旧カラムの扱い
- 旧 `reservations` は `orders` へ `LEGACY-RES-*` として移した。
- 旧 `reservation_ticket_types` は `ticket_types` へ移した。
- 旧 `reservation_seats.reservation_id`、`screening_id`、`seat_label`、`movie_id` は、`order_id`、`showing_id`、`seat_id`、`movie_title_at_purchase` へ移せた場合だけ削除する。
- 旧 `order_details` は空なら削除する。現在の注文明細は `reservation_seats` と `food_order_details` に分ける。
- 旧 `screenings` は空なら削除する。上映回は `showings` に寄せる。
- 旧 `orders.pay_datetime`、`orders.total_price`、`payments.pay_method`、`payments.pay_num`、`payments.pay_status` は、新カラムへ移したあと削除する。

## キャンセルと購入履歴
- 予約キャンセル時は `orders.order_status` を `cancelled` にし、`orders.cancelled_at` を入れる。
- 支払い済みの `payments.payment_status` は `refunded` にする。未払いや失敗は返金対象ではないため変えない。
- `reservation_seats` の `order_id`、`showing_id`、`seat_id`、`movie_title_at_purchase` は消さない。
- 座席を空けるときは `reservation_seats.released_at` を入れる。
- `expired` にした注文も座席を空ける。DB側にも `release_reservation_seats_for_expired_order` を置き、直接 `orders.order_status` を更新しても `released_at` が入るようにする。
- 購入履歴はキャンセル済みの `reservation_seats` も読む。空席判定だけが `released_at IS NULL` と `pending`、`paid` を見る。
- 座席明細もフード明細もない古い注文は、詳細画面へ進めないため履歴レスポンスから外す。

## 日時の扱い
- DDLとmigrationでは日時カラムを `TIMESTAMPTZ` に寄せた。
- DBのtimezoneは `Asia/Tokyo` に設定する。
- PythonのDB接続も `options='-c timezone=Asia/Tokyo'` を渡す。
- 旧 `timestamp without time zone` はUTCだった前提で `TIMESTAMPTZ` に変換する。表示だけ日本時間にするためで、単純な+9時間の補正はしない。

## 将来的に追加しやすくなる機能
- 管理者画面から映画、上映回、座席、券種、フードを登録する。
- マイページで購入履歴と予約履歴を行き来する。
- 予約詳細で映画情報、座席表、購入フードを表示する。
- QRコードチケット、残席確認、売上集計、キャンセル、返金、クーポンを追加する。

## 他メンバーへ説明するときの要点
- `screens` は部屋、`showings` は上映回。
- `orders` を親にして、座席明細、フード明細、支払いを紐づけた。
- `reservation_seats.movie_id` はやめた。映画IDは `showings.movie_id`、履歴の表示名は `movie_title_at_purchase`。
- 二重予約は `uq_reservation_seats_showing_seat_active` で止める。
- キャンセルは履歴を消さず、`released_at` で座席だけ解放する。
- 金額はDBマスタからサーバー側で計算し、購入時点の金額を明細へ残す。