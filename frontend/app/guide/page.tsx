import Link from "next/link";

import CampaignHeader from "../components/CampaignHeader";

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#FFF8E1] text-[#1C0800]">
      <CampaignHeader />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-12">
        <p className="text-xs font-black uppercase tracking-[0.42em] text-[#A0703A]">
          GUIDE
        </p>
        <h1 className="mt-5 text-5xl font-black uppercase leading-none tracking-normal sm:text-7xl">
          ご利用ガイド
        </h1>
        <div className="mt-10 border-y border-[#1C0800]/14 py-8">
          <p className="max-w-2xl text-sm leading-7 text-[#5C3010]">
            ご利用ガイドページは後で作り込みます。チケット購入、座席予約、フード受け取りの流れをここにまとめる予定です。
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