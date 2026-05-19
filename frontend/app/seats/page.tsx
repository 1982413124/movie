import Header from "../components/Header";
import SeatSelectionClient from "./SeatSelectionClient";

export default function SeatsPage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] font-sans text-[var(--text-primary)]">
      <Header />
      <SeatSelectionClient />
    </div>
  );
}
