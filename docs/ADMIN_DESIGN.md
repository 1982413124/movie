# 映画管理システム

Next.js 16 / React 19 / Flask / PostgreSQL / psycopgを継続使用。管理画面は `/admin/login` から入り、一般画面にはリンクを置かない。

## 設計

- DBのmoviesを全画面の作品データ源とする。既存の映画IDと購入履歴は維持する。
- users.roleはUSERが初期値。ADMINだけが管理者用APIを利用できる。
- 管理者セッションはランダムなトークンをHttpOnly / SameSite=Strict Cookieで保持し、DBにはトークンのSHA-256を保存。有効期限は8時間。毎回DBの権限を確認する。
- Next.jsの管理ページでもセッションを検証し、同一オリジンのAPI経由でFlaskに接続する。更新操作はOriginとCSRFトークンを検証する。
- 上映状態は日本時間の上映期間から算出する。既存の期間未登録作品は「期間未設定」と表示し、日付を捏造しない。
- 画像は5MB / 20MPを上限に内容をデコードして検証し、メタデータを除いてWebPに変換する。画像ファイルは永続ディレクトリへ保存し、DBにはパスだけを保存する。
- 更新日時による競合検出で別のスタッフの編集を上書きしない。予約履歴のある映画と上映回は削除を拒否する。
- 上映回はDBへ登録し、同じスクリーンの時間重複をロック付きで検査する。新しい作品からも座席選択・購入へ進める。

## UI

炭色のサイドバーと明るい作業領域を使い、ポスター、作品名、上映状態、期間を一覧で読める構成にする。登録画面は情報をグループ化し、右側に入力中の内容を表示する。狭い画面では1カラムに切り替える。

参考にした構成: [Linear](https://linear.app/features)、[Stripeのサイドバーと作品管理](https://docs.stripe.com/dashboard/basics)、[MUBI](https://mubi.com/)。画像と管理情報の優先順位を参考にし、レイアウトは本アプリ用に作成。

セッションとCSRF: [Flaskのセキュリティガイド](https://flask.palletsprojects.com/en/stable/web-security/)。埋め込み: [YouTube公式プレイヤー](https://developers.google.com/youtube/player_parameters)。

## 検証

DBバックアップ後、独立したテストDBで認証・CRUD・競合・画像・上映・予約履歴保護を確認する。ブラウザで登録、貼り付け、編集、削除、一般公開と座席選択を操作し、1920 / 1366 / 768pxで確認する。frontendのlint、型検査、Nodeテスト、build、backendのunittestを実施する。
