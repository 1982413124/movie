import CampaignHeader from "../components/CampaignHeader";
import MovieDiscovery from "../components/MovieDiscovery";

export const metadata = { title: "上映作品" };

export default function NowShowingPage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />
      <main className="cinema-container cinema-page">
        <header className="cinema-page-heading">
          <p className="cinema-label">Film Lineup</p>
          <h1 className="mt-2 text-[32px] font-bold leading-snug">作品を探す</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            上映中と公開予定をまとめて検索できます。上映時間を選ぶと、座席とフードの予約へ進みます。
          </p>
        </header>
        <MovieDiscovery initialRelease="showing" />
      </main>
    </div>
  );
}
