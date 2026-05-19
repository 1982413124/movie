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
        <div className="flex w-48 items-center justify-center border-r-2 border-black text-3xl font-bold">
          HAL
          <br />
          CINEMA
        </div>

        <div className="flex flex-1">
          <div className="flex flex-1 flex-col items-center justify-center border-r-2 border-black">
            <div className="text-4xl">⌂</div>
            ホーム
          </div>

          <div className="flex flex-1 flex-col items-center justify-center border-r-2 border-black">
            <div className="text-4xl">🎬</div>
            上映中
          </div>

          <div className="flex flex-1 flex-col items-center justify-center border-r-2 border-black">
            <div className="text-4xl">⌕</div>
            検索
          </div>

          <div className="flex flex-1 flex-col items-center justify-center">
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
          className="w-96 rounded-full border-2 border-black p-3"
        />
      </div>

      <div className="flex">
        {/* サイド */}
        <aside className="min-h-screen w-64 bg-gray-300 p-6">
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
              <div key={index} className="rounded-xl bg-white p-4 shadow-lg">
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
