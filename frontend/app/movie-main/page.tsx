import Image from "next/image";
import Header from "../components/Header";

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
      image: "/images/harry.png",
    },
  ];

  const nowShowing = [
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
      image: "/images/harry.png",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-200">
      {/* ヘッダー */}
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
        <aside className="min-h-screen w-72 bg-white border-r-2 border-gray-300 p-8 text-[var(--text-primary)] shadow-md">
          <p className="mb-8 text-xl font-semibold">上映スケジュール</p>

          <p className="mb-8 text-xl font-semibold">映画一覧</p>

          <p className="mb-8 text-xl font-semibold">購入情報確認</p>

          <p className="text-xl font-semibold">予約状況確認</p>
        </aside>

        {/* 映画一覧 */}
        <main className="flex-1 p-8">
          <h1 className="mb-10 text-4xl font-bold">注目映画</h1>

          <div className="grid grid-cols-3 gap-8">
            {movies.map((movie, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-xl shadow-lg flex flex-col items-center"
              >
                <Image
                  src={movie.image}
                  alt={movie.title}
                  width={600}
                  height={300}
                  className="w-[600px] h-[300px] rounded-lg"
                />

                <h2 className="font-bold text-lg mt-4">{movie.title}</h2>

                <div className="flex gap-2 mt-2">
                  <span>★</span>
                  <span>{movie.rate}</span>
                  <span>{movie.count}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16">
            <h2 className="mb-10 text-4xl font-bold">上映中映画</h2>

            <div className="grid grid-cols-3 gap-8">
              {nowShowing.map((movie, index) => (
                <div
                  key={index}
                  className="bg-white p-4 rounded-xl shadow-lg flex flex-col items-center"
                >
                  <Image
                    src={movie.image}
                    alt={movie.title}
                    width={600}
                    height={300}
                    className="w-[600px] h-[300px] rounded-lg"
                  />

                  <h2 className="font-bold text-lg mt-4">{movie.title}</h2>

                  <div className="flex gap-2 mt-2">
                    <span>★</span>
                    <span>{movie.rate}</span>
                    <span>{movie.count}</span>
                  </div>

                  <div className="mt-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                    上映中
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
