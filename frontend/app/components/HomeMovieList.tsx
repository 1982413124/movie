"use client";

import { useMovieCatalog } from "@/lib/use-movie-catalog";
import MoviePosterCard from "./MoviePosterCard";

export default function HomeMovieList({ release }: { release: "showing" | "upcoming" }) {
  const { movies, loading, error, reload } = useMovieCatalog();
  const visible = movies.filter(movie => movie.releaseStatus === release);
  if (loading) return <p role="status" className="mt-6 text-sm">作品を読み込んでいます…</p>;
  if (error) return <div role="alert" className="cinema-card mt-6 p-6 text-sm"><p>{error}</p><button onClick={reload} className="cinema-button mt-4">再試行</button></div>;
  if (!visible.length) return <p className="cinema-card mt-6 px-6 py-7 text-sm text-[var(--text-secondary)]">{release === "upcoming" ? "公開予定作品は、情報が決まり次第こちらでお知らせします。" : "上映中の作品は現在ありません。"}</p>;
  return <div className="mt-6 grid gap-6 lg:grid-cols-2">{visible.map(movie => <MoviePosterCard key={movie.id} movie={movie} />)}</div>;
}
