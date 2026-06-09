"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CampaignHeader from "../components/CampaignHeader";

import gsap from "gsap";

const MOVIES = [
  {
    id: 1,
    title: "映画タイトル A",
    genre: "アクション",
    hours: 2,
    minutes: 13,
    rating: "13+",
    category: "アクション",
  },
  {
    id: 2,
    title: "映画タイトル B",
    genre: "ドラマ",
    hours: 1,
    minutes: 55,
    rating: "G",
    category: "ドラマ",
  },
  {
    id: 3,
    title: "映画タイトル C",
    genre: "ホラー",
    hours: 2,
    minutes: 5,
    rating: "18+",
    category: "ホラー",
  },
  {
    id: 4,
    title: "映画タイトル D",
    genre: "コメディ",
    hours: 1,
    minutes: 45,
    rating: "G",
    category: "コメディ",
  },
  {
    id: 5,
    title: "映画タイトル E",
    genre: "SF",
    hours: 2,
    minutes: 30,
    rating: "PG12",
    category: "SF",
  },
  {
    id: 6,
    title: "映画タイトル F",
    genre: "アクション",
    hours: 1,
    minutes: 50,
    rating: "PG12",
    category: "アクション",
  },
];

const CATEGORIES = ["---", "アクション", "ドラマ", "ホラー", "コメディ", "SF"];

const ITEMS_PER_PAGE = 3;

export default function NowShowingPage() {
  const [selectedCategory, setSelectedCategory] = useState("---");
  const [page, setPage] = useState(0);

  useEffect(() => {
    gsap.from(".movie-card", {
      opacity: 0,
      y: 50,
      scale: 0.9,
      duration: 0.8,
      stagger: 0.15,
      ease: "power2.out",
    });
  }, []);

  const filtered =
    selectedCategory === "---"
      ? MOVIES
      : MOVIES.filter((m) => m.category === selectedCategory);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const currentMovies = filtered.slice(
    page * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE + ITEMS_PER_PAGE,
  );

  return (
    <div className="min-h-screen bg-[var(--page-bg)] font-sans text-[var(--text-primary)]">
      <CampaignHeader />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">上映中</h1>

          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span>カテゴリ</span>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(0);
              }}
              className="rounded border border-[var(--border-strong)] bg-[var(--surface-bg)] px-2 py-1 text-sm text-[var(--text-primary)]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--text-muted)] transition hover:scale-110 disabled:opacity-30"
          >
            ‹
          </button>

          <div className="grid flex-1 grid-cols-3 gap-4">
            {currentMovies.map((movie) => (
              <div
                key={movie.id}
                className="movie-card flex cursor-grab flex-col border border-[#1C0800]/14 bg-white p-4 shadow-[0_8px_30px_rgba(28,8,0,0.1)] active:cursor-grabbing"
              >
                <div
                  className="relative w-full rounded-lg bg-[var(--surface-muted)]"
                  style={{ aspectRatio: "2/3" }}
                >
                  <svg
                    className="absolute inset-0 h-full w-full text-[var(--text-muted)]"
                    viewBox="0 0 100 150"
                    preserveAspectRatio="none"
                  >
                    <line
                      x1="0"
                      y1="0"
                      x2="100"
                      y2="150"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />

                    <line
                      x1="100"
                      y1="0"
                      x2="0"
                      y2="150"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>

                <div className="mt-3 space-y-1 text-sm">
                  <div className="font-bold">{movie.title}</div>

                  <div className="text-[var(--text-muted)]">{movie.genre}</div>

                  <div className="text-[var(--text-muted)]">
                    {movie.hours}時間 {movie.minutes}分
                  </div>

                  <div className="text-[var(--text-muted)]">{movie.rating}</div>
                </div>

                <Link
                  href="/movie-detail"
                  className="mt-4 block border border-[#E82020] py-2 text-center text-sm font-bold text-[#E82020] transition hover:scale-105 hover:bg-[#E82020] hover:text-white"
                >
                  詳細を見る
                </Link>
              </div>
            ))}

            {currentMovies.length < ITEMS_PER_PAGE &&
              Array.from({
                length: ITEMS_PER_PAGE - currentMovies.length,
              }).map((_, i) => <div key={`empty-${i}`} />)}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--text-muted)] transition hover:scale-110 disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </main>
    </div>
  );
}
