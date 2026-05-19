export default function HistoryListHeader() {
  return (
    <div className="grid grid-cols-[88px_144px_1fr_1fr_130px_120px_140px] items-center gap-4 border-b border-[var(--border-strong)] bg-[var(--surface-muted)] px-6 py-3 text-sm font-medium text-[var(--text-muted)]">
      <div>{/* ポスター列 */}</div>
      <div>購入日時</div>
      <div>作品名 / 上映日時</div>
      <div>購入内容</div>
      <div>合計金額</div>
      <div>ステータス</div>
      <div>詳細</div>
    </div>
  );
}
