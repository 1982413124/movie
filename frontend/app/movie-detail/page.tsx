"use client";

import { useState } from "react";
import Link from "next/link";
import CampaignHeader from "../components/CampaignHeader";

const days = ["11", "12", "13", "14", "15", "16"];

const timeTable: Record<string, { time: string; seats: string }[]> = {
  "11": [
    { time: "08:30 - 10:40", seats: "40/70" },
    { time: "13:45 - 15:50", seats: "70/70" },
    { time: "18:00 - 20:10", seats: "20/70" },
  ],
  "12": [
    { time: "09:00 - 11:10", seats: "50/70" },
    { time: "14:00 - 16:10", seats: "60/70" },
  ],
  "13": [
    { time: "10:00 - 12:10", seats: "30/70" },
    { time: "15:00 - 17:10", seats: "70/70" },
  ],
  "14": [
    { time: "11:00 - 13:10", seats: "20/70" },
    { time: "16:00 - 18:10", seats: "55/70" },
  ],
  "15": [
    { time: "12:00 - 14:10", seats: "10/70" },
    { time: "17:00 - 19:10", seats: "70/70" },
  ],
  "16": [
    { time: "13:00 - 15:10", seats: "70/70" },
    { time: "18:00 - 20:10", seats: "20/70" },
  ],
};

export default function MovieDetailPage() {
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [selectedTime, setSelectedTime] = useState(timeTable[days[0]][0].time);

  const handleDayClick = (day: string) => {
    setSelectedDay(day);
    setSelectedTime(timeTable[day][0].time);
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

              <div className="mt-4 grid grid-cols-6 gap-2">
                {days.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={`min-h-14 border text-lg font-black transition ${
                      selectedDay === day
                        ? "bg-[#1C0800] text-white"
                        : "bg-white text-[#1C0800] hover:bg-[#FFF0C0]"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="pb-6">
              <h3 className="text-sm font-black uppercase tracking-[0.22em]">
                Select Time
              </h3>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {timeTable[selectedDay].map((slot) => {
                  const soldOut = slot.seats === "70/70";
                  const selected = selectedTime === slot.time;

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={soldOut}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`border p-4 text-left transition ${
                        selected
                          ? "border-[#1C0800] bg-[#1C0800] text-white"
                          : "border-[#1C0800]/20 bg-white text-[#1C0800] hover:border-[#1C0800]"
                      } ${soldOut ? "cursor-not-allowed opacity-35" : ""}`}
                    >
                      <div className="text-lg font-black">{slot.time}</div>
                      <div className="mt-2 text-xs font-bold tracking-[0.14em]">
                        {soldOut ? "SOLD OUT" : `${slot.seats} 席`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Link
              href="/seats"
              className="mt-auto flex min-h-14 items-center justify-center bg-[#1C0800] text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-[#2b2b2b]"
            >
              座席を選択する
            </Link>
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
