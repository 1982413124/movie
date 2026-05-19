import type { TicketHistory } from "../purchase-history/types";

type Props = {
  history: TicketHistory;
};

export default function HistoryListItem({ history }: Props) {
  const { purchasedAt, movieTitle, showtime, screen, seats, ticketCount, totalPrice, status } =
    history;

  return (
    <div className="grid grid-cols-[88px_144px_1fr_1fr_130px_120px_140px] items-center gap-4 border-b border-[var(--border-soft)] px-6 py-4 transition-colors last:border-b-0 hover:bg-[var(--nav-hover)]">
      {/* ポスター画像 */}
      <div className="flex h-[110px] w-[88px] shrink-0 items-center justify-center border border-[var(--border-strong)] bg-[var(--surface-muted)] text-center text-xs leading-tight text-[var(--text-muted)]">
        ポスター
        <br />
        画像
      </div>

      {/* 購入日時 */}
      <div className="text-sm text-[var(--text-primary)]">{purchasedAt}</div>

      {/* 作品名 / 上映日時 */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{movieTitle}</p>
        <p className="text-sm text-[var(--text-muted)]">{showtime}</p>
        <p className="text-sm text-[var(--text-muted)]">{screen}</p>
      </div>

      {/* 購入内容 */}
      <div className="space-y-1">
        <p className="text-sm text-[var(--text-primary)]">座席：{seats.join(", ")}</p>
        <p className="text-sm text-[var(--text-primary)]">枚数：{ticketCount}枚</p>
      </div>

      {/* 合計金額 */}
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">¥ {totalPrice.toLocaleString()}</p>
        <p className="text-xs text-[var(--text-muted)]">（税込）</p>
      </div>

      {/* ステータス */}
      <div className="text-sm text-[var(--text-muted)]">{status}</div>

      {/* 詳細ボタン */}
      <div>
        <button
          type="button"
          className="whitespace-nowrap rounded border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--nav-hover)]"
        >
          詳細を見る
        </button>
      </div>
    </div>
  );
}
