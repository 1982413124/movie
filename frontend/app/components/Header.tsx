"use client";

export default function Header() {
  return (
    <header className="flex items-center border-b border-gray-300 bg-white">
      <div className="flex-1 text-center py-4">HAL CINEMA アイコン</div>
      <div className="flex-1 text-center">ホーム</div>
      <div className="flex-1 text-center">上映中の作品</div>
      <div className="flex-1 text-center">検索</div>
      <div className="flex-1 text-center">マイページ</div>
    </header>
  );
}
