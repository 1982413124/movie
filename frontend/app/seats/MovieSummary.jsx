import Image from "next/image";
import { movieDetail } from "@/lib/seatSelection.mjs";

export default function MovieSummary({ selectedScreening, availableSeats, movie = movieDetail }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-5 border-b border-[var(--border-subtle)] p-4 sm:p-6 md:grid-cols-[92px_minmax(0,1fr)]">
      <div className="relative aspect-[3/4] overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-muted)] md:row-span-2">
        {movie.poster_image && <Image
          src={movie.poster_image}
          unoptimized
          loading="eager"
          alt={`${movie.title}の映画ポスター`}
          fill
          sizes="92px"
          className="object-cover"
        />}
        <span className="absolute left-3 top-3 bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
          {movie.age_rating}
        </span>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
          座席選択
        </p>
        <h1 className="cinema-page-title mt-2   uppercase text-[var(--text-primary)]">
          座席を選択
        </h1>
        <p className="mt-3 max-w-[62ch] text-xs leading-6 text-[var(--text-muted)] sm:text-sm sm:leading-7">
          {movie.title}
        </p>

      </div>

      <div className="col-span-2 grid grid-cols-3 gap-3 md:col-span-1">
        <SummaryItem label="上映時間" value={`${selectedScreening.dateLabel} ${selectedScreening.label}`} mono />
        <SummaryItem label="スクリーン" value={`${selectedScreening.screenName}（${selectedScreening.capacity}席）`} />
        <div className="border-t border-[var(--border-subtle)] pt-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
            残席
          </p>
          <p className="mt-1 font-mono text-base font-black text-[var(--text-primary)] sm:text-lg">
            {availableSeats}
            <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">
              / {selectedScreening.capacity}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, mono = false }) {
  return (
    <div className="border-t border-[var(--border-subtle)] pt-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold text-[var(--text-primary)] ${
          mono ? "font-mono text-lg" : "text-sm"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
