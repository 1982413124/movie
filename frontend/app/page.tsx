import Image from "next/image";

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
    <div className="min-h-screen bg-gray-200">
      {/* ヘッダー */}
      <header className="flex h-32 border-b-2 border-black bg-gray-400">
        <div className="w-48 border-r-2 border-black flex items-center justify-center text-3xl font-bold">
          HAL
          <br />
          CINEMA
        </div>

        <div className="flex flex-1">
          <div className="flex-1 border-r-2 border-black flex flex-col items-center justify-center">
            <div className="text-4xl">⌂</div>
            ホーム
          </div>

          <div className="flex-1 border-r-2 border-black flex flex-col items-center justify-center">
            <div className="text-4xl">🎬</div>
            上映中
          </div>

          <div className="flex-1 border-r-2 border-black flex flex-col items-center justify-center">
            <div className="text-4xl">⌕</div>
            検索
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-4xl">◉</div>
            マイページ
          </div>
        </div>
      </header>

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
          <p className="mb-4">キャンペーン情報</p>
        </aside>

        {/* 映画一覧 */}
        <main className="flex-1 p-8">
          <h1 className="text-4xl font-bold mb-10">注目映画</h1>

          <div className="grid grid-cols-3 gap-8">
            {movies.map((movie, index) => (
              <div key={index} className="bg-white p-4 rounded-xl shadow-lg">
                {/* 画像 */}
                <Image
                  src={movie.image}
                  alt={movie.title}
                  width={500}
                  height={300}
                  className="w-full h-80 object-cover rounded-lg mb-4"
                />

                {/* タイトル */}
                <h2 className="font-bold text-lg">{movie.title}</h2>

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
