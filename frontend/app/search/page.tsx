import CampaignHeader from "../components/CampaignHeader";
import MovieDiscovery from "../components/MovieDiscovery";

export const metadata = { title: "作品検索" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />
      <main className="cinema-container cinema-page">
        <header className="cinema-page-heading">
          <p className="cinema-label">Search Films</p>
          <h1 className="mt-2 text-[32px] font-bold leading-snug">映画を検索</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            作品名、上映状況、ジャンル、上映時間帯から絞り込めます。
          </p>
        </header>
        <MovieDiscovery initialQuery={query} />
      </main>
    </div>
  );
}
