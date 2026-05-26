"use client";

import Link from "next/link";
import MainHeader from "./components/MainHeader";

export default function Home() {
  const movies = [
    {
      title: "MOVIE TITLE",
      rate: "9.5",
      count: "1154",
    },
    {
      title: "MOVIE TITLE",
      rate: "7.2",
      count: "133",
    },
    {
      title: "MOVIE TITLE",
      rate: "9.5",
      count: "2590",
    },
  ];

  const nowShowing = [
    {
      title: "MOVIE TITLE",
      rate: "9.5",
      count: "1154",
    },
    {
      title: "MOVIE TITLE",
      rate: "7.2",
      count: "133",
    },
    {
      title: "MOVIE TITLE",
      rate: "9.5",
      count: "2590",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-200">
      {/* ヘッダー */}
      <MainHeader />

      {/* 検索 */}
      <div className="flex justify-center items-center gap-5 py-6 bg-white border-b-2 border-black font-bold shadow-sm">
        {" "}
        <input
          type="text"
          placeholder="Search in Video"
          className="w-[500px] rounded-full border-2 border-gray-400 bg-white px-5 py-3 text-black shadow-sm"
        />
        <Link
          href="/movie-login"
          className="rounded-full bg-black px-8 py-3 text-white font-bold shadow-md transition hover:scale-105 hover:bg-gray-800"
        >
          LOGIN
        </Link>
      </div>

      <div className="flex">
        {/* サイド */}
        <aside className="min-h-screen w-72 bg-white border-r-2 border-gray-300 p-8 text-[var(--text-primary)] shadow-md">
          <Link
            href="#"
            className="mb-8 block text-xl font-semibold transition hover:text-blue-500"
          >
            上映スケジュール
          </Link>

          <br />
          <br />
          <br />

          <Link
            href="#"
            className="mb-8 block text-xl font-semibold transition hover:text-blue-500"
          >
            映画一覧
          </Link>

          <br />
          <br />
          <br />

          <Link
            href="#"
            className="mb-8 block text-xl font-semibold transition hover:text-blue-500"
          >
            購入情報確認
          </Link>

          <br />
          <br />
          <br />

          <Link
            href="#"
            className="block text-xl font-semibold transition hover:text-blue-500"
          >
            予約状況確認
          </Link>
        </aside>

        {/* 映画一覧 */}
        <main className="flex-1 p-8">
          <h1 className="mb-10 text-4xl font-bold">注目映画</h1>

          <div className="grid grid-cols-3 gap-8">
            {movies.map((movie, index) => (
              <Link
                href="/movie-login"
                key={index}
                className="bg-white p-4 rounded-xl shadow-lg flex flex-col items-center hover:scale-105 transition cursor-pointer"
              >
                {/* ダミー画像 */}
                <div
                  className="w-full bg-gray-200 relative rounded-lg"
                  style={{ aspectRatio: "2/1" }}
                >
                  <svg
                    className="absolute inset-0 w-full h-full text-gray-400"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <line
                      x1="0"
                      y1="0"
                      x2="100"
                      y2="100"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="100"
                      y1="0"
                      x2="0"
                      y2="100"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>

                <h2 className="font-bold text-lg mt-4">{movie.title}</h2>

                <div className="flex gap-2 mt-2">
                  <span>★</span>
                  <span>{movie.rate}</span>
                  <span>{movie.count}</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-16">
            <h2 className="mb-10 text-4xl font-bold">上映中映画</h2>

            <div className="grid grid-cols-3 gap-8">
              {nowShowing.map((movie, index) => (
                <Link
                  href="/movie-login"
                  key={index}
                  className="bg-white p-4 rounded-xl shadow-lg flex flex-col items-center hover:scale-105 transition cursor-pointer"
                >
                  {/* ダミー画像 */}
                  <div
                    className="w-full bg-gray-200 relative rounded-lg"
                    style={{ aspectRatio: "2/1" }}
                  >
                    <svg
                      className="absolute inset-0 w-full h-full text-gray-400"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="100"
                        y2="100"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="100"
                        y1="0"
                        x2="0"
                        y2="100"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  <h2 className="font-bold text-lg mt-4">{movie.title}</h2>

                  <div className="flex gap-2 mt-2">
                    <span>★</span>
                    <span>{movie.rate}</span>
                    <span>{movie.count}</span>
                  </div>

                  <div className="mt-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                    上映中
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
