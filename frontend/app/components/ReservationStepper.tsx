import Link from "next/link";

const reservationSteps = [
  { id: 1, label: "上映回", href: "/movie-detail" },
  { id: 2, label: "座席", href: "/seats" },
  { id: 3, label: "フード", href: "/food" },
  { id: 4, label: "支払い", href: "/confirm" },
  { id: 5, label: "完了", href: "/complete" },
];
export default function ReservationStepper({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="予約の進行状況" className="booking-progress">
      <ol className="cinema-container grid grid-cols-5">
        {reservationSteps.map((step) => {
          const isCurrent = step.id === currentStep;
          const isComplete = step.id < currentStep;
          const content = <><span className="step-number" aria-hidden="true">{isComplete ? "✓" : step.id}</span><span>{step.label}</span></>;
          return <li key={step.id} className={`booking-step ${isCurrent ? "is-current" : ""} ${isComplete ? "is-complete" : ""}`}>
            {isComplete && currentStep < 5
              ? <Link href={step.href} aria-label={`${step.label}に戻る`}>{content}</Link>
              : <span aria-current={isCurrent ? "step" : undefined}>{content}</span>}
          </li>;
        })}
      </ol>
    </nav>
  );
}
