"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import CampaignHeader from "../components/CampaignHeader";
import { getMovieById } from "../../lib/movieData";

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

function MovieDetailContent() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));
  const movie = getMovieById(id);

  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [selectedTime, setSelectedTime] = useState(timeTable[days[0]][0].time);

  const handleDayClick = (day: string) => {
    setSelectedDay(day);
    setSelectedTime(timeTable[day][0].time);
  };

  if (!movie) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm font-bold text-[#A0703A]">映画が見つかりません</p>
        <Link href="/movie-now" className="mt-6 inline-block text-xs font-black uppercase tracking-[0.18em] text-[#E82020] underline">
          一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <section className="grid gap-8 border border-[#1C0800]/14 bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.10)] lg:grid-cols-[360px_1fr] lg:p-6">
      <div className="relative overflow-hidden">
        <img
          src={movie.imageSrc}
          alt={movie.imageAlt}
          className="w-full h-auto"
        />
        <div className="absolute left-4 top-4 bg-[#1C0800] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white">
          {movie.screen}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="border-b border-[#1C0800]/14 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#A0703A]">
            {movie.genre}
          </p>

          <h2 className="mt-4 text-4xl font-black uppercase leading-none sm:text-6xl">
            {movie.titleEn}
          </h2>

          <p className="mt-3 text-sm font-bold text-[#8C5D2A]">
            {movie.title}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="border border-[#1C0800]/25 px-3 py-1 text-xs font-bold">
              {movie.genre}
            </span>
            <span className="border border-[#1C0800]/25 px-3 py-1 text-xs font-bold">
              {movie.rating}
            </span>
          </div>
        </div>

        <div className="grid gap-6 border-b border-[#1C0800]/14 py-6 sm:grid-cols-3">
          <Info label="上映時間" value={`${movie.hours}時間${movie.minutes}分`} />
          <Info label="上映スクリーン" value={movie.screen} />
          <Info label="本日の上映" value={movie.schedule} />
        </div>

        <div className="border-b border-[#1C0800]/14 py-6">
          <h3 className="text-sm font-black uppercase tracking-[0.22em]">
            Story
          </h3>
          <p className="mt-3 text-sm leading-7 text-[#5C3010]">
            {movie.synopsis}
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
          href="/food"
          className="mt-auto flex min-h-14 items-center justify-center bg-[#1C0800] text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-[#2b2b2b]"
        >
          座席を選択する
        </Link>
      </div>
    </section>
  );
}

export default function MovieDetailPage() {
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

        <Suspense fallback={<div className="py-24 text-center text-sm text-[#A0703A]">読み込み中...</div>}>
          <MovieDetailContent />
        </Suspense>
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
