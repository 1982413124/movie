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

  return (
    <div className="min-h-screen bg-gray-200">
      {/* ヘッダー */}
      <Header />

      {/* 検索 */}
      <div className="flex justify-center py-6">
        <input
          type="text"
          placeholder="Search in Video"
          className="w-96 p-3 border-2 border-black rounded-full"
        />
      </div>

      <div className="flex">
        {/* サイド */}
        <aside className="w-64 p-6 bg-gray-300 min-h-screen">
          <p className="mb-4">上映スケジュール</p>
          <p className="mb-4">映画一覧</p>
          <p className="mb-4">購入情報確認</p>
          <p className="mb-4">予約状況確認</p>
        </aside>

        {/* 映画一覧 */}
        <main className="flex-1 p-8">
          <h1 className="text-4xl font-bold mb-10">注目映画</h1>

          <div className="grid grid-cols-3 gap-8">
            {movies.map((movie, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-xl shadow-lg flex flex-col items-center"
              >
                {/* 画像 */}
                <Image
                  src={movie.image}
                  alt={movie.title}
                  width={600}
                  height={300}
                  className="w-[600px] h-[300px]  rounded-lg"
                />

                {/* タイトル */}
                <h2 className="font-bold text-lg mt-4">{movie.title}</h2>

                {/* 評価 */}
                <div className="flex gap-2 mt-2">
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
