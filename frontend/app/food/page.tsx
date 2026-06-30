import CampaignHeader from "../components/CampaignHeader";
import FoodSelectionClient from "./FoodSelectionClient";

export default function FoodPage() {
  return (
    <div className="min-h-screen bg-[#FFF8E1] text-[#1C0800]">
      <CampaignHeader />
      <FoodSelectionClient />
    </div>
  );
}
