export default function CompletionHeader({ details }) {
  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-8 shadow-sm">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
            購入完了
          </p>
          <span className="shrink-0 border border-[var(--success)]/35 bg-[var(--success)]/8 px-4 py-2 text-sm font-bold text-[var(--success)]">
            支払い済み
          </span>
        </div>
        <div>
          <h1 className="cinema-page-title mt-3   uppercase leading-tight text-[var(--text-primary)]">
            {details.completeTitle}
          </h1>
          <p className="mt-5 max-w-[58ch] text-sm leading-7 text-[var(--text-secondary)]">
            {details.completeMessage}
          </p>
          <p className="mt-2 max-w-[58ch] text-sm leading-7 text-[var(--text-muted)]">
            {details.mailGuide}
          </p>
        </div>
      </div>

      <dl className="mt-8 grid gap-4 border-t border-[var(--border-subtle)] pt-6 sm:grid-cols-2">
        <HeaderMetric label="注文番号" value={details.orderNum} />
        <HeaderMetric label="購入日時" value={details.purchaseDatetime} />
      </dl>
    </section>
  );
}

function HeaderMetric({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}
