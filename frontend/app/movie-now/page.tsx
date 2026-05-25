"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../components/Header";

const MOVIES = [
  { id: 1, title: "映画タイトル A", genre: "アクション", hours: 2, minutes: 13, rating: "13+", category: "アクション" },
  { id: 2, title: "映画タイトル B", genre: "ドラマ",    hours: 1, minutes: 55, rating: "G",   category: "ドラマ" },
  { id: 3, title: "映画タイトル C", genre: "ホラー",    hours: 2, minutes: 5,  rating: "18+", category: "ホラー" },
  { id: 4, title: "映画タイトル D", genre: "コメディ",  hours: 1, minutes: 45, rating: "G",   category: "コメディ" },
  { id: 5, title: "映画タイトル E", genre: "SF",        hours: 2, minutes: 30, rating: "PG12",category: "SF" },
  { id: 6, title: "映画タイトル F", genre: "アクション",hours: 1, minutes: 50, rating: "PG12",category: "アクション" },
];

const CATEGORIES = ["---", "アクション", "ドラマ", "ホラー", "コメディ", "SF"];
const ITEMS_PER_PAGE = 3;

export default function NowShowingPage() {
  const [selectedCategory, setSelectedCategory] = useState("---");
  const [page, setPage] = useState(0);

  const filtered =
    selectedCategory === "---"
      ? MOVIES
      : MOVIES.filter((m) => m.category === selectedCategory);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentMovies = filtered.slice(
    page * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-[var(--page-bg)] font-sans text-[var(--text-primary)]">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* (6)(7) タイトル行 + カテゴリ */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">上映中</h1>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span>カテゴリ</span>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(0); }}
              className="rounded border border-[var(--border-strong)] bg-[var(--surface-bg)] px-2 py-1 text-sm text-[var(--text-primary)]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* カード一覧 + 矢印 */}
        <div className="flex items-center gap-3">

          {/* 左矢印 */}
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--text-muted)] disabled:opacity-30"
          >
            ‹
          </button>

          {/* (8) 映画カード × 3枚 */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            {currentMovies.map((movie) => (
              <div key={movie.id} className="flex flex-col">

                {/* ポスター画像プレースホルダー */}
                <div className="relative w-full bg-[var(--surface-muted)]" style={{ aspectRatio: "2/3" }}>
                  <svg
                    className="absolute inset-0 h-full w-full text-[var(--text-muted)]"
                    viewBox="0 0 100 150"
                    preserveAspectRatio="none"
                  >
                    <line x1="0" y1="0" x2="100" y2="150" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="100" y1="0" x2="0" y2="150" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>

                {/* テキスト情報 */}
                <div className="mt-2 space-y-0.5 text-sm">
                  {/* (9) タイトル */}
                  <div className="font-medium">{movie.title}</div>
                  {/* (10) ジャンル */}
                  <div className="text-[var(--text-muted)]">{movie.genre}</div>
                  {/* (11) 上映時間 */}
                  <div className="text-[var(--text-muted)]">{movie.hours}時間 {movie.minutes}分</div>
                  {/* (12) レーティング */}
                  <div className="text-[var(--text-muted)]">{movie.rating}</div>
                </div>

                {/* 詳細を見るボタン */}
                <Link
                  href={`/movies/${movie.id}`}
                  className="mt-3 block text-center border border-gray-400 rounded py-1.5 text-sm text-black hover:bg-gray-100"
                >
                  詳細を見る
                </Link>
              </div>
            ))}

            {/* 3枚未満のとき空欄で埋める */}
            {currentMovies.length < ITEMS_PER_PAGE &&
              Array.from({ length: ITEMS_PER_PAGE - currentMovies.length }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
          </div>

          {/* 右矢印 */}
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--text-muted)] disabled:opacity-30"
          >
            ›
          </button>

        </div>
      </main>
    </div>
  );
}
