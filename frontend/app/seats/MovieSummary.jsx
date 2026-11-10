import { movieDetail } from "@/lib/seatSelection.mjs";

export default function MovieSummary({ selectedScreening, availableSeats }) {
  return (
    <div className="grid gap-5 border-b border-[#1C0800]/14 p-6 md:grid-cols-[170px_minmax(0,1fr)]">
      <div className="aspect-[3/4] border border-[#1C0800]/14 bg-[#FFF8E1] p-4 text-[#1C0800]">
        <div className="flex h-full flex-col justify-between">
          <span className="w-fit border border-[#1C0800]/30 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#1C0800]">
            {movieDetail.ageRating}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8C5D2A]">
              {movieDetail.genre}
            </p>
            <p className="mt-2 text-2xl font-black uppercase leading-tight text-[#1C0800]">
              {movieDetail.title}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#8C5D2A]">
            座席選択
          </p>
          <h1 className="mt-2 text-2xl font-black uppercase text-[#1C0800]">
            座席を選択
          </h1>
          <p className="mt-3 max-w-[62ch] text-sm leading-7 text-[#8C5D2A]">
            {movieDetail.subtitle}
          </p>
          <p className="mt-2 max-w-[62ch] text-sm leading-7 text-[#5C3010]">
            {movieDetail.synopsis}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryItem label="上映時間" value={selectedScreening.label} mono />
          <SummaryItem label="スクリーン" value={selectedScreening.screenName} />
          <div className="border-t border-[#1C0800]/14 pt-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8C5D2A]">
              残席
            </p>
            <p className="mt-1 font-mono text-lg font-black text-[#1C0800]">
              {availableSeats}
              <span className="ml-1 text-xs font-normal text-[#8C5D2A]">
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
    <div className="border-t border-[#1C0800]/14 pt-3">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8C5D2A]">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold text-[#1C0800] ${
          mono ? "font-mono text-lg" : "text-sm"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
