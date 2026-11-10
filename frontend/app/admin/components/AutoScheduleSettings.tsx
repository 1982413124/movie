type Props = { daily: number; onDailyChange: (value: number) => void; disabled?: boolean };

export default function AutoScheduleSettings({ daily, onDailyChange, disabled }: Props) {
  return <div className="admin-field" style={{ marginTop: 16 }}>
    <label htmlFor="daily-showings">1日の上映回数</label>
    <select id="daily-showings" name="daily_showings" value={daily} onChange={event => onDailyChange(Number(event.target.value))} disabled={disabled}>
      {[1, 2, 3, 4, 5, 6].map(count => <option key={count} value={count}>{count}回</option>)}
    </select>
    <small>上映期間中の10:00〜23:00に、20分の間隔を空けて割り当てます。当日は30分後以降が対象です。空きが足りない場合は、作成できた回数をお知らせします。</small>
  </div>;
}
