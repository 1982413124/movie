import { ArrowRightIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { formatCinemaDate } from "@/lib/cinemaDate.mjs";
import type { Screening } from "@/lib/screeningScheduleTypes";
import styles from "./booking.module.css";

export default function StickyBookingBar({ selected, enabled, busy, error, onProceed }: {
  selected: Screening | null; enabled: boolean; busy: boolean; error: string; onProceed: () => void;
}) {
  return (
    <div className={"booking-action-bar " + styles.bookingBar}>
      <div className={styles.bookingBarInner}>
        <div className={styles.bookingSummary} aria-live="polite" aria-atomic="true">
          {selected ? (
            <div key={selected.id} className={styles.selectedSummary}>
              <CheckCircleIcon aria-hidden="true" />
              <div><span className={styles.summaryCaption}>選択中の上映回</span>
                <p><span>{formatCinemaDate(selected.dateId)}</span><strong>{selected.startTime} ～ {selected.endDayOffset ? "翌" : ""}{selected.endTime}</strong><span>SCREEN {selected.screenId.replace("screen-", "")}</span></p>
              </div>
            </div>
          ) : <div><span className={styles.summaryCaption}>次のステップ：座席選択</span><p className={styles.noSelection}>上映回を選択してください</p></div>}
        </div>
        <button type="button" className={"cinema-button " + styles.proceedButton} disabled={!enabled} aria-busy={busy} onClick={onProceed}>
          {busy ? <><span className={styles.spinner} aria-hidden="true" />空席を確認中</> : <>座席を選択する<ArrowRightIcon aria-hidden="true" /></>}
        </button>
        {error && <p className={styles.bookingError} role="alert">{error}</p>}
      </div>
    </div>
  );
}
