import Link from "next/link";
import CampaignHeader from "./components/CampaignHeader";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />
      <main className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-5 py-12 text-center">
        <section className="cinema-card w-full px-7 py-10">
          <p className="cinema-label">404</p>
          <h1 className="cinema-page-title mt-4">ページが見つかりません</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            URLをご確認いただくか、トップページから映画を探してください。
          </p>
          <Link
            href="/"
            className="cinema-button mt-7"
          >
            トップページへ
          </Link>
        </section>
      </main>
    </div>
  );
}
