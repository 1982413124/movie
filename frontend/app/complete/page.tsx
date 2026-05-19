import Header from "../components/Header";
import CompleteClient from "./CompleteClient";

export default function CompletePage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] font-sans text-[var(--text-primary)]">
      <Header />
      <CompleteClient />
    </div>
  );
}
