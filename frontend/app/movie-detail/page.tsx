"use client";

import Header from "../components/Header";

export default function MovieDetailPage() {
  return (
    <div className="font-sans bg-gray-100 min-h-screen">
      {/* ヘッダー */}
      <Header />

      {/* メイン */}
      <main className="flex p-8 max-w-3xl mx-auto bg-white mt-8 rounded-lg shadow-md">
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
              {["11", "12", "13", "14", "15", "16"].map((day, idx) => (
                <button
                  key={day}
                  className={`px-3 py-2 rounded border border-gray-500 text-base ${idx === 0 ? "bg-gray-200 font-bold" : "bg-white"}`}
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
                  className={`px-4 py-2 rounded border border-gray-500 text-left ${idx === 0 ? "bg-cyan-100" : "bg-white"} ${slot.seats === "70/70" ? "text-gray-400" : "text-gray-900"}`}
                >
                  <div>{slot.time}</div>
                  <div className="text-xs text-gray-500">{slot.seats} 席</div>
                </button>
              ))}
            </div>
          </div>
          {/* 座席選択ボタン */}
          <button className="w-full py-3 bg-gray-700 text-white rounded-lg text-lg font-bold hover:bg-gray-800 transition-colors">
            座席を選択する
          </button>
        </div>
      </main>
    </div>
  );
}
