import { formatPrice } from "../seats/formatters";

export default function PurchaseSummary({ details }) {
  return (
    <section className="overflow-hidden border border-[#1C0800]/14 bg-white shadow-[0_18px_60px_rgba(28,8,0,0.08)]">
      <div className="grid gap-5 border-b border-[#1C0800]/14 p-6 md:grid-cols-[150px_minmax(0,1fr)]">
        <Poster title={details.posterLabel} />
        <div className="flex flex-col justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#8C5D2A]">
              チケット
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase text-[#1C0800]">
              {details.movieTitle}
            </h2>
            <p className="mt-3 text-sm text-[#8C5D2A]">
              入場時にこの内容を確認できるよう、購入履歴にも保存されます。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MiniMetric label="上映日時" value={details.screeningDatetime} />
            <MiniMetric label="スクリーン" value={details.screenName} />
            <MiniMetric label="座席" value={details.seatNum} />
          </div>
        </div>
      </div>

      <dl className="grid gap-x-8 px-6 py-2 md:grid-cols-2">
        <DetailRow label="上映館" value={details.theaterName} />
        <DetailRow label="枚数" value={`${details.ticketNum}枚`} />
        <DetailRow label="合計金額" value={`${formatPrice(details.totalPrice)}（税込）`} />
        <DetailRow label="支払い方法" value={details.payMethod} />
        <DetailRow label="決済番号" value={details.payNum} wide />
      </dl>
    </section>
  );
}

function Poster({ title }) {
  return (
    <div
      aria-label="ポスター画像"
      className="aspect-[3/4] border border-[#1C0800]/18 bg-[#FFE9A0] p-4 text-[#5C3010]"
    >
      <div className="flex h-full flex-col justify-end">
        <p className="text-[11px] font-semibold text-[#8C5D2A]">
          MOVIE
        </p>
        <p className="mt-2 text-xl font-semibold leading-tight text-[#1C0800]">{title}</p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="border-t border-[#1C0800]/14 pt-3">
      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#8C5D2A]">{label}</p>
      <p className="mt-1 font-semibold text-[#1C0800]">{value}</p>
    </div>
  );
}

function DetailRow({ label, value, wide = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-t border-[#1C0800]/10 py-4 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <dt className="text-sm text-[#8C5D2A]">{label}</dt>
      <dd className="text-right font-semibold text-[#1C0800]">{value}</dd>
    </div>
  );
}
