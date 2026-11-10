# Design QA: 会員エリア切替と予約情報の分離

## 対象

- 仕様: `/mnt/c/Users/sm787/OneDrive/デスクトップ/HAL_CINEMA_会員エリア切替_QR一本化_Codexプロンプト.md`
- 参考画像1: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-41794456-fd74-4081-b041-4b146e4db81f.png`
- 参考画像2: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-c32ce058-1635-47ba-99ee-2ff12a4106e5.png`
- 実装: `frontend/app/components/MemberPass.tsx`
- 実装: `frontend/app/components/HomeMemberPanel.tsx`
- 実装: `frontend/app/globals.css`

ファミペイのブランド、ロゴ、バーコード、キャンペーン画像は複製していない。参考にしたのは、画面上部で会員状態を切り替える骨格、進捗の見せ方、主要機能を色とアイコンで分ける情報設計である。

## 同一ビューポート比較

- 562×1218・特典表示: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/14/019f5f68-51f5-7df0-a06b-888a7ad7d4f2/hal-cinema-member-tabs-comparison-benefits.png`
- 335×597・会員情報表示: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/14/019f5f68-51f5-7df0-a06b-888a7ad7d4f2/hal-cinema-member-tabs-comparison-profile.png`
- PC・予約あり: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/14/019f5f68-51f5-7df0-a06b-888a7ad7d4f2/hal-cinema-member-tabs-booked-desktop.png`
- モバイル・予約あり: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/14/019f5f68-51f5-7df0-a06b-888a7ad7d4f2/hal-cinema-member-tabs-booked-mobile-320.png`
- モバイル・エラー: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/14/019f5f68-51f5-7df0-a06b-888a7ad7d4f2/hal-cinema-member-tabs-error-mobile.png`
- モバイル・読み込み中: `/mnt/c/Users/sm787/.codex/visualizations/2026/07/14/019f5f68-51f5-7df0-a06b-888a7ad7d4f2/hal-cinema-member-tabs-loading-mobile.png`

ブラウザ確認用の会員・予約データは検証セッション内だけに置き、アプリやDBには保存していない。

## 比較で見つけて直した点

1. 初回はタブの選択状態が弱く、狭い画面ではラベルが3行になった。特典は金、会員情報は緑の背景・枠・下線で選択状態を示し、480px以下ではアイコンとラベルを縦積みにした。
2. 320px幅で予約件数と対象期間が途中改行した。件数と日付をそれぞれ改行不可にし、必要な場合だけ行単位で折り返すようにした。
3. モバイルの編集・ログアウトボタンが不揃いに折り返した。640px未満では1列の全幅ボタンにした。
4. 会員情報と次の予約が重複していた。会員エリアから予約概要を外し、予約カードだけが作品、日時、座席、フード、受取予定、支払い状態を持つようにした。

## 最終確認

- 1440×1000、768×1024、562×1218、390×844、335×597、320×800で横スクロールなし。
- PCは会員エリアを左、次の予約を右、ショートカットを下に配置。モバイルは会員エリア、次の予約、ショートカットの順。
- タブはPCで高さ52px、480px以下で高さ68px。左右キー、Home、End、クリックで切り替わり、`tablist`、`tab`、`tabpanel`、`aria-selected`、`aria-controls`が対応している。
- 予約なし、予約あり、読み込み中、取得エラーを確認。予約取得エラー中も会員情報タブへ切り替えられる。
- 会員情報はメールと電話をマスクし、登録日、編集、ログアウトだけを表示。生のメールと電話は表示されない。
- 会員ランク、ポイント、クーポン、会員番号、QR、バーコードは実データがないため追加していない。
- ショートカットは3件。最小サイズは320px幅で88×94px。
- すべての確認状態でブラウザコンソールエラー0件。

## 自己監査

1. 仕様・データ監査: 画面上の値を既存のアカウント・予約データだけに限定し、月次特典の支払い済み、上映月、重複注文、キャンセル・返金・未決済除外をテストと実装で照合した。
2. 情報設計監査: 参考画像との同一ビューポート比較で、上部の会員状態、進捗、主要機能への導線という骨格を確認した。ブランド固有のバーコードや販促面は持ち込んでいない。
3. 回帰・アクセシビリティ監査: 認証情報の保持、予約取得、予約カード、タブのキーボード操作、フォーカス、操作領域、読み込み・空・エラー状態を確認した。

## 検証

- `npm run lint`: 成功
- `npx tsc --noEmit`: 成功
- `node --test lib/*.test.mjs`: 84件成功
- `npm run build`: 同じ作業ツリーを隔離コピーして成功

final result: passed

---

# Design QA: 月次利用・来館・ランク特典の一覧化（2026-09-01）

## 対象

- 参考画像: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-b4adff04-e736-4194-a626-3d61697e166d.png`（963×596px）
- 会員ランク画像: `frontend/public/images/UI/Membership/` のブロンズ、シルバー、ゴールド、プラチナ
- 表示: `frontend/app/components/MemberRankPanel.tsx`
- 集計: `frontend/lib/reservationExperience.mjs`
- 予約履歴の正規化: `frontend/lib/purchaseHistoryApi.mjs`
- スタイル: `frontend/app/globals.css`

## 比較画像と表示条件

- 参考画像と最終ランクカード: `/mnt/c/Users/sm787/.codex/visualizations/2026/09/01/01a05bae-53ff-7aa1-b6f8-cffa115ee241/rank-reference-comparison-final.jpg`
- PC最終表示: `/mnt/c/Users/sm787/.codex/visualizations/2026/09/01/01a05bae-53ff-7aa1-b6f8-cffa115ee241/rank-reference-desktop-final.jpg`
- モバイル最終表示: `/mnt/c/Users/sm787/.codex/visualizations/2026/09/01/01a05bae-53ff-7aa1-b6f8-cffa115ee241/rank-reference-mobile-final.jpg`
- PC: 1280×916、devicePixelRatio 1。会員カード下端841px、横スクロールなし。
- モバイル: 390×844、devicePixelRatio 1。会員カード下端811px、横スクロールなし。
- 検証状態: 当月利用8,400円、上映済み来館2回、シルバー、ゴールドまで6,600円・1回来館。

ブラウザ確認用の予約データは検証中だけ使用し、最終コードから削除した。実装はログイン中ユーザーの予約履歴だけを集計する。

## 比較で見つけて直した点

1. P1: 初回の390×844表示では、ランク特典一覧が画面下へ約72pxはみ出した。見出し画像、タブ、次ランク欄の余白を詰め、補足文をPCだけに限定して、会員カード全体を844px内へ収めた。
2. P2: 4ランクを横4列にすると、モバイルの特典文が細かく3行以上に割れた。390pxでは2×2へ切り替え、画像と文を横並びにして文字サイズも上げた。
3. P2: 特典名が長く、一読で内容をつかみにくかった。意味を変えずに「Sドリンク1杯無料」「Mドリンク1杯無料」などへ短縮した。
4. 参考画像の構造に合わせ、現在ランク、金額と来館の2本の進捗、赤い次ランク位置、淡い黄色の次ランク欄を一つのカードにまとめた。特典一覧はユーザー要件に合わせて同じ画面内へ追加した。

## データと操作

- 利用金額は、当月に購入された支払い済み・未キャンセル・未返金予約の `totalPrice` を予約ID単位で合算する。
- 来館回数は、当月に上映開始時刻を過ぎた支払い済み予約だけを予約ID単位で数える。未来の予約は含めない。
- ランクは利用金額と来館回数の両条件で判定し、ブロンズ、シルバー、ゴールド、プラチナの基準と特典を一つの設定へまとめた。
- 金額と来館の進捗は別々の `progressbar` とし、日本語の `aria-label`、現在値、最大値を設定した。
- ランク・特典と会員情報はクリックと左右キーで切り替わり、`aria-selected` と表示中の `tabpanel` が一致する。
- 6点のランク画像はすべて読み込み済みで、表示崩れなし。
- 最終再読込後のブラウザログは開発用info/logのみで、warning・errorは0件。

## 自己監査

1. データ監査: 購入月と上映月を分け、重複予約、未決済、キャンセル、返金、未来上映をテストした。表示専用の別ルールは作っていない。
2. 視覚監査: 参考画像と実装を同じ比較画像に置き、情報の順序、メダル比率、進捗色、目標位置、次ランク欄を見直した。
3. レスポンシブ監査: PCと390px幅を実測し、会員カード下端と横幅を確認した。モバイルは特典までスクロールなしで読める。
4. 回帰監査: 会員情報タブ、次回予約、ショートカットを残し、全テスト、型、Lint、本番ビルドを通した。

## 検証

- `node --test lib/*.test.mjs`: 87件成功
- `npx tsc --noEmit`: 成功
- `npm run lint`: 成功
- `npm run build`: 成功

final result: passed

---

# Design QA: 会員ランク画像の初期実装（2026-09-01・上記更新前）

この節は月次利用金額と来館回数を追加する前の記録であり、現在の判定と最終表示は直前の「月次利用・来館・ランク特典の一覧化」を正とする。

## 対象

- ランク表示の参考画像: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-ecae2c05-2817-471b-9796-b3d5cbfdbd3d.png`
- 改修前の会員ホーム: `/mnt/c/Users/sm787/AppData/Local/Temp/codex-clipboard-13d0d8fa-1fd8-48cf-b875-10acb0537016.png`
- ランク画像: `frontend/public/images/UI/Membership/` のブロンズ、シルバー、ゴールド、プラチナ各1点（543×724px、透過PNG）
- 実装: `frontend/app/components/MemberRankPanel.tsx`
- 組み込み: `frontend/app/components/MemberPass.tsx`
- 周辺UI: `frontend/app/components/HomeMemberPanel.tsx`
- スタイル: `frontend/app/globals.css`
- 回帰テスト: `frontend/lib/memberHomeExperience.test.mjs`

参考画像にある利用金額と来店回数は、このアプリに信頼できるデータがないため表示していない。既存の月次特典と同じ「当月の支払い済み鑑賞予約」を使い、0・1・2・3回をブロンズ・シルバー・ゴールド・プラチナに対応させた。永久ランクではなく、画面上でも「今月の会員ランク」と明記した。

## 比較画像

- 改修前と最終実装: `/mnt/c/Users/sm787/.codex/visualizations/2026/09/01/01a05bae-53ff-7aa1-b6f8-cffa115ee241/membership-reference-vs-final.jpg`
- ランク参考画像と最終実装: `/mnt/c/Users/sm787/.codex/visualizations/2026/09/01/01a05bae-53ff-7aa1-b6f8-cffa115ee241/membership-rank-reference-vs-final.jpg`
- PC最終表示（1280×916）: `/mnt/c/Users/sm787/.codex/visualizations/2026/09/01/01a05bae-53ff-7aa1-b6f8-cffa115ee241/hal-cinema-membership-desktop-final.jpg`
- モバイル最終表示（390×844）: `/mnt/c/Users/sm787/.codex/visualizations/2026/09/01/01a05bae-53ff-7aa1-b6f8-cffa115ee241/hal-cinema-membership-mobile-390-final.jpg`

検証状態は当月の支払い済み予約2件、次回予約なし、ゴールドランク。改修前画像は1917×917、最終実装は同じ縦幅帯で全カードが見える1280×916と、モバイル390×844で確認した。全体比較では画像を同じ比較キャンバスへ収め、ランク部分は別の拡大比較も行った。

## 比較で見つけて直した点

1. 初回はランク画像の表示枠が画像の属性寸法に引っ張られ、メダルが大きくなった。画像専用の比率固定枠を設け、PCは118px、390px幅では82pxにした。
2. `next/image` の幅・高さ変更警告が出た。メイン画像と4段階の画像を `fill` と `object-contain` の枠構成へ直し、再読込後の警告を0件にした。
3. 未達ランクのカード全体を薄くすると、ランク名と必要回数まで読みにくくなった。文字は通常コントラストのまま、画像だけを薄くした。
4. 390px幅では特典カードを1列へ切り替え、ランク4件は横4列を維持した。横スクロールは発生していない。

## 最終確認

- 現在ランク、次ランクまでの回数、当月鑑賞数、4段階の一覧、月次特典を一つの流れで読める。
- 4点の会員ランク画像がすべて読み込み済みで、縦横比を維持している。
- 現在ランクと月次特典は別の `progressbar` とし、値と日本語のラベルを設定した。
- ランクタブと会員情報タブはクリックと左右キーで切り替わる。`tablist`、`tab`、`tabpanel`、`aria-selected`、`aria-current`を確認した。
- PC 1280×916とモバイル390×844で横スクロールなし。
- 最終再読込後、ブラウザの警告・エラー0件。
- ブラウザ用の会員・予約データは開発中の一時プレビューだけで使い、最終コードから削除する。

## 自己監査

1. データ監査: 参考画像の利用金額や来店回数を捏造せず、既存の支払い済み月次予約だけをランクと特典の共通ソースにした。
2. 視覚監査: 改修前と最終画面、ランク参考画像と最終ランク部分をそれぞれ同じ比較画像に置き、階層、余白、画像比率、文字コントラストを見直した。
3. 回帰監査: 既存の会員情報、次回予約、予約履歴、登録情報への導線を残し、タブ操作、レスポンシブ、型、Lint、ビルド、Nodeテストを確認する。

## 検証

- `npm run lint`: 成功
- `npx tsc --noEmit`: 成功
- `node --test lib/*.test.mjs`: 84件成功
- `npm run build`: 成功

final result: passed
