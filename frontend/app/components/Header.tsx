import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-gray-300 bg-white">
      <nav className="flex items-stretch divide-x divide-gray-200">
        {/* HAL CINEMA ロゴ */}
        <div className="flex min-w-[120px] flex-col items-center justify-center px-8 py-4">
          <span className="text-center text-xs font-bold leading-tight text-gray-800">
            HAL
            <br />
            CINEMA
            <br />
            アイコン
          </span>
        </div>

        {/* ホーム */}
        <Link
          href="/"
          className="flex flex-1 flex-col items-center justify-center gap-2 py-4 transition-colors hover:bg-gray-50"
        >
          <svg className="h-9 w-9" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-sm text-gray-700">ホーム</span>
        </Link>

        {/* 上映中の作品 */}
        <Link
          href="/movie-detail"
          className="flex flex-1 flex-col items-center justify-center gap-2 py-4 transition-colors hover:bg-gray-50"
        >
          <svg className="h-9 w-9" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
          <span className="text-sm text-gray-700">上映中の作品</span>
        </Link>

        {/* 座席選択 */}
        <Link
          href="/seats"
          className="flex flex-1 flex-col items-center justify-center gap-2 py-4 transition-colors hover:bg-gray-50"
        >
          <svg className="h-9 w-9" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <span className="text-sm text-gray-700">座席選択</span>
        </Link>

        {/* 購入履歴 */}
        <Link
          href="/purchase-history"
          className="flex flex-1 flex-col items-center justify-center gap-2 py-4 transition-colors hover:bg-gray-50"
        >
          <svg className="h-9 w-9" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span className="text-sm text-gray-700">購入履歴</span>
        </Link>
      </nav>
    </header>
  );
}
