import Image from "next/image";
import { getFoodPickupWindow } from "@/lib/reservationExperience.mjs";
import { formatPrice } from "../seats/formatters";

export default function ReservationPanel({ summary }) {
  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-6 shadow-sm">
      <div className="grid gap-5 border-b border-[var(--border-subtle)] pb-6 md:grid-cols-[150px_minmax(0,1fr)]">
        <Poster title={summary.posterLabel} />
        <dl className="grid content-start gap-4">
          <DetailRow label="作品名" value={summary.movieTitle} />
          <DetailRow label="上映館" value={summary.theaterName} />
          <DetailRow label="上映日時" value={summary.screeningDatetime} />
          <DetailRow label="スクリーン" value={summary.screenName} />
          <DetailRow label="座席" value={summary.seatNum} />
          <DetailRow label="枚数" value={`${summary.ticketNum}枚`} />
          <DetailRow label="券種" value={summary.ticketSummary} />
        </dl>
      </div>

      <FoodSummary summary={summary} />

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">割引前金額</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">税込</p>
        </div>
        <p className="font-mono text-3xl font-semibold text-[var(--text-primary)]">
          {formatPrice(summary.totalPrice)}
        </p>
      </div>
    </section>
  );
}

function FoodSummary({ summary }) {
  const hasFood = summary.foodItems?.length > 0;
  const pickup = getFoodPickupWindow(summary.showStartAt);

  return (
    <div className="mt-6 border-b border-[var(--border-subtle)] pb-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
            Food
          </p>
          <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">
            フード注文
          </h2>
        </div>
        <p className="font-mono text-lg font-black text-[var(--text-primary)]">
          {formatPrice(summary.foodTotalPrice)}
        </p>
      </div>

      <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        <DetailRow label="チケット小計" value={formatPrice(summary.ticketTotalPrice)} alignRight />
        {hasFood ? summary.foodItems.map((item) => (
          <DetailRow
            key={item.id}
            label={`${item.name} x ${item.quantity}`}
            value={formatPrice(item.lineTotal)}
            alignRight
          />
        )) : (
          <DetailRow label="フード" value="注文なし" alignRight />
        )}
        <DetailRow label="フード小計" value={formatPrice(summary.foodTotalPrice)} alignRight />
      </div>
      {hasFood ? (
        <div className="mt-4 border-l-4 border-[var(--danger)] bg-[var(--selection-soft)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
          <p className="font-bold text-[var(--text-primary)]">受取時間 {pickup.timeLabel}</p>
          <p>受取場所 {pickup.locationLabel}</p>
        </div>
      ) : null}
    </div>
  );
}

function Poster({ title }) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <Image
        src="/images/man.jpg"
          loading="eager"
        alt={`${title}のポスター`}
        fill
        sizes="150px"
        className="object-cover"
      />
    </div>
  );
}

function DetailRow({ label, value, alignRight = false }) {
  return (
    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-4 border-b border-[var(--border-subtle)] pb-3 last:border-b-0">
      <dt className="text-sm font-semibold text-[var(--text-secondary)]">{label}</dt>
      <dd className={`min-w-0 text-sm text-[var(--text-primary)] ${alignRight ? "text-right" : ""}`}>{value}</dd>
    </div>
  );
}
