import Link from "next/link";

import CampaignHeader from "../components/CampaignHeader";

export default function TheaterPage() {
  return (
    <div className="min-h-screen bg-[#FFF8E1] text-[#1C0800]">
      <CampaignHeader />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-12">
        <p className="text-xs font-black uppercase tracking-[0.42em] text-[#A0703A]">
          THEATER
        </p>
        <h1 className="mt-5 text-5xl font-black uppercase leading-none tracking-normal sm:text-7xl">
          劇場案内
        </h1>
        <div className="mt-10 border-y border-[#1C0800]/14 py-8">
          <p className="max-w-2xl text-sm leading-7 text-[#5C3010]">
            劇場案内ページは後で作り込みます。アクセス、スクリーン、設備情報をここに整理する予定です。
          </p>
          <Link
            href="/movie-main"
            className="mt-8 inline-flex min-h-11 items-center justify-center border border-[#1C0800] px-5 text-xs font-black uppercase tracking-[0.16em] transition hover:bg-[#1C0800] hover:text-[#FFF8E1]"
          >
            HAL CINEMAへ戻る
          </Link>
        </div>
      </main>
    </div>
  );
}