import Header from "../components/Header";
import SeatSelectionClient from "./SeatSelectionClient";

export default function SeatsPage() {
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header />
      <SeatSelectionClient />
    </div>
  );
}
