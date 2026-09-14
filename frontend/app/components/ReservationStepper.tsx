"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const reservationSteps = [
  { id: 1, label: "上映回", href: "/movie-now" },
  { id: 2, label: "座席", href: "/seats" },
  { id: 3, label: "フード", href: "/food" },
  { id: 4, label: "支払い", href: "/confirm" },
  { id: 5, label: "完了", href: "/complete" },
];
function subscribeToDraft(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getStoredDraft() {
  try { return window.sessionStorage.getItem("movieReservationDraft"); }
  catch { return null; }
}

function getServerDraft() { return null; }

function bookingReference(raw: string | null): { movieId?: string; showingId?: string } {
  try {
    const draft = JSON.parse(raw || "null");
    return {
      movieId: typeof draft?.movieId === "string" ? draft.movieId : undefined,
      showingId: typeof draft?.screeningId === "string" ? draft.screeningId : undefined,
    };
  } catch { return {}; }
}

type Props = { currentStep: number; movieId?: string; showingId?: string };

export default function ReservationStepper({ currentStep, movieId, showingId }: Props) {
  const rawDraft = useSyncExternalStore(subscribeToDraft, getStoredDraft, getServerDraft);
  const stored = bookingReference(rawDraft);
  const selectedMovieId = movieId ?? stored.movieId;
  const selectedShowingId = showingId ?? (!movieId || movieId === stored.movieId ? stored.showingId : undefined);
  return (
    <nav aria-label="予約の進行状況" className="booking-progress">
      <ol className="cinema-container grid grid-cols-5">
        {reservationSteps.map((step) => {
          const isCurrent = step.id === currentStep;
          const isComplete = step.id < currentStep;
          const href = step.id === 1 && selectedMovieId
            ? `/movie-detail?movieId=${encodeURIComponent(selectedMovieId)}`
            : step.id === 2 && selectedShowingId
              ? `/seats?showingId=${encodeURIComponent(selectedShowingId)}` : step.href;
          const content = <><span className="step-number" aria-hidden="true">{isComplete ? "✓" : step.id}</span><span>{step.label}</span></>;
          return <li key={step.id} className={`booking-step ${isCurrent ? "is-current" : ""} ${isComplete ? "is-complete" : ""}`}>
            {isComplete && currentStep < 5
              ? <Link href={href} aria-label={`${step.label}に戻る`}>{content}</Link>
              : <span aria-current={isCurrent ? "step" : undefined}>{content}</span>}
          </li>;
        })}
      </ol>
    </nav>
  );
}
