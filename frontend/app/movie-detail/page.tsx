"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CampaignHeader from "../components/CampaignHeader";
import { getUpcomingDates, screenings } from "@/lib/seatSelection.mjs";

const upcomingDates = getUpcomingDates(7);

export default function MovieDetailPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(upcomingDates[0].value);
  const [selectedScreeningId, setSelectedScreeningId] = useState(screenings[0].id);

  const handleProceedToSeats = () => {
    window.sessionStorage.setItem(
      "movieSelectedScreening",
      JSON.stringify({ date: selectedDate, screeningId: selectedScreeningId }),
    );
    router.push("/seats");
  };

  return (
    <div className="min-h-screen bg-[#FFF8E1] text-[#1C0800]">
      <CampaignHeader />

      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
        <div className="mb-8 border-b border-[#1C0800]/14 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.38em] text-[#8C5D2A]">
            Movie Reservation
          </p>
          <h1 className="mt-3 text-5xl font-black uppercase leading-none sm:text-7xl">
            DETAIL
          </h1>
        </div>

        <section className="grid gap-8 border border-[#1C0800]/14 bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.10)] lg:grid-cols-[360px_1fr] lg:p-6">
          <div className="relative overflow-hidden">
            <img
              src="/images/man.jpg"
              alt="スパイダーマン"
              className="w-full h-auto"
            />

            <div className="absolute left-4 top-4 bg-[#1C0800] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white">
              Screen 01
            </div>

            <div className="absolute left-4 top-4 bg-[#1C0800] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white">
              Screen 01
            </div>
          </div>

          <div className="flex flex-col">
            <div className="border-b border-[#1C0800]/14 pb-6">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#A0703A]">
                Action / Adventure
              </p>

              <h2 className="mt-4 text-4xl font-black uppercase leading-none sm:text-6xl">
                映画タイトル
              </h2>

              <p className="mt-3 text-sm font-bold text-[#8C5D2A]">
                サブタイトル（例：HOME COMING）
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="border border-[#1C0800]/25 px-3 py-1 text-xs font-bold">
                  ジャンル
                </span>
                <span className="border border-[#1C0800]/25 px-3 py-1 text-xs font-bold">
                  アクション
                </span>
                <span className="border border-[#1C0800]/25 px-3 py-1 text-xs font-bold">
                  13+
                </span>
              </div>
            </div>

            <div className="grid gap-6 border-b border-[#1C0800]/14 py-6 sm:grid-cols-3">
              <Info label="上映時間" value="2時間13分" />
              <Info label="公開年" value="2026" />
              <Info label="評価" value="★ 9.5" />
            </div>

            <div className="border-b border-[#1C0800]/14 py-6">
              <h3 className="text-sm font-black uppercase tracking-[0.22em]">
                Story
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#5C3010]">
                ここに映画のあらすじが入ります。ここに映画のあらすじが入ります。
                ここに映画のあらすじが入ります。映画の内容を簡単に紹介します。
              </p>
            </div>

            <div className="py-6">
              <h3 className="text-sm font-black uppercase tracking-[0.22em]">
                Select Date
              </h3>

              <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {upcomingDates.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => setSelectedDate(day.value)}
                    className={`min-h-14 border text-sm font-black transition ${
                      selectedDate === day.value
                        ? "bg-[#1C0800] text-white"
                        : "bg-white text-[#1C0800] hover:bg-[#FFF0C0]"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pb-6">
              <h3 className="text-sm font-black uppercase tracking-[0.22em]">
                Select Time
              </h3>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {screenings.map((screening) => {
                  const selected = selectedScreeningId === screening.id;

                  return (
                    <button
                      key={screening.id}
                      type="button"
                      onClick={() => setSelectedScreeningId(screening.id)}
                      className={`border p-4 text-left transition ${
                        selected
                          ? "border-[#1C0800] bg-[#1C0800] text-white"
                          : "border-[#1C0800]/20 bg-white text-[#1C0800] hover:border-[#1C0800]"
                      }`}
                    >
                      <div className="text-lg font-black">{screening.label}</div>
                      <div className="mt-2 text-xs font-bold tracking-[0.14em]">
                        {screening.screenName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceedToSeats}
              className="mt-auto flex min-h-14 items-center justify-center bg-[#1C0800] text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-[#2b2b2b]"
            >
              座席を選択する
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-black uppercase tracking-[0.2em] text-[#A0703A]">
        {label}
      </div>
      <div className="mt-2 text-lg font-black">{value}</div>
    </div>
  );
}
