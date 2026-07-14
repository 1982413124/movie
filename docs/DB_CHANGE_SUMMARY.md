# DB変更説明まとめ

## 何を変えたか
- `screens` は部屋、`showings` は上映回として分けた。
- `orders` を購入の中心にし、`reservation_seats`、`food_order_details`、`payments` を `order_id` で紐づけた。
- `reservation_seats.movie_id` を使わず、映画IDは `showings.movie_id`、履歴表示名は `movie_title_at_purchase` に寄せた。
- キャンセル用に `orders.cancelled_at`、`reservation_seats.released_at`、`payments.payment_status='refunded'` を使う形にした。
- 旧 `reservations`、`reservation_ticket_types`、`order_details`、`screenings` と、旧カラムの `reservation_id`、`screening_id`、`seat_label`、`movie_id`、`pay_*` などを移行後に削除した。
- 日時は `TIMESTAMPTZ` と `Asia/Tokyo` の接続設定で扱うようにした。

## なぜ変えたか
- DBだけを見ても、どの注文で、どの上映回のどの座席とフードを買ったか分かるようにするため。
- スクリーンと上映回を分けないと、同じ部屋で複数の上映を自然に管理できないため。
- キャンセル後に座席を空けても、購入履歴には映画、座席、券種、金額を残す必要があるため。
- 支払い状態と注文状態を分け、返金やキャンセルをあとで扱いやすくするため。

## これで何が良くなるか
- `seats`、`ticket_types`、`foods`、`movies`、`users` のマスタを参照するので、明細が孤立しない。
- `reservation_seats` から `orders`、`showings`、`seats`、`ticket_types` へ自然にたどれる。
- `food_order_details` から `orders` と `foods` へ自然にたどれる。
- 条件つきユニーク索引で、アクティブな予約だけ二重予約を防げる。
- キャンセル済みの座席は再予約できるが、履歴には残る。

## 既存機能への影響
- 予約作成APIは引き続き同じURLで動く。
- 新規注文は `order_status='paid'`、支払いは `payment_status='paid'` として保存する。
- キャンセルAPIは `orders` を `cancelled` にし、支払い済みなら `payments.payment_status` を `refunded` にする。
- キャンセル時は `reservation_seats.released_at` を入れる。座席行は削除しない。
- 購入履歴APIはキャンセル済みの座席も返す。
- 座席明細もフード明細もない古い注文は、履歴レスポンスから外す。
- 空席判定は `released_at IS NULL` かつ `orders.order_status IN ('pending', 'paid')` だけを見る。

## 実DBへの反映
- 適用前に `backups/movie-before-cancel-cleanup-20260707-153717.sql` を作成した。
- `backend/database/add_reservations.sql` をDBコンテナへコピーし、`psql -f /tmp/add_reservations.sql` で適用した。
- 適用後のテーブルは `food_order_details`、`foods`、`movies`、`orders`、`payments`、`reservation_seats`、`screens`、`seats`、`showings`、`theaters`、`ticket_types`、`users`。
- 旧 `reservations`、`reservation_ticket_types`、`order_details`、`screenings` は残っていない。
- DBのtimezoneは `Asia/Tokyo`。

## 今後のテーブル定義書修正時に反映すべきこと
- `screens` は部屋、`showings` は上映回として書く。
- `orders.order_status` は `pending`、`paid`、`cancelled`、`expired`。
- `payments.payment_status` は `unpaid`、`paid`、`failed`、`refunded`。
- `reservation_seats` は `order_id`、`showing_id`、`seat_id`、`ticket_type_id` を参照する。
- `reservation_seats.movie_id` は不要。履歴表示用に `movie_title_at_purchase` を使う。
- `reservation_seats.released_at` はキャンセルと期限切れで座席を再予約可能にするための列。
- `expired` を使う場合は `released_at` も必ず入れる。DB側の `release_reservation_seats_for_expired_order` でも補助する。
- 日時カラムは `TIMESTAMPTZ`、表示はJST前提でそろえる。