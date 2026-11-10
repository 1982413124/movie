"use client";

import { useState } from "react";
import Link from "next/link";
import CampaignHeader from "../components/CampaignHeader";
import { MOVIES, type Movie } from "../../lib/movieData";

const CATEGORIES = [
  "ALL",
  "アクション",
  "SF",
  "ファンタジー",
  "ホラー",
  "ドラマ",
  "アニメ",
  "スリラー",
  "ミュージカル",
  "モンスター",
];

export default function NowShowingPage() {
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const filtered =
    selectedCategory === "ALL"
      ? MOVIES
      : MOVIES.filter((m) => m.genre === selectedCategory);

  return (
    <div className="min-h-screen bg-[#FFF8E1] text-[#1C0800]">
      <CampaignHeader />

      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
        {/* ページヘッダー */}
        <div className="mb-8 border-b border-[#1C0800]/14 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.38em] text-[#8C5D2A]">
            Movie Reservation
          </p>
          <h1 className="mt-3 text-5xl font-black uppercase leading-none sm:text-7xl">
            NOW SHOWING
          </h1>
        </div>

        {/* カテゴリフィルター */}
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-10 border px-5 text-xs font-black uppercase tracking-[0.18em] transition ${
                selectedCategory === cat
                  ? "border-[#E82020] bg-[#E82020] text-white"
                  : "border-[#1C0800]/20 bg-white text-[#1C0800] hover:border-[#1C0800]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 件数表示 */}
        <p className="mb-6 text-xs font-bold uppercase tracking-[0.22em] text-[#8C5D2A]">
          {filtered.length} FILMS
        </p>

        {/* 4列グリッド */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((movie, index) => (
            <MovieCard key={movie.id} movie={movie} index={index} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-sm font-bold text-[#A0703A]">
              該当する作品はありません
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function MovieCard({ movie, index }: { movie: Movie; index: number }) {
  return (
    <div className="group flex flex-col border border-[#1C0800]/14 bg-white shadow-[0_8px_32px_rgba(28,8,0,0.08)] transition hover:border-[#1C0800]/40 hover:shadow-[0_16px_48px_rgba(28,8,0,0.13)]">
      {/* ポスター画像 */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "2/3" }}>
        <img
          src={movie.imageSrc}
          alt={movie.imageAlt}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 bg-[#E82020]/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
          {movie.screen}
        </div>
        <div className="absolute bottom-3 right-3 font-mono text-4xl font-black text-white/20">
          {String(index + 1).padStart(2, "0")}
        </div>
      </div>

      {/* 情報 */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-[#A0703A]">
          <span>{movie.genre}</span>
          <span className="border border-[#1C0800]/20 px-2 py-0.5">
            {movie.rating}
          </span>
        </div>

        <h2 className="mt-2 line-clamp-2 text-sm font-black leading-snug text-[#1C0800]">
          {movie.titleEn}
        </h2>

        <p className="mt-1 line-clamp-2 text-xs text-[#5C3010]">
          {movie.title}
        </p>

        <div className="mt-3 flex items-center justify-between text-xs text-[#8C5D2A]">
          <span className="font-bold">{movie.schedule}</span>
          <span>
            {movie.hours}h {movie.minutes}m
          </span>
        </div>

        <Link
          href={`/movie-detail?id=${movie.id}`}
          className="mt-4 flex min-h-10 items-center justify-center border border-[#E82020] text-xs font-black uppercase tracking-[0.14em] text-[#E82020] transition hover:bg-[#E82020] hover:text-white"
        >
          予約する
        </Link>
      </div>
    </div>
  );
}
