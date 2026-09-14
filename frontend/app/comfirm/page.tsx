import CampaignHeader from "../components/CampaignHeader";
import ReservationStepper from "../components/ReservationStepper";
import ConfirmClient from "./ConfirmClient";

export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <CampaignHeader />
      <ReservationStepper currentStep={4} />
      <ConfirmClient />
    </div>
  );
}
