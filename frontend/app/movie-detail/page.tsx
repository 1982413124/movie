"use client";

import Link from "next/link";

import Header from "../components/Header";

export default function MovieDetailPage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] font-sans text-[var(--text-primary)]">
      {/* ヘッダー */}
      <Header />

      {/* メイン */}
      <main className="mx-auto mt-8 flex max-w-3xl rounded-lg bg-[var(--surface-bg)] p-8 shadow-md">
        {/* ポスター画像 */}
        <div className="mr-8 flex h-80 w-56 items-center justify-center bg-[var(--surface-muted)] text-sm text-[var(--text-muted)]">
          ポスター画像
        </div>
        {/* 映画情報 */}
        <div className="flex-1">
          <h1 className="mb-1 text-2xl font-bold">映画タイトル</h1>
          <div className="mb-2 text-[var(--text-muted)]">
            サブタイトル（例：HOME COMING）
          </div>
          <div className="flex gap-2 mb-2">
            <span className="rounded border border-[var(--border-strong)] px-2 py-0.5 text-xs">
              ジャンル
            </span>
            <span className="rounded border border-[var(--border-strong)] px-2 py-0.5 text-xs">
              アクション
            </span>
          </div>
          <div className="flex items-center gap-4 mb-2">
            <span>上映時間 2時間13分</span>
            <span>13+</span>
          </div>
          <div className="mb-4">
            <strong>あらすじ</strong>
            <div className="mt-1 text-sm text-[var(--text-primary)]">
              ここに映画のあらすじが入ります。ここに映画のあらすじが入ります。ここに映画のあらすじが入ります。
            </div>
          </div>
          {/* 上映日選択 */}
          <div className="mb-3">
            <div className="font-bold mb-1">上映日を選択</div>
            <div className="flex gap-2">
              {["11", "12", "13", "14", "15", "16"].map((day, idx) => (
                <button
                  key={day}
                  className={`rounded border border-[var(--border-strong)] px-3 py-2 text-base ${idx === 0 ? "bg-[var(--surface-muted)] font-bold" : "bg-[var(--surface-bg)]"}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          {/* 上映時間選択 */}
          <div className="mb-4">
            <div className="font-bold mb-1">上映時間を選択</div>
            <div className="flex gap-3">
              {[
                { time: "08:30 - 10:40", seats: "40/70" },
                { time: "13:45 - 15:50", seats: "70/70" },
                { time: "18:00 - 20:10", seats: "20/70" },
              ].map((slot, idx) => (
                <button
                  key={slot.time}
                  className={`rounded border px-4 py-2 text-left ${idx === 0 ? "border-[var(--selection-border)] bg-[var(--selection-bg)] text-[var(--selection-text)]" : "border-[var(--border-strong)] bg-[var(--surface-bg)]"} ${slot.seats === "70/70" ? "text-[var(--text-muted)]" : ""}`}
                >
                  <div>{slot.time}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {slot.seats} 席
                  </div>
                </button>
              ))}
            </div>
          </div>
          {/* 座席選択ボタン */}
          <Link
            href="/seats"
            className="block w-full rounded-lg bg-[var(--button-bg)] py-3 text-center text-lg font-bold text-[var(--button-text)] transition-colors hover:bg-[var(--button-hover)]"
          >
            座席を選択する
          </Link>
        </div>
      </main>
    </div>
  );
}
