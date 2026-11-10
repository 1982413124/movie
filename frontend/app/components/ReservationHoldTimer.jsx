"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatHoldRemaining, hasAllHeldSeats, readSeatHolds, secondsRemaining } from "@/lib/seatHolds.mjs";
import { useSeatHoldClock } from "@/lib/use-seat-hold-clock";

export default function ReservationHoldTimer({ draft, onReady }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const showingId = draft?.screeningId;
  const now = useSeatHoldClock(snapshot?.server_now);
  const ready = snapshot?.showingId === showingId && !error && hasAllHeldSeats(snapshot, draft?.seatIds, now);
  useEffect(() => { onReady?.(Boolean(ready)); }, [onReady, ready]);
  useEffect(() => {
    if (!showingId) return;
    const controller = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (pending || controller.signal.aborted) return;
      pending = true;
      try {
        const result = await readSeatHolds(showingId, controller.signal);
        if (!controller.signal.aborted) { setSnapshot({ ...result, showingId }); setError(""); }
      } catch {
        if (!controller.signal.aborted) setError("仮押さえの状態を確認できません。通信状態を確認してください。");
      } finally { pending = false; }
    };
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 5000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort(); clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [showingId]);

  return <section className="mb-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-4">
    {ready ? <><p className="text-sm font-bold">座席を仮押さえしています <span role="timer" aria-live="off" className="ml-2 font-mono tabular-nums text-[var(--accent)]">残り {formatHoldRemaining(secondsRemaining(snapshot.expires_at, now))}</span></p><p className="mt-1 text-xs text-[var(--text-secondary)]">時間内に予約を完了してください。画面を戻っても期限は延長されません。</p></>
      : <p role="status" className="text-sm text-[var(--danger)]">{error || (snapshot?.showingId === showingId ? "仮押さえ期限が切れたか、座席の選択が変更されました。" : "仮押さえの残り時間を確認しています…")}
        <Link className="ml-3 underline underline-offset-4" href={showingId ? `/seats?showingId=${encodeURIComponent(showingId)}` : "/seats"}>座席を選び直す</Link></p>}
  </section>;
}
