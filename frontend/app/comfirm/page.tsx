import Header from "../components/Header";
import ConfirmClient from "./ConfirmClient";

export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] font-sans text-[var(--text-primary)]">
      <Header />
      <ConfirmClient />
    </div>
  );
}
