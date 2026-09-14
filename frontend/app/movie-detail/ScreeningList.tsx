import ScreeningCard from "./ScreeningCard";
import type { Screening } from "@/lib/screeningScheduleTypes";
import styles from "./booking.module.css";

type Props = {
  dateId?: string; screenings: Screening[]; selectedId?: string;
  state: "loading" | "ready" | "error"; error: string; busy: boolean;
  onSelect: (screening: Screening) => void; onRetry: () => void;
};
export default function ScreeningList({ dateId, screenings, selectedId, state, error, busy, onSelect, onRetry }: Props) {
  const upcoming = screenings.filter((screening) => screening.status !== "closed");
  const closed = screenings.filter((screening) => screening.status === "closed");
  return (
    <section className={styles.screeningsSection} aria-labelledby="screenings-heading" aria-busy={state === "loading"}>
      <div className={styles.sectionHeading}>
        <div><h2 id="screenings-heading">上映回を選ぶ</h2><p>ご希望の開始時刻を選択してください。</p></div>
        <div className={styles.availabilityLegend} aria-label="空席状況の凡例"><span>○ 空席あり</span><span>△ 残りわずか</span><span>× 完売</span></div>
      </div>
      <div className={styles.screeningsContent}>
        {state === "loading" ? (
          <div role="status"><span className="sr-only">上映回と空席情報を読み込んでいます。</span>
            <div className={styles.screeningGrid} aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <div key={index} className={styles.screeningSkeleton}><i /><i /><i /></div>)}</div>
          </div>
        ) : state === "error" ? (
          <div className={styles.scheduleState} role="alert"><strong>{error}</strong><p>通信状況を確認して、もう一度お試しください。</p>
            <button type="button" className="cinema-button-secondary" onClick={onRetry}>再試行</button>
          </div>
        ) : screenings.length === 0 ? (
          <div className={styles.scheduleState} role="status"><strong>この日の上映はありません。</strong><p>カレンダーから別の日を選択してください。</p></div>
        ) : (
          <div key={dateId} className={styles.screeningsTransition}>
            {upcoming.length ? (
              <div className={styles.screeningGrid} aria-label="上映回一覧">
                {upcoming.map((screening) => <ScreeningCard key={screening.id} screening={screening} selected={selectedId === screening.id} busy={busy} onSelect={onSelect} />)}
              </div>
            ) : <div className={styles.scheduleState} role="status"><strong>本日の受付は終了しました。</strong><p>カレンダーから別の日を選択してください。</p></div>}
            {closed.length > 0 && <details className={styles.closedScreenings}>
              <summary>受付終了した上映回（{closed.length}回）</summary>
              <div className={styles.screeningGrid}>{closed.map((screening) => <ScreeningCard key={screening.id} screening={screening} selected={false} busy={false} onSelect={onSelect} />)}</div>
            </details>}
          </div>
        )}
      </div>
      {state === "ready" && screenings.length > 0 && <p className={styles.screeningNote}>空席状況は随時変わります。終了時刻は目安です。</p>}
      <span className="sr-only" role="status">{state === "ready" ? screenings.length + "件の上映回を表示しています。" : ""}</span>
    </section>
  );
}
