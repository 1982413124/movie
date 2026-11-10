import Link from "next/link";
import CampaignHeader from "../components/CampaignHeader";

const quickLinks = [
  { href: "/movie-now", label: "上映中の作品を見る" },
  { href: "/movie-detail", label: "映画詳細へ進む" },
  { href: "/purchase-history", label: "購入履歴を確認する" },
];

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold">検索</h1>

        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-bg)] p-6 shadow-md">
          <label htmlFor="movie-search" className="block text-sm font-semibold">
            作品を検索
          </label>
          <input
            id="movie-search"
            type="text"
            placeholder="Search in Video"
            className="mt-3 w-full rounded-full border-2 border-[var(--border-strong)] bg-[var(--surface-bg)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded border border-[var(--border-strong)] px-4 py-3 text-center text-sm font-semibold hover:bg-[var(--nav-hover)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
