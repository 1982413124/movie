import Link from "next/link";

export default function CompletionActions() {
  return (
    <nav className="grid gap-3 sm:grid-cols-2" aria-label="購入完了後の操作">
      <Link
        href="/purchase-history"
        className="rounded-lg bg-gray-700 px-5 py-4 text-center text-sm font-bold text-white transition-colors hover:bg-gray-800"
      >
        購入履歴へ
      </Link>
      <Link
        href="/"
        className="rounded-lg border border-gray-300 bg-white px-5 py-4 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        トップページへ
      </Link>
    </nav>
  );
}
