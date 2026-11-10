import { CheckIcon, ClockIcon } from "@heroicons/react/24/outline";
import type { Screening } from "@/lib/screeningScheduleTypes";
import styles from "./booking.module.css";

export default function ScreeningCard({ screening, selected, busy, onSelect }: {
  screening: Screening; selected: boolean; busy: boolean; onSelect: (screening: Screening) => void;
}) {
  const end = (screening.endDayOffset ? "翌" : "") + screening.endTime;
  return (
    <button type="button" className={styles.screeningCard} aria-pressed={selected}
      aria-disabled={!screening.bookable || busy} disabled={!screening.bookable || busy}
      data-selected={selected} data-status={screening.status} data-screening-id={screening.id}
      aria-label={screening.startTime + "から" + end + "終了予定 " + screening.screenName + " " + screening.availabilityLabel + (selected ? " 選択中" : "")}
      onClick={() => onSelect(screening)}>
      <span className={styles.screeningStart}>{screening.startTime}</span>
      {selected && <span className={styles.selectedCheck}><CheckIcon aria-hidden="true" /><span className="sr-only">選択中</span></span>}
      <span className={styles.screeningEnd}>→ {end}<span>終了予定</span></span>
      <span className={styles.screenName}>SCREEN {screening.screenId.replace("screen-", "")}</span>
      <span className={styles.availability}>
        {screening.status === "not-on-sale" ? <ClockIcon aria-hidden="true" /> : <b aria-hidden="true">{screening.availabilitySymbol}</b>}
        <span>{screening.availabilityLabel}</span>
      </span>
    </button>
  );
}
