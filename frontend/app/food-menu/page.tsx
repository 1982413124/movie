import CampaignHeader from "../components/CampaignHeader";
import FoodSelectionClient from "../food/FoodSelectionClient";

export const metadata = { title: "フードメニュー" };

export default function FoodMenuPage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />
      <FoodSelectionClient menuOnly />
    </div>
  );
}
