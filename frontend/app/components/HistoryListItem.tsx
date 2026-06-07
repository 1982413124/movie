import type { TicketHistory } from "../purchase-history/types";

type Props = {
  history: TicketHistory;
};

export default function HistoryListItem({ history }: Props) {
  const { purchasedAt, movieTitle, showtime, screen, seats, ticketCount, totalPrice, status } =
    history;

  return (
    <div className="grid grid-cols-[88px_144px_1fr_1fr_130px_120px_140px] items-center gap-4 border-b border-[#1C0800]/10 bg-white px-6 py-4 last:border-b-0 transition-colors hover:bg-[#FFF8E1]">
      {/* ポスター画像 */}
      <div className="flex h-[110px] w-[88px] shrink-0 items-center justify-center border border-[#1C0800]/18 bg-[#FFE9A0] text-center text-xs leading-tight text-[#8C5D2A]">
        ポスター
        <br />
        画像
      </div>

      {/* 購入日時 */}
      <div className="text-sm text-[#5C3010]">{purchasedAt}</div>

      {/* 作品名 / 上映日時 */}
      <div className="space-y-1">
        <p className="text-sm font-bold text-[#1C0800]">{movieTitle}</p>
        <p className="text-sm text-[#8C5D2A]">{showtime}</p>
        <p className="text-sm text-[#8C5D2A]">{screen}</p>
      </div>

      {/* 購入内容 */}
      <div className="space-y-1">
        <p className="text-sm text-[#5C3010]">座席：{seats.join(", ")}</p>
        <p className="text-sm text-[#5C3010]">枚数：{ticketCount}枚</p>
      </div>

      {/* 合計金額 */}
      <div>
        <p className="text-sm font-bold text-[#1C0800]">¥ {totalPrice.toLocaleString()}</p>
        <p className="text-xs text-[#8C5D2A]">（税込）</p>
      </div>

      {/* ステータス */}
      <div className="text-sm text-[#8C5D2A]">{status}</div>

      {/* 詳細ボタン */}
      <div>
        <button
          type="button"
          className="border border-[#C8860A]/40 bg-white px-4 py-2 text-sm text-[#5C3010] transition-colors hover:bg-[#FFF8E1] whitespace-nowrap"
        >
          詳細を見る
        </button>
      </div>
    </div>
  );
}
