import Link from "next/link";
import CampaignHeader from "../components/CampaignHeader";
import { theaterScreens, ticketTypes } from "@/lib/seatSelection.mjs";

export const metadata = { title: "劇場案内・チケット料金" };

export default function TheaterPage() {
  return <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
    <CampaignHeader />
    <main className="cinema-container cinema-page">
      <header className="cinema-page-heading"><span className="cinema-eyebrow">HAL CINEMA 名古屋栄</span><h1>劇場案内・チケット料金</h1><p>スクリーンの座席数と、予約時に選べるチケット料金をご案内します。</p></header>
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <section className="cinema-card overflow-hidden">
          <div className="border-b border-[var(--border-soft)] p-7"><h2 className="cinema-section-title">スクリーン</h2><p className="mt-3 text-sm text-[var(--text-secondary)]">{theaterScreens.length}スクリーン・合計{theaterScreens.reduce((total, screen) => total + screen.capacity, 0).toLocaleString()}席</p></div>
          <table className="w-full text-left text-sm"><caption className="sr-only">スクリーンごとのサイズと座席数</caption>
            <thead className="bg-[var(--surface-muted)] text-[var(--text-secondary)]"><tr><th scope="col" className="px-7 py-4">スクリーン</th><th scope="col" className="px-5 py-4">サイズ</th><th scope="col" className="px-7 py-4 text-right">座席数</th></tr></thead>
            <tbody className="divide-y divide-[var(--border-soft)]">{theaterScreens.map((screen) => <tr key={screen.id}><th scope="row" className="px-7 py-5 font-bold">{screen.name}</th><td className="px-5 py-5 text-[var(--text-secondary)]">{screen.sizeLabel}</td><td className="px-7 py-5 text-right font-mono font-bold">{screen.capacity}席</td></tr>)}</tbody>
          </table>
        </section>
        <aside className="space-y-6 lg:sticky lg:top-28">
          <section className="cinema-card p-6"><h2 className="text-xl font-bold">チケット料金</h2>
            <dl className="mt-4 divide-y divide-[var(--border-soft)]">{ticketTypes.map((ticket) => <div key={ticket.id} className="flex justify-between gap-3 py-4"><dt className="text-sm">{ticket.label}</dt><dd className="font-mono font-bold">{ticket.price.toLocaleString()}円</dd></div>)}</dl>
            <p className="mt-3 text-xs leading-6 text-[var(--text-secondary)]">券種と枚数は、座席選択画面で指定できます。</p>
            <Link href="/movie-now" className="cinema-button mt-5 w-full">上映作品・スケジュール</Link>
          </section>
          <section className="cinema-card p-6"><h2 className="font-bold">ご利用前に</h2><p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">予約やフードの受取方法は、ご利用ガイドをご覧ください。</p><Link href="/guide" className="cinema-text-link mt-3">ご利用ガイドを見る ›</Link></section>
        </aside>
      </div>
    </main>
  </div>;
}
