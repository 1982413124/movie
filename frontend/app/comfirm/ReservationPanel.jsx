import { formatPrice } from "../seats/formatters";

export default function ReservationPanel({ summary }) {
  return (
    <section className="border border-[#1C0800]/14 bg-white p-6 shadow-[0_18px_60px_rgba(28,8,0,0.08)]">
      <div className="grid gap-5 border-b border-[#1C0800]/14 pb-6 md:grid-cols-[150px_minmax(0,1fr)]">
        <Poster src={summary.posterSrc} alt={summary.posterAlt} title={summary.posterLabel} />
        <dl className="grid content-start gap-4">
          <DetailRow label="作品名" value={summary.movieTitle} />
          <DetailRow label="上映館" value={summary.theaterName} />
          <DetailRow label="上映日時" value={summary.screeningDatetime} />
          <DetailRow label="スクリーン" value={summary.screenName} />
          <DetailRow label="座席" value={summary.seatNum} />
          <DetailRow label="枚数" value={`${summary.ticketNum}枚`} />
        </dl>
      </div>

      {Array.isArray(summary.foodItems) && summary.foodItems.length > 0 && (
        <div className="mt-6 border-b border-[#1C0800]/14 pb-6">
          <p className="mb-3 text-sm font-semibold text-[#1C0800]">フード & ドリンク</p>
          <ul className="grid gap-2">
            {summary.foodItems.map((item) => (
              <li key={item.id} className="flex justify-between text-sm text-[#5C3010]">
                <span>{item.name} × {item.quantity}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#1C0800]">合計金額</p>
          <p className="mt-1 text-xs text-[#8C5D2A]">税込</p>
        </div>
        <p className="font-mono text-3xl font-semibold text-[#1C0800]">
          {formatPrice(summary.totalPrice)}
        </p>
      </div>
    </section>
  );
}

function Poster({ src, alt, title }) {
  if (src) {
    return (
      <div className="aspect-[3/4] overflow-hidden border border-[#1C0800]/18">
        <img src={src} alt={alt || title} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      aria-label="ポスター画像"
      className="aspect-[3/4] border border-[#1C0800]/18 bg-[#FFE9A0] p-4 text-[#5C3010]"
    >
      <div className="flex h-full flex-col justify-end">
        <p className="text-[11px] font-semibold text-[#8C5D2A]">MOVIE</p>
        <p className="mt-2 text-xl font-semibold leading-tight text-[#1C0800]">{title}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-4 border-b border-[#1C0800]/10 pb-3 last:border-b-0">
      <dt className="text-sm font-semibold text-[#5C3010]">{label}</dt>
      <dd className="min-w-0 text-sm text-[#1C0800]">{value}</dd>
    </div>
  );
}
