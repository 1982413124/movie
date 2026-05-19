import Image from "next/image";
import Header from "./components/Header";

export default function Home() {
  const movies = [
    {
      title: "SPIDER MAN : HOME COMING",
      rate: "9.5",
      count: "1154",
      image: "/images/man.jpg",
    },
    {
      title: "godzilla",
      rate: "7.2",
      count: "133",
      image: "/images/gozira.jpg",
    },
    {
      title: "HARRY POTTER",
      rate: "9.5",
      count: "2590",
      image: "/images/harry.jpg",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <Header />

      {/* 検索 */}
      <div className="flex justify-center py-6">
        <input
          type="text"
          placeholder="Search in Video"
          className="w-96 rounded-full border-2 border-[var(--border-strong)] bg-[var(--surface-bg)] p-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      <div className="flex">
        {/* サイド */}
        <aside className="min-h-screen w-64 bg-[var(--surface-muted)] p-6 text-[var(--text-primary)]">
          <p className="mb-4">上映スケジュール</p>
          <p className="mb-4">映画一覧</p>
          <p className="mb-4">購入情報確認</p>
          <p className="mb-4">予約状況確認</p>
          <p className="mb-4">キャンペーン情報</p>
        </aside>

        {/* 映画一覧 */}
        <main className="flex-1 p-8">
          <h1 className="mb-10 text-4xl font-bold">注目映画</h1>

          <div className="grid grid-cols-3 gap-8">
            {movies.map((movie, index) => (
              <div
                key={index}
                className="rounded-xl bg-[var(--surface-bg)] p-4 shadow-lg"
              >
                {/* 画像 */}
                <Image
                  src={movie.image}
                  alt={movie.title}
                  width={500}
                  height={300}
                  className="mb-4 h-80 w-full rounded-lg object-cover"
                />

                {/* タイトル */}
                <h2 className="text-lg font-bold">{movie.title}</h2>

                <div className="mt-2 flex gap-2">
                  <span>★</span>
                  <span>{movie.rate}</span>
                  <span>{movie.count}</span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
