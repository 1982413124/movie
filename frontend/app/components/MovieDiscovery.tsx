"use client";

import MoviePosterCard from "./MoviePosterCard";
import { useMemo, useState } from "react";

import type { MovieCardData } from "../data/movieCatalog";
import { useMovieCatalog } from "@/lib/use-movie-catalog";

type ReleaseFilter = "all" | MovieCardData["releaseStatus"];
type TimeFilter = "all" | Exclude<MovieCardData["timeBand"], null>;

export default function MovieDiscovery({
  initialQuery = "",
  initialRelease = "all",
}: {
  initialQuery?: string;
  initialRelease?: ReleaseFilter;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [releaseStatus, setReleaseStatus] = useState<ReleaseFilter>(initialRelease);
  const [genre, setGenre] = useState("all");
  const [format, setFormat] = useState("all");
  const [timeBand, setTimeBand] = useState<TimeFilter>("all");
  const [todayOnly, setTodayOnly] = useState(false);
  const [foodOnly, setFoodOnly] = useState(false);
  const { movies, loading, error, reload } = useMovieCatalog();
  const genres = useMemo(() => Array.from(new Set(movies.map((movie) => movie.genre))), [movies]);

  const filteredMovies = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ja-JP");

    return movies.filter((movie) => {
      const matchesQuery =
        !normalizedQuery ||
        `${movie.title} ${movie.genre}`.toLocaleLowerCase("ja-JP").includes(normalizedQuery);
      const matchesRelease = releaseStatus === "all" || movie.releaseStatus === releaseStatus;
      const matchesGenre = genre === "all" || movie.genre === genre;
      const matchesFormat = format === "all" || movie.format === format;
      const matchesTime = timeBand === "all" || movie.timeBands.includes(timeBand);
      const matchesToday = !todayOnly || movie.isToday;
      const matchesFood = !foodOnly || movie.foodPreorder;

      return matchesQuery && matchesRelease && matchesGenre && matchesFormat && matchesTime && matchesToday && matchesFood;
    });
  }, [foodOnly, format, genre, movies, query, releaseStatus, timeBand, todayOnly]);

  function resetFilters() {
    setQuery("");
    setReleaseStatus("all");
    setGenre("all");
    setFormat("all");
    setTimeBand("all");
    setTodayOnly(false);
    setFoodOnly(false);
  }

  return (
    <>
      <section aria-label="作品の検索条件" className="cinema-card p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(160px,0.5fr))]">
          <label className="block">
            <span className="text-sm font-bold">作品名・キーワード</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="作品名・ジャンル"
              className="mt-3 min-h-12 w-full border border-[var(--border-soft)] bg-[var(--page-bg)] px-4 text-sm outline-none focus:border-[var(--focus-ring)]"
            />
          </label>

          <FilterSelect label="上映状況" value={releaseStatus} onChange={(value) => setReleaseStatus(value as ReleaseFilter)}>
            <option value="all">すべて</option>
            <option value="showing">上映中</option>
            <option value="upcoming">公開予定</option>
            <option value="unscheduled">上映期間未設定</option>
            <option value="ended">上映終了</option>
          </FilterSelect>

          <FilterSelect label="ジャンル" value={genre} onChange={setGenre}>
            <option value="all">すべて</option>
            {genres.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
        </div>

        <div className="mt-5 grid gap-4 border-t border-[var(--border-subtle)] pt-5 sm:grid-cols-2 lg:grid-cols-[180px_180px_1fr] lg:items-end">
          <FilterSelect label="字幕・吹替" value={format} onChange={setFormat}>
            <option value="all">すべて</option>
            <option value="字幕">字幕</option>
            <option value="吹替">吹替</option>
          </FilterSelect>

          <FilterSelect label="上映時間帯" value={timeBand} onChange={(value) => setTimeBand(value as TimeFilter)}>
            <option value="all">すべて</option>
            <option value="morning">午前</option>
            <option value="afternoon">午後</option>
            <option value="evening">夕方</option>
            <option value="late">レイト</option>
          </FilterSelect>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end">
            <FilterCheckbox checked={todayOnly} label="今日観られる" onChange={setTodayOnly} />
            <FilterCheckbox checked={foodOnly} label="フード事前注文対応" onChange={setFoodOnly} />
            <button type="button" onClick={resetFilters} className="min-h-11 px-3 text-sm font-bold underline decoration-[var(--accent)] underline-offset-4">
              条件をクリア
            </button>
          </div>
        </div>
      </section>

      <div className="mt-8 flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <p role="status" aria-live="polite" className="text-sm font-bold">{loading ? "作品を読み込んでいます…" : error ? "作品を取得できませんでした" : `${filteredMovies.length}作品が見つかりました`}</p>
        <p className="text-xs text-[var(--text-muted)]">作品を選んで日時・空席を確認</p>
      </div>

      {loading ? null : error ? (
        <section role="alert" className="cinema-card mt-6 p-6"><p>{error}</p><button onClick={reload} className="cinema-button mt-4">再試行</button></section>
      ) : filteredMovies.length > 0 ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {filteredMovies.map((movie) => <MoviePosterCard key={movie.id} movie={movie} heading="h2" />)}
        </div>
      ) : (
        <section className="cinema-card cinema-feedback mt-6 py-12 text-center">
          <h2 className="text-xl font-black">条件に合う作品がありません</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">条件を減らすか、キーワードを変えてください。</p>
          <button type="button" onClick={resetFilters} className="cinema-button mt-6">
            すべての作品を表示
          </button>
        </section>
      )}
    </>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-3 min-h-12 w-full border border-[var(--border-soft)] bg-[var(--page-bg)] px-4 text-sm outline-none focus:border-[var(--focus-ring)]">
        {children}
      </select>
    </label>
  );
}

function FilterCheckbox({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
      {label}
    </label>
  );
}
