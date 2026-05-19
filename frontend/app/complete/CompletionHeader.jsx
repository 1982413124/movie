export default function CompletionHeader({ details }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-md">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-500">
            購入完了
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-gray-800">
            {details.completeTitle}
          </h1>
          <p className="mt-5 max-w-[58ch] text-sm leading-7 text-gray-700">
            {details.completeMessage}
          </p>
          <p className="mt-2 max-w-[58ch] text-sm leading-7 text-gray-500">
            {details.mailGuide}
          </p>
        </div>

        <div
          aria-label="完了アイコン"
          className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-cyan-300 bg-cyan-50 text-cyan-700"
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

      <dl className="mt-8 grid gap-4 border-t border-gray-200 pt-6 sm:grid-cols-2">
        <HeaderMetric label="注文番号" value={details.orderNum} />
        <HeaderMetric label="購入日時" value={details.purchaseDatetime} />
      </dl>
    </section>
  );
}

function HeaderMetric({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold text-gray-800">
        {value}
      </dd>
    </div>
  );
}
