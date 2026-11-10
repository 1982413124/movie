export default function CompletionHeader({ details }) {
  return (
    <section className="border border-[#1C0800]/14 bg-white p-8 shadow-[0_18px_60px_rgba(28,8,0,0.08)]">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#8C5D2A]">
            購入完了
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-tight text-[#1C0800]">
            {details.completeTitle}
          </h1>
          <p className="mt-5 max-w-[58ch] text-sm leading-7 text-[#5C3010]">
            {details.completeMessage}
          </p>
          <p className="mt-2 max-w-[58ch] text-sm leading-7 text-[#8C5D2A]">
            {details.mailGuide}
          </p>
        </div>

        <div
          aria-label="完了アイコン"
          className="grid h-20 w-20 shrink-0 place-items-center border border-[#C8860A]/40 bg-[#FFE9A0] text-[#C8860A]"
        >
          <svg
            aria-hidden="true"
            className="h-10 w-10"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M13 24.8 20.2 32 36 16"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3.5"
            />
          </svg>
        </div>
      </div>

      <dl className="mt-8 grid gap-4 border-t border-[#1C0800]/14 pt-6 sm:grid-cols-2">
        <HeaderMetric label="注文番号" value={details.orderNum} />
        <HeaderMetric label="購入日時" value={details.purchaseDatetime} />
      </dl>
    </section>
  );
}

function HeaderMetric({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8C5D2A]">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold text-[#1C0800]">
        {value}
      </dd>
    </div>
  );
}
