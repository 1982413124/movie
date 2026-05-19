import { formatPrice } from "../seats/formatters";

export default function ReservationPanel({ summary }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
      <div className="grid gap-5 border-b border-gray-200 pb-6 md:grid-cols-[150px_minmax(0,1fr)]">
        <Poster title={summary.posterLabel} />
        <dl className="grid content-start gap-4">
          <DetailRow label="作品名" value={summary.movieTitle} />
          <DetailRow label="上映館" value={summary.theaterName} />
          <DetailRow label="上映日時" value={summary.screeningDatetime} />
          <DetailRow label="スクリーン" value={summary.screenName} />
          <DetailRow label="座席" value={summary.seatNum} />
          <DetailRow label="枚数" value={`${summary.ticketNum}枚`} />
        </dl>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">合計金額</p>
          <p className="mt-1 text-xs text-gray-500">税込</p>
        </div>
        <p className="font-mono text-3xl font-semibold text-gray-800">
          {formatPrice(summary.totalPrice)}
        </p>
      </div>
    </section>
  );
}

function Poster({ title }) {
  return (
    <div
      aria-label="ポスター画像"
      className="aspect-[3/4] border border-gray-300 bg-gray-200 p-4 text-gray-700"
    >
      <div className="flex h-full flex-col justify-end">
        <p className="text-[11px] font-semibold text-gray-500">
          MOVIE
        </p>
        <p className="mt-2 text-xl font-semibold leading-tight text-gray-800">{title}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-4 border-b border-gray-200 pb-3 last:border-b-0">
      <dt className="text-sm font-semibold text-gray-700">{label}</dt>
      <dd className="min-w-0 text-sm text-gray-800">{value}</dd>
    </div>
  );
}
