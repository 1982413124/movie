import CampaignHeader from "../components/CampaignHeader";
import SeatSelectionClient from "./SeatSelectionClient";

export const metadata = { title: "座席を選ぶ" };

export default function SeatsPage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />
      <SeatSelectionClient />
    </div>
  );
}
