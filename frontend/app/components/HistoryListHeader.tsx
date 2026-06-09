export default function HistoryListHeader() {
  return (
    <div className="grid grid-cols-[88px_144px_1fr_1fr_130px_120px_140px] items-center gap-4 border-b border-[#1C0800]/14 bg-[#FFE9A0] px-6 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#8C5D2A]">
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
