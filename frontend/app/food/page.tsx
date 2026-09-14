import CampaignHeader from "../components/CampaignHeader";
import ReservationStepper from "../components/ReservationStepper";
import FoodSelectionClient from "./FoodSelectionClient";

export const metadata = { title: "フードを選ぶ" };

export default function FoodPage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />
      <ReservationStepper currentStep={3} />
      <FoodSelectionClient />
    </div>
  );
}
