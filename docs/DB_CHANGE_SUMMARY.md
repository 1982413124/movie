# DB変更説明まとめ

## 何を変えたか
- `screens` は部屋、`showings` は上映回として分けた。
- `orders` を購入の中心にし、座席明細、フード明細、支払いを紐づけた。
- `reservation_seats` は `orders`、`showings`、`seats`、`ticket_types` を参照する形にした。
- `food_order_details` は `orders` と `foods` を参照する形にした。
- 最新の `reservation_seats` から `movie_id` を外した。
- 映画IDは `showings.movie_id` から取り、履歴表示用に `reservation_seats.movie_title_at_purchase` を持たせた。

## なぜ変えたか
- フロントの静的データだけを正にすると、DBから購入履歴や管理者画面を組み立てにくい。
- 予約座席は、実在する上映回、座席、券種を指している必要がある。
- フード明細は、実在するフード商品を指している必要がある。
- 金額はリクエスト値ではなく、DBマスタの価格から計算する必要がある。

## これで何が良くなるか
- DBだけを見ても、どの注文で、どの上映回のどの座席を、どの券種で買ったか分かる。
- フード注文も商品マスタへつながるので、商品別の売上集計に使いやすい。
- `seats.screen_id` と `showings.screen_id` が合わない予約をAPI側で止められる。
- `orders.total_amount` と `payments.payment_amount` がサーバー計算になり、フロント改ざんに引きずられにくくなる。

## 既存機能への影響
- フロントが呼ぶURLは変えていない。
- 予約確定APIは、同じ流れのまま `orders`、`reservation_seats`、`food_order_details`、`payments` に保存する。
- `ensure_purchase_masters` は暫定処理として残す。既存マスタは上書きしない。
- 将来的には、映画、上映回、座席、券種、フードはseedまたは管理者画面から登録し、予約APIでマスタを作らない形にする。

## 実DBへ流す前の注意
- このプロジェクトのDBは `docker-compose.yml` 上では PostgreSQL 16。
- `UNIQUE(showing_id, seat_id) WHERE released_at IS NULL` はPostgreSQLの条件つきユニーク索引として使う。
- MySQLで同じことをする場合は別の実装が必要。SQLiteでもバージョンと構文確認が必要。
- `backend/database/add_reservations.sql` は古い `movie_id` 列をすぐ消さず、`movie_title_at_purchase` を追加し、既存の `fk_reservation_seats_movie` を外す。
- 既存DBでは `movies.id` と `seats.id` が `integer` だったため、migration で新しい文字列IDの設計に合わせる。
- 旧 `seats` に残っている `screening_id` と `col_num` は、新しい予約APIの挿入を邪魔しないよう `NOT NULL` を外す。

## 今後のテーブル定義書修正時に反映すべきこと
- `screens` は部屋、`showings` は上映回として書く。
- `seats`、`ticket_types`、`foods`、`movies`、`users` はマスタとして扱う。
- `reservation_seats` は `order_id`、`showing_id`、`seat_id`、`ticket_type_id` にFKを持つ。
- `food_order_details` は `order_id` と `food_id` にFKを持つ。
- `reservation_seats.movie_title_at_purchase` は履歴表示用のスナップショット。
- `reservation_seats.price_at_purchase` と `food_order_details.unit_price` は、購入時点の金額として残す。
- `orders.order_status` は `pending`、`confirmed`、`cancelled`。
- `payments.payment_status` は `unpaid`、`paid`、`failed`、`refunded`。
