import CampaignHeader from "../components/CampaignHeader";
import ReservationStepper from "../components/ReservationStepper";
import CompleteClient from "./CompleteClient";

export const metadata = { title: "購入完了" };

export default function CompletePage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <CampaignHeader />
      <ReservationStepper currentStep={5} />
      <CompleteClient />
    </div>
  );
}
