import CampaignHeader from "./components/CampaignHeader";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <p className="cinema-label">Loading</p>
        <div className="mt-6 grid gap-5" aria-label="ページを読み込み中">
          <span className="cinema-skeleton h-12 w-3/4" />
          <span className="cinema-skeleton h-5 w-1/2" />
          <span className="cinema-skeleton h-72 w-full" />
        </div>
      </main>
    </div>
  );
}
