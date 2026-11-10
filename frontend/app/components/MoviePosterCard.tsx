import Image from "next/image";
import Link from "next/link";
import { ChevronRightIcon, ClockIcon } from "@heroicons/react/24/outline";
import type { MovieCardData } from "../data/movieCatalog";

export default function MoviePosterCard({ movie, heading = "h3" }: { movie: MovieCardData; heading?: "h2" | "h3" }) {
  const Heading = heading;
  return (
    <article className="movie-poster-card cinema-card">
      <div className="movie-poster-image">
        {movie.imageSrc ? <Image src={movie.imageSrc} alt={movie.imageAlt} fill unoptimized sizes="(min-width: 1024px) 190px, 40vw" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center text-sm text-[var(--text-muted)]">ポスター準備中</span>}
      </div>
      <div className="flex min-w-0 flex-col p-6">
        <p className="text-xs font-bold text-[var(--accent)]">{{ showing: "上映中", upcoming: "公開予定", ended: "上映終了", unscheduled: "上映期間未設定" }[movie.releaseStatus]}</p>
        <Heading className="mt-2 text-2xl font-bold leading-tight">{movie.title}</Heading>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{movie.genre} · {movie.runtime.replace("min", "分")}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
          {movie.ageRating && <span className="rounded border border-[var(--border-soft)] px-2 py-1">{movie.ageRating}</span>}
          {movie.format && <span className="rounded border border-[var(--border-soft)] px-2 py-1">{movie.format}</span>}
          {movie.foodPreorder && <span className="rounded bg-[var(--surface-muted)] px-2 py-1">フード事前注文</span>}
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-[var(--border-soft)] pt-4 text-sm">
          <ClockIcon className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
          <span className="text-[var(--text-secondary)]">{movie.bookingHref ? "上映日時・空席は次の画面で確認" : "上映スケジュールは準備中です"}</span>
        </div>
        <Link href={movie.detailHref} className="cinema-button mt-4 w-full" aria-label={movie.title + "の詳細・予約"}>
          {movie.bookingHref ? "上映時間・予約" : "作品詳細を見る"}<ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
