"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { quoteReservation } from "@/lib/reservationApi.mjs";
import { toast } from "@/lib/toast-store.mjs";
import { formatPrice } from "../seats/formatters";

const field = "mt-2 min-h-11 w-full rounded border border-[var(--border-subtle)] bg-[var(--surface-bg)] px-3 text-[var(--text-primary)]";

export default function DiscountPanel({ draft, onQuote, disabled }) {
  const [coupon, setCoupon] = useState("");
  const [points, setPoints] = useState("");
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const controller = useRef(null);

  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    quoteReservation(draft, { signal: request.signal }).then(value => {
      if (!request.signal.aborted) { setQuote(value); onQuote(value); }
    }).catch(cause => {
      if (!request.signal.aborted) { setError(cause.message); toast.error(cause.message); }
    }).finally(() => { if (!request.signal.aborted) setBusy(false); });
    return () => controller.current?.abort();
  }, [draft, onQuote]);

  function change(setter, value) {
    controller.current?.abort();
    setter(value); setDirty(true); onQuote(null); setError(""); setBusy(false);
  }

  async function apply(event) {
    event.preventDefault();
    if (busy || disabled) return;
    if (!/^\d*$/.test(points) || !Number.isSafeInteger(Number(points))) {
      setError("利用ポイントは0以上の整数で入力してください。");
      toast.error("利用ポイントは0以上の整数で入力してください。");
      return;
    }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true); setError(""); onQuote(null);
    try {
      const result = await quoteReservation(draft, { couponCode: coupon, pointsToUse: Number(points), signal: request.signal });
      if (request.signal.aborted) return;
      setCoupon(result.coupon_code ?? ""); setQuote(result); onQuote(result); setDirty(false);
      if (result.coupon_code) toast.event("coupon.applied");
      else toast.success(result.points_used ? "ポイントを適用しました。" : "料金を更新しました。");
    } catch (cause) {
      if (request.signal.aborted) return;
      setError(cause.message); setDirty(true);
      if (cause.code?.includes("coupon")) toast.event("coupon.failed", { message: cause.message });
      else toast.error(cause.message);
    } finally { if (!request.signal.aborted) setBusy(false); }
  }

  const maxPoints = quote ? Math.min(quote.available_points, quote.subtotal_amount - quote.coupon_discount_amount) : 0;
  return <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-6">
    <h2 className="text-xl font-bold">クーポン・ポイント</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">クーポンを適用した金額から、1ポイント＝1円でご利用いただけます。</p>
    <form onSubmit={apply} className="mt-5 space-y-5">
      <fieldset disabled={disabled || busy} className="space-y-5 disabled:opacity-60">
        <label className="block text-sm font-bold" htmlFor="coupon-code">クーポンコード
          <input id="coupon-code" className={field} value={coupon} onChange={e => change(setCoupon,e.target.value)} maxLength={40} autoComplete="off" autoCapitalize="characters" placeholder="コードを入力" />
        </label>
        {quote?.member ? <div>
          <label className="block text-sm font-bold" htmlFor="points-to-use">利用ポイント <span className="ml-2 font-normal text-[var(--text-secondary)]">利用可能 {quote.available_points.toLocaleString()} pt</span>
            <input id="points-to-use" className={field} inputMode="numeric" value={points} onChange={e => change(setPoints,e.target.value)} placeholder="0" aria-describedby="points-guide" />
          </label>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs"><p id="points-guide">最終支払額100円ごとに1ポイント獲得</p><button type="button" className="min-h-11 underline" onClick={() => change(setPoints,String(maxPoints))}>利用可能な分を入力</button></div>
          {quote.point_balance < 0 && <p className="mt-2 text-sm text-[var(--text-secondary)]">予約取消による調整残高 {quote.point_balance} pt は、今後の獲得分から相殺されます。</p>}
        </div> : quote && <p className="text-sm"><Link className="underline" href="/login">ログイン</Link>するとポイントを獲得・利用できます。</p>}
        <button className="min-h-11 rounded border border-[var(--button-bg)] px-5 text-sm font-bold text-[var(--text-primary)] disabled:opacity-50" disabled={busy || disabled}>{busy ? "料金を確認中…" : "割引を適用・料金を更新"}</button>
      </fieldset>
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    </form>
    <div aria-live="polite" className="mt-5 border-t border-[var(--border-subtle)] pt-4">
      {busy ? <p className="text-sm">料金を確認しています…</p> : dirty || !quote ? <p className="text-sm text-[var(--text-secondary)]">入力内容を適用して、支払金額を確認してください。</p> : <dl className="space-y-3 text-sm">
        <Row label="割引前金額" value={formatPrice(quote.subtotal_amount)} />
        <Row label={quote.coupon_code ? `クーポン（${quote.coupon_code}）` : "クーポン割引"} value={`−${formatPrice(quote.coupon_discount_amount)}`} />
        <Row label="ポイント利用" value={`−${formatPrice(quote.points_used)}`} />
        <Row label="最終支払額" value={formatPrice(quote.total_price)} strong />
        {quote.member && <Row label="獲得予定ポイント" value={`${quote.points_earned.toLocaleString()} pt`} />}
      </dl>}
    </div>
  </section>;
}

function Row({ label, value, strong }) {
  return <div className={`flex justify-between gap-4 ${strong ? "border-t border-[var(--border-subtle)] pt-3 text-lg font-bold" : ""}`}><dt className="min-w-0 break-all">{label}</dt><dd className="shrink-0 tabular-nums">{value}</dd></div>;
}
