import CampaignHeader from "../components/CampaignHeader";
import ReservationStepper from "../components/ReservationStepper";
import ConfirmClient from "../comfirm/ConfirmClient";

export const metadata = { title: "予約内容の確認・お支払い" };

export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <CampaignHeader />
      <ReservationStepper currentStep={4} />
      <ConfirmClient />
    </div>
  );
}
