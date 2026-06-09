import CampaignHeader from "../components/CampaignHeader";
import SeatSelectionClient from "./SeatSelectionClient";

export default function SeatsPage() {
  return (
    <div className="min-h-screen bg-[#FFF8E1] text-[#080808]">
      <CampaignHeader />
      <SeatSelectionClient />
    </div>
  );
}
