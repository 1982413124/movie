"use client";

import { useState } from "react";
import Header from "../components/Header";
import Link from "next/link";

// サンプル上映日・上映時間データ
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

  // 日付が変わったら時間もリセット
  const handleDayClick = (day: string) => {
    setSelectedDay(day);
    setSelectedTime(timeTable[day][0].time);
  };

  return (
    <div className="font-sans bg-gray-100 min-h-screen">
      {/* ヘッダー */}
      <Header />

      {/* メイン */}
      <main className="flex p-12 max-w-5xl mx-auto bg-white mt-12 rounded-xl shadow-lg">
        {/* ポスター画像 */}
        <div className="w-56 h-80 bg-gray-300 flex items-center justify-center text-sm text-gray-500 mr-8">
          ポスター画像
        </div>
        {/* 映画情報 */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-1">映画タイトル</h1>
          <div className="text-gray-500 mb-2">
            サブタイトル（例：HOME COMING）
          </div>
          <div className="flex gap-2 mb-2">
            <span className="border border-gray-500 rounded px-2 py-0.5 text-xs">
              ジャンル
            </span>
            <span className="border border-gray-500 rounded px-2 py-0.5 text-xs">
              アクション
            </span>
          </div>
          <div className="flex items-center gap-4 mb-2">
            <span>上映時間 2時間13分</span>
            <span>13+</span>
          </div>
          <div className="mb-4">
            <strong>あらすじ</strong>
            <div className="text-sm text-gray-700 mt-1">
              ここに映画のあらすじが入ります。ここに映画のあらすじが入ります。ここに映画のあらすじが入ります。
            </div>
          </div>
          {/* 上映日選択 */}
          <div className="mb-3">
            <div className="font-bold mb-1">上映日を選択</div>
            <div className="flex gap-2">
              {days.map((day) => (
                <button
                  key={day}
                  className={`px-3 py-2 rounded border border-gray-500 text-base ${selectedDay === day ? "bg-gray-200 font-bold" : "bg-white"}`}
                  onClick={() => handleDayClick(day)}
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
              {timeTable[selectedDay].map((slot) => (
                <button
                  key={slot.time}
                  className={`px-4 py-2 rounded border text-left ${
                    selectedTime === slot.time
                      ? "border-[var(--selection-border)] bg-[var(--selection-bg)] font-bold text-[var(--selection-text)]"
                      : "border-gray-500 bg-white"
                  } ${
                    slot.seats === "70/70"
                      ? "text-gray-400"
                      : selectedTime === slot.time
                        ? "text-[var(--selection-text)]"
                        : "text-gray-900"
                  }`}
                  onClick={() => setSelectedTime(slot.time)}
                  disabled={slot.seats === "70/70"}
                >
                  <div>{slot.time}</div>
                  <div className="text-xs text-gray-500">{slot.seats} 席</div>
                </button>
              ))}
            </div>
          </div>
          {/* 座席選択ボタン */}
          <Link href="/seats">
            <button className="w-full py-3 bg-gray-700 text-white rounded-lg text-lg font-bold hover:bg-gray-800 transition-colors">
              座席を選択する
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
