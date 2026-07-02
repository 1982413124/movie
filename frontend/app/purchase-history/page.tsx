import CampaignHeader from "../components/CampaignHeader";
import PurchaseHistoryClient from "./PurchaseHistoryClient";

export default function PurchaseHistoryPage() {
  return (
    <div className="min-h-screen bg-[#FFF8E1]">
      <CampaignHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-black uppercase tracking-[0.08em] text-[#1C0800]">購入履歴</h1>
        <PurchaseHistoryClient />
      </main>
    </div>
  );
}