import Image from "next/image";
import Link from "next/link";
import { MagnifyingGlassIcon, CalendarDaysIcon, TicketIcon, MapPinIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import CampaignHeader from "./components/CampaignHeader";
import HomeMemberPanel from "./components/HomeMemberPanel";
import HomeMovieList from "./components/HomeMovieList";
import { bookingSteps } from "./data/movieCatalog";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />
      <main>
        <section className="home-search-section">
          <div className="cinema-container grid items-center gap-8 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <p className="cinema-eyebrow">HAL CINEMA 名古屋栄</p>
              <h1 className="mt-3 text-[32px] font-bold leading-snug">映画とフードを、<br />まとめて予約。</h1>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">観たい映画を選んで、座席もフードも一度に。<br />当日の予約確認はマイページから。</p>
            </div>
            <div className="cinema-card p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold"><MagnifyingGlassIcon aria-hidden="true" className="h-5 w-5 text-[var(--accent)]" />映画を探す・予約する</h2>
              <form action="/search" method="get" className="mt-4 flex gap-2">
                <label htmlFor="home-movie-search" className="sr-only">作品名やジャンルで検索</label>
                <input id="home-movie-search" name="q" type="search" placeholder="作品名・ジャンルを入力" className="min-h-12 min-w-0 flex-1 border border-[var(--border-strong)] bg-[var(--surface-bg)] px-4 text-sm" />
                <button type="submit" className="cinema-button">検索</button>
              </form>
              <div className="mt-3 flex flex-wrap gap-x-6">
                <Link href="/movie-now" className="cinema-text-link">映画を選ぶ<ChevronRightIcon aria-hidden="true" className="h-4 w-4" /></Link>
                <Link href="#today" className="cinema-text-link">本日観られる映画を見る<ChevronRightIcon aria-hidden="true" className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
          <nav aria-label="よく使うメニュー" className="cinema-container home-quick-links">
            <Link href="/movie-detail"><CalendarDaysIcon aria-hidden="true" />上映スケジュール<ChevronRightIcon aria-hidden="true" /></Link>
            <Link href="/mypage"><TicketIcon aria-hidden="true" />予約・購入履歴の確認<ChevronRightIcon aria-hidden="true" /></Link>
            <Link href="/theater"><MapPinIcon aria-hidden="true" />劇場・チケット料金<ChevronRightIcon aria-hidden="true" /></Link>
          </nav>
        </section>

        <HomeMemberPanel />

        <section id="today" className="cinema-container scroll-mt-28 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="cinema-section-title">上映中の作品</h2>
            <Link href="/movie-now" className="cinema-text-link">すべての作品を見る<ChevronRightIcon aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">作品を選んで、上映日時・空席を確認できます。</p>
          <HomeMovieList release="showing" />
        </section>

        <section className="cinema-container py-8">
          <div className="cinema-card grid overflow-hidden lg:grid-cols-[.9fr_1.1fr]">
            <div className="relative min-h-[240px] bg-[var(--surface-muted)]">
              <Image src="/images/advertisement/Popcorn-b3ad4ecb.png" alt="ポップコーンとドリンクのシネマセット" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
            </div>
            <div className="p-8">
              <p className="cinema-eyebrow">フード事前注文</p>
              <h2 className="mt-2 text-2xl font-bold">映画のおともも、予約と一緒に。</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">座席を選んだあとに、ポップコーンやドリンクを追加できます。フードの注文は任意です。</p>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">受取時間・場所は、予約内容とマイページで確認できます。</p>
              <Link href="/movie-now" className="cinema-button mt-6">映画を選んで予約する<ChevronRightIcon aria-hidden="true" className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        <section id="experience" className="cinema-container scroll-mt-28 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="cinema-section-title">はじめての方へ</h2>
            <Link href="/guide" className="cinema-text-link">詳しいご利用ガイド<ChevronRightIcon aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">{bookingSteps.map((step) => <li key={step.label} className="cinema-card p-5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--selection-soft)] text-sm font-bold text-[var(--accent)]">{step.label}</span>
            <p className="mt-4 text-sm font-bold">{step.title}</p>
          </li>)}</ol>
        </section>

        <section className="cinema-container pb-14 pt-8">
          <h2 className="cinema-section-title">公開予定作品</h2>
          <HomeMovieList release="upcoming" />
        </section>
      </main>
    </div>
  );
}
