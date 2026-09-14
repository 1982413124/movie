"use client";

import CampaignHeader from "./components/CampaignHeader";
import { useToastError } from "@/lib/use-toast-error";

export default function ErrorPage({ reset }: { reset: () => void }) {
  useToastError("エラーが発生しました。もう一度お試しください。");
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />
      <main className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-5 py-12 text-center">
        <section className="cinema-card w-full px-7 py-10">
          <p className="cinema-label">Error</p>
          <h1 className="cinema-page-title mt-4">ページを表示できませんでした</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
            一時的な問題が発生しました。もう一度お試しください。
          </p>
          <button
            type="button"
            onClick={reset}
            className="cinema-button mt-7"
          >
            もう一度試す
          </button>
        </section>
      </main>
    </div>
  );
}
