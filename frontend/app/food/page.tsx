import CampaignHeader from "../components/CampaignHeader";
import FoodSelectionClient from "./FoodSelectionClient";

export default function FoodPage() {
  return (
    <div className="min-h-screen bg-[#F4EFE6] text-[#1C0800]">
      <CampaignHeader />
      <FoodSelectionClient />
    </div>
  );
}
