import { movieDetail } from "@/lib/seatSelection.mjs";

export default function MovieSummary({ selectedScreening, availableSeats }) {
  return (
    <div className="grid gap-5 border-b border-gray-200 p-6 md:grid-cols-[170px_minmax(0,1fr)]">
      <div className="aspect-[3/4] border border-gray-300 bg-gray-200 p-4 text-gray-700">
        <div className="flex h-full flex-col justify-between">
          <span className="w-fit rounded border border-gray-500 px-2 py-1 text-[10px] font-semibold text-gray-700">
            {movieDetail.ageRating}
          </span>
          <div>
            <p className="text-xs font-medium text-gray-600">
              {movieDetail.genre}
            </p>
            <p className="mt-2 text-2xl font-semibold leading-tight text-gray-800">
              {movieDetail.title}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-gray-500">
            座席選択
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-800">
            座席を選択
          </h1>
          <p className="mt-3 max-w-[62ch] text-sm leading-7 text-gray-600">
            {movieDetail.subtitle}
          </p>
          <p className="mt-2 max-w-[62ch] text-sm leading-7 text-gray-700">
            {movieDetail.synopsis}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryItem label="上映時間" value={selectedScreening.label} mono />
          <SummaryItem label="スクリーン" value={selectedScreening.screenName} />
          <div className="border-t border-gray-200 pt-3">
            <p className="text-xs text-gray-500">残席</p>
            <p className="mt-1 font-mono text-lg font-semibold text-gray-800">
              {availableSeats}
              <span className="ml-1 text-xs font-normal text-gray-500">
                / 56
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, mono = false }) {
  return (
    <div className="border-t border-gray-200 pt-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 font-semibold text-gray-800 ${
          mono ? "font-mono text-lg" : "text-sm"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
