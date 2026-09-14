import CampaignHeader from "../components/CampaignHeader";
import ReservationStepper from "../components/ReservationStepper";
import SeatSelectionClient from "./SeatSelectionClient";

export const metadata = { title: "座席を選ぶ" };

export default function SeatsPage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />
      <ReservationStepper currentStep={2} />
      <SeatSelectionClient />
    </div>
  );
}
