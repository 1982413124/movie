import type { TicketHistory } from "../purchase-history/types";

type Props = {
  history: TicketHistory;
};

export default function HistoryListItem({ history }: Props) {
  const { purchasedAt, movieTitle, showtime, screen, seats, ticketCount, totalPrice, status } =
    history;

  return (
    <div className="grid grid-cols-[88px_144px_1fr_1fr_130px_120px_140px] items-center gap-4 border-b border-gray-200 px-6 py-4 last:border-b-0 hover:bg-gray-50 transition-colors">
      {/* ポスター画像 */}
      <div className="flex h-[110px] w-[88px] shrink-0 items-center justify-center border border-gray-300 bg-gray-200 text-center text-xs leading-tight text-gray-500">
        ポスター
        <br />
        画像
      </div>

      {/* 購入日時 */}
      <div className="text-sm text-gray-700">{purchasedAt}</div>

      {/* 作品名 / 上映日時 */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-800">{movieTitle}</p>
        <p className="text-sm text-gray-600">{showtime}</p>
        <p className="text-sm text-gray-600">{screen}</p>
      </div>

      {/* 購入内容 */}
      <div className="space-y-1">
        <p className="text-sm text-gray-700">座席：{seats.join(", ")}</p>
        <p className="text-sm text-gray-700">枚数：{ticketCount}枚</p>
      </div>

      {/* 合計金額 */}
      <div>
        <p className="text-sm font-medium text-gray-800">¥ {totalPrice.toLocaleString()}</p>
        <p className="text-xs text-gray-500">（税込）</p>
      </div>

      {/* ステータス */}
      <div className="text-sm text-gray-500">{status}</div>

      {/* 詳細ボタン */}
      <div>
        <button
          type="button"
          className="rounded border border-gray-400 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 whitespace-nowrap"
        >
          詳細を見る
        </button>
      </div>
    </div>
  );
}
