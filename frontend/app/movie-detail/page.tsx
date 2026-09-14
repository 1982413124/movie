import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CampaignHeader from "../components/CampaignHeader";
import ReservationStepper from "../components/ReservationStepper";
import BookingScreen from "./BookingScreen";

export const metadata: Metadata = { title: "上映回を選ぶ" };

export default async function MovieDetailPage({ searchParams }: { searchParams: Promise<{ movieId?: string }> }) {
  const { movieId } = await searchParams;
  if (typeof movieId !== "string" || !movieId) redirect("/movie-now");
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />
      <ReservationStepper currentStep={1} movieId={movieId} />
      <BookingScreen key={movieId} movieId={movieId} />
    </div>
  );
}
