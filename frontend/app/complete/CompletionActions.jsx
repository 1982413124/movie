import Link from "next/link";

export default function CompletionActions() {
  return (
    <nav className="grid gap-3 sm:grid-cols-2" aria-label="購入完了後の操作">
      <Link
        href="/purchase-history"
        className="rounded-lg bg-[var(--button-bg)] px-5 py-4 text-center text-sm font-bold text-[var(--button-text)] transition-colors hover:bg-[var(--button-hover)]"
      >
        購入履歴へ
      </Link>
      <Link
        href="/"
        className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-bg)] px-5 py-4 text-center text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--nav-hover)]"
      >
        トップページへ
      </Link>
    </nav>
  );
}
