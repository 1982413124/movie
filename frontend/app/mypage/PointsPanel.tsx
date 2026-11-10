"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { memberFetch, MemberApiError } from "@/lib/member-api.mjs";
import { toast } from "@/lib/toast-store.mjs";

type PointEntry = { id: number; reservation_id: number; order_num: string; movie_title: string; kind: string; amount: number; balance_after: number; created_at: string };
type PointData = { balance: number; available_points: number; history: PointEntry[]; next_cursor: number | null };
const labels: Record<string,string> = { EARN: "獲得", USE: "利用", EARN_REVERSED: "獲得分の取消", USE_RETURNED: "利用分の返還" };

export default function PointsPanel() {
  const [data, setData] = useState<PointData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback((before?: number) => {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    return memberFetch(`member/points${before ? `?before=${before}` : ""}`, { signal: request.signal }).then(async response => {
      const result:PointData & {message?:string} = await response.json();
      if (!response.ok) throw new MemberApiError(result.message ?? "ポイントを取得できませんでした。", response.status);
      if (!request.signal.aborted) { setData(previous => ({ ...result, history: before ? [...(previous?.history ?? []), ...result.history] : result.history })); setError(""); }
    }).catch(cause => {
      if (!request.signal.aborted) { setError((cause as Error).message); toast.error((cause as Error).message); }
    }).finally(() => { if (!request.signal.aborted) setBusy(false); });
  }, []);
  useEffect(() => { void load(); return () => controller.current?.abort(); }, [load]);
  function reload(before?:number) { setBusy(true); setError(""); void load(before); }

  return <section className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-bg)] p-6 sm:p-8">
    <p className="cinema-label">HAL CINEMA POINTS</p><h2 className="mt-3 text-2xl font-bold">ポイント</h2>
    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">最終支払額100円につき1ポイント獲得。予約時に1ポイント＝1円で利用できます。</p>
    {error && <div role="alert" className="mt-5 text-sm text-[var(--danger)]"><p>{error}</p><button onClick={() => reload()} className="mt-2 min-h-11 underline">再読み込み</button></div>}
    {data ? <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-[var(--border-soft)] py-6"><div><p className="text-sm text-[var(--text-secondary)]">利用可能ポイント</p><p className="mt-2 text-4xl font-bold tabular-nums">{data.available_points.toLocaleString()} <span className="text-lg">pt</span></p></div><button className="min-h-11 rounded border border-[var(--border-subtle)] px-4 text-sm disabled:opacity-50" disabled={busy} onClick={() => reload()}>残高を更新</button></div>
      {data.balance < 0 && <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">予約取消による調整残高は {data.balance.toLocaleString()} pt です。使い切った獲得ポイントの取消分は、今後の獲得分から相殺します。</p>}
      <h3 className="mt-7 text-lg font-bold">ポイント履歴</h3>
      {data.history.length ? <ol className="mt-4 divide-y divide-[var(--border-soft)]">{data.history.map(entry => <li key={entry.id} className="flex items-start justify-between gap-5 py-5"><div className="min-w-0"><p className="text-sm font-bold">{labels[entry.kind] ?? entry.kind}</p><p className="mt-1 break-words text-sm">{entry.movie_title || "ご予約"}</p><p className="mt-2 break-all text-xs leading-6 text-[var(--text-secondary)]">予約番号 {entry.order_num}<br />{new Date(entry.created_at).toLocaleString("ja-JP",{ timeZone:"Asia/Tokyo" })}</p></div><div className="shrink-0 text-right"><p className={`text-lg font-bold tabular-nums ${entry.amount > 0 ? "text-[var(--success)]" : "text-[var(--text-primary)]"}`}>{entry.amount > 0 ? "+" : ""}{entry.amount.toLocaleString()} pt</p><p className="mt-2 text-xs text-[var(--text-secondary)]">残高 {entry.balance_after.toLocaleString()} pt</p></div></li>)}</ol> : <p className="mt-5 text-sm text-[var(--text-secondary)]">ポイント履歴はまだありません。</p>}
      {data.next_cursor && <button disabled={busy} onClick={() => reload(data.next_cursor!)} className="mt-4 min-h-11 w-full rounded border border-[var(--border-subtle)] text-sm disabled:opacity-50">{busy ? "読み込み中…" : "さらに表示"}</button>}
    </> : !error && <p role="status" className="mt-6">ポイントを読み込んでいます…</p>}
    <p className="mt-7 border-t border-[var(--border-soft)] pt-5 text-xs leading-6 text-[var(--text-secondary)]">予約をキャンセルすると、使用ポイントは返還され、その予約の獲得ポイントは取り消されます。</p>
  </section>;
}
