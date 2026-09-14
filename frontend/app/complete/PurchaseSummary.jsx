import Image from "next/image";
import { getFoodPickupWindow } from "@/lib/reservationExperience.mjs";
import { formatPrice } from "../seats/formatters";

export default function PurchaseSummary({ details }) {
  const hasFood = details.foodItems?.length > 0;
  const pickup = getFoodPickupWindow(details.showStartAt);

  return (
    <section className="rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-bg)] shadow-sm">
      <div className="grid gap-5 border-b border-[var(--border-subtle)] p-6 md:grid-cols-[150px_minmax(0,1fr)]">
        <Poster title={details.posterLabel} />
        <div className="flex flex-col justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
              チケット
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase text-[var(--text-primary)]">
              {details.movieTitle}
            </h2>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
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
        <DetailRow label="券種" value={details.ticketSummary} />
        <DetailRow label="チケット小計" value={`${formatPrice(details.ticketTotalPrice)}（税込）`} />
        <DetailRow label="フード小計" value={`${formatPrice(details.foodTotalPrice)}（税込）`} />
        {hasFood ? (
          <>
            <FoodDetailRow items={details.foodItems} />
            <DetailRow label="受取時間" value={pickup.timeLabel} />
            <DetailRow label="受取場所" value={pickup.locationLabel} />
          </>
        ) : (
          <DetailRow label="フード明細" value="注文なし" wide />
        )}
        {details.subtotalAmount !== undefined && <>
          <DetailRow label="割引前金額" value={formatPrice(details.subtotalAmount)} />
          <DetailRow label="クーポン割引" value={`−${formatPrice(details.couponDiscountAmount ?? 0)}`} />
          <DetailRow label="ポイント利用" value={`−${formatPrice(details.pointsUsed ?? 0)}`} />
          <DetailRow label="獲得ポイント" value={`${details.pointsEarned ?? 0} pt`} />
        </>}
        <DetailRow label="最終支払額" value={`${formatPrice(details.totalPrice)}（税込）`} />
        <DetailRow label="支払い方法" value={details.payMethod} />
        <DetailRow label="決済番号" value={details.payNum} wide />
      </dl>
    </section>
  );
}

function FoodDetailRow({ items }) {
  return (
    <div className="border-t border-[var(--border-subtle)] py-4 md:col-span-2">
      <dt className="text-sm text-[var(--text-muted)]">フード明細</dt>
      <dd className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 text-sm">
            <span className="text-[var(--text-secondary)]">{item.name} x {item.quantity}</span>
            <span className="font-semibold text-[var(--text-primary)]">{formatPrice(item.lineTotal)}</span>
          </div>
        ))}
      </dd>
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

function MiniMetric({ label, value }) {
  return (
    <div className="border-t border-[var(--border-subtle)] pt-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function DetailRow({ label, value, wide = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-t border-[var(--border-subtle)] py-4 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <dt className="text-sm text-[var(--text-muted)]">{label}</dt>
      <dd className="text-right font-semibold text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}
