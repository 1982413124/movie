# DB設計改善メモ

## 今回の変更目的
- Fチームのレビューで出た、型名ミス、明細不足、スクリーンと上映予定の混在を直すために見直した。
- 予約座席とフード明細が、フロントの静的データだけではなくDBマスタを参照する形にした。
- 実DBへ流す前の安全確認として、金額計算と座席整合性をAPI側でも確認するようにした。

## 変更前の主な問題点
- 問題点：`screenings` にスクリーン名、座席数、上映日、開始時刻が混ざっていた。
- なぜ問題だったか：スクリーンは部屋、上映日は上映回の情報なので、同じテーブルに置くと部屋情報が重複する。

- 問題点：予約座席とフード明細が、`seats`、`ticket_types`、`foods` などのマスタを強く参照していなかった。
- なぜ問題だったか：購入履歴や管理者画面を作るときに、何を正しい商品、券種、座席として扱うのか分かりにくい。

- 問題点：フロントから送られた金額を、そのまま保存できる余地があった。
- なぜ問題だったか：価格はユーザーが触れるリクエスト値ではなく、DBの券種マスタとフードマスタから決める必要がある。

## 変更後の方針
- 方針：DBのマスタを正本にする。
- 意図：`movies`、`screens`、`showings`、`seats`、`ticket_types`、`foods`、`users` を先に見て、明細はそのIDを参照する。

- 方針：`ensure_purchase_masters` は暫定処理として扱う。
- 意図：今はフロントが静的データ中心なので、開発中の互換用に最小マスタを補う。ただし既存マスタは上書きしない。本来はseedか管理者画面から登録する。将来的にはこの処理を予約APIから外す。

- 方針：最新の `reservation_seats` には `movie_id` を持たせない。
- 意図：映画IDは `reservation_seats.showing_id` から `showings.movie_id` をたどれば分かる。予約明細には `movie_title_at_purchase` だけを残し、履歴表示用のスナップショットとして扱う。

- 方針：金額はサーバー側で計算する。
- 意図：`ticket_type_id` から `ticket_types.current_price`、`food_id` から `foods.current_price` を読み、`price_at_purchase`、`unit_price`、`subtotal`、`orders.total_amount`、`payments.payment_amount` をAPI側で計算する。

- 方針：座席と上映回の整合性をAPIでも確認する。
- 意図：`showing_id` が存在すること、`seat_id` が存在すること、さらに `seats.screen_id` と `showings.screen_id` が一致することを確認する。一致しない場合は予約を保存しない。

## 主要テーブルの役割

### users
- 役割：ログインユーザーを表す。
- 主なカラム：`id`、`name`、`email`、`password`、`created_at`、`updated_at`
- 他テーブルとの関係：`orders.user_id` から参照される。

### movies
- 役割：映画のマスタ。
- 主なカラム：`id`、`title`、`genre`、`duration_minutes`、`age_rating`、`synopsis`、`poster_image`、`release_date`
- 他テーブルとの関係：`showings.movie_id` から参照される。

### screens
- 役割：映画館のスクリーンという部屋を表す。
- 主なカラム：`id`、`theater_id`、`name`、`seat_count`、`description`
- 他テーブルとの関係：`theaters` に属し、`showings.screen_id` と `seats.screen_id` から参照される。

### showings
- 役割：どの映画を、どのスクリーンで、いつ上映するかを表す。
- 主なカラム：`id`、`movie_id`、`screen_id`、`show_date`、`start_time`、`end_time`
- 他テーブルとの関係：`movies` と `screens` を参照する。`reservation_seats.showing_id` から参照される。

### seats
- 役割：スクリーン内の座席マスタ。
- 主なカラム：`id`、`screen_id`、`row_name`、`seat_number`、`seat_label`
- 他テーブルとの関係：`screens` に属し、`reservation_seats.seat_id` から参照される。

### ticket_types
- 役割：一般、学生、子供などの券種マスタ。
- 主なカラム：`id`、`label`、`current_price`
- 他テーブルとの関係：`reservation_seats.ticket_type_id` から参照される。

### foods
- 役割：フード商品のマスタ。
- 主なカラム：`id`、`name`、`category`、`current_price`、`is_active`
- 他テーブルとの関係：`food_order_details.food_id` から参照される。

### orders
- 役割：ユーザーの1回の購入全体を表す。
- 主なカラム：`id`、`user_id`、`user_email`、`order_num`、`total_amount`、`order_status`
- 他テーブルとの関係：`reservation_seats`、`food_order_details`、`payments` が `order_id` で紐づく。

### reservation_seats
- 役割：注文に含まれる予約座席を表す。
- 主なカラム：`id`、`order_id`、`showing_id`、`seat_id`、`movie_title_at_purchase`、`ticket_type_id`、`ticket_type_label`、`price_at_purchase`、`released_at`
- 他テーブルとの関係：`orders`、`showings`、`seats`、`ticket_types` を参照する。
- 意図：映画IDは `showings` から取る。明細には購入時点の映画タイトルと券種名、価格だけを履歴用に残す。

### food_order_details
- 役割：注文に含まれるフード明細を表す。
- 主なカラム：`id`、`order_id`、`food_id`、`name`、`quantity`、`unit_price`、`subtotal`
- 他テーブルとの関係：`orders` と `foods` を参照する。

### payments
- 役割：注文に対する支払い情報を表す。
- 主なカラム：`id`、`order_id`、`payment_method`、`payment_amount`、`payment_status`、`paid_at`
- 他テーブルとの関係：`orders` に属する。

## 追加した制約と理由
- 制約：`fk_orders_user`
- 対象：`orders`
- 理由：存在しないユーザーIDを注文に入れない。

- 制約：`fk_reservation_seats_showing`、`fk_reservation_seats_seat`、`fk_reservation_seats_ticket_type`
- 対象：`reservation_seats`
- 理由：存在しない上映回、座席、券種を予約明細に入れない。

- 制約：`fk_food_order_details_food`
- 対象：`food_order_details`
- 理由：存在しないフード商品を明細に入れない。

- 制約：`uq_reservation_seats_showing_seat_active`
- 対象：`reservation_seats`
- 理由：同じ上映回で同じ座席を二重予約できないようにする。PostgreSQLの条件つきユニーク索引として `WHERE released_at IS NULL` を使う。

- 制約：金額と数量のCHECK制約
- 対象：`orders`、`reservation_seats`、`food_order_details`、`payments`
- 理由：負の金額や0個以下のフード明細を入れない。

## トランザクション
- 予約APIは、`orders`、`reservation_seats`、`food_order_details`、`payments` の作成を1つのDB接続コンテキスト内で実行する。
- 途中で例外が出た場合、psycopgの接続コンテキストがロールバックする。
- テストでは、フード明細挿入で例外を起こした場合にロールバック扱いになることを確認している。

## 既存データの移行
- `backend/database/add_reservations.sql` は、既存DBを壊しにくいようにカラム追加と `NOT VALID` のFK追加を使う。
- 最新定義の `reservation_seats` には `movie_id` を置かない。既存DBに古い `movie_id` 列が残っている場合もAPIでは使わず、既存制約 `fk_reservation_seats_movie` は外す。
- 実DBでは旧テーブルの `movies.id`、`seats.id`、`screenings.movie_id` が `integer` だったため、migration で `VARCHAR` に寄せる。これをしないと `showings.movie_id` や `reservation_seats.seat_id` のFKで型が合わない。
- 旧 `seats` は上映回ごとの座席に近い形だったので、`screen_id` と `seat_number` を追加し、旧 `screening_id` と `col_num` の `NOT NULL` は外す。新しい予約APIが座席マスタとして使えるようにする。
- `movie_title_at_purchase` は、`showings` と `movies` から埋められる範囲で補完する。
- 古いデータまで完全に検証するには、IDの不整合を直してから `VALIDATE CONSTRAINT` を実行する。

## 他メンバーへ説明するときの要点
- `screens` は部屋、`showings` は上映回。
- 予約明細に映画IDは持たせない。映画IDは `showings.movie_id` が正本。
- `reservation_seats.movie_title_at_purchase` は履歴表示用の控え。
- フロントから送られた金額は信用せず、APIがDBマスタ価格で計算する。
- `seats.screen_id` と `showings.screen_id` が合わない予約は保存しない。
- `ensure_purchase_masters` は暫定処理。seedか管理者画面登録へ移したら外す。