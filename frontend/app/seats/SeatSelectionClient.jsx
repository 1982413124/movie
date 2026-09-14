"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cinemaApi } from "@/lib/cinema-api";
import { buildCatalogScreeningDraft, showingHasStarted, toScreening } from "@/lib/public-movie-catalog.mjs";
import { changeSeatHold, formatHoldRemaining, prepareHoldSession, seatHoldStatus, secondsRemaining } from "@/lib/seatHolds.mjs";
import { useSeatHoldClock } from "@/lib/use-seat-hold-clock";
import { useToastError } from "@/lib/use-toast-error";
import ReservationStepper from "../components/ReservationStepper";
import MovieSummary from "./MovieSummary";
import OrderPanel from "./OrderPanel";
import SeatMap from "./SeatMap";

function readDraft() {
  try { return JSON.parse(sessionStorage.getItem("movieReservationDraft") || "null"); }
  catch { return null; }
}

function Selection() {
  const router = useRouter();
  const params = useSearchParams();
  const showingId = params.get("showingId");
  const [data, setData] = useState(null);
  const [ticketCounts, setTicketCounts] = useState({});
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [inspectedSeatId, setInspectedSeatId] = useState(null);
  const mutation = useRef(false);
  const requestVersion = useRef(0);
  const now = useSeatHoldClock(data?.server_now);
  useToastError(error);

  const load = useCallback(signal => {
    const id = showingId || readDraft()?.screeningId;
    if (!id) return Promise.reject(new Error("作品詳細で上映回を選んでください。"));
    return cinemaApi(`screenings/${encodeURIComponent(id)}`, { signal });
  }, [showingId]);

  const refresh = useCallback(async signal => {
    if (mutation.current) return;
    const version = ++requestVersion.current;
    const result = await load(signal);
    if (!signal?.aborted && version === requestVersion.current && !mutation.current) setData(result);
    return result;
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    prepareHoldSession().then(() => refresh(controller.signal)).then(result => {
      if (!result || controller.signal.aborted) return;
      const draft = readDraft();
      const same = draft?.screeningId === result.showing.id && draft?.movieId === result.movie.id;
      setError("");
      setTicketCounts(same ? Object.fromEntries((draft.ticketTypes || []).map(ticket => [ticket.ticketTypeId, Math.max(0, Number(ticket.quantity) || 0)])) : {});
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    const poll = () => {
      if (!document.hidden) void refresh(controller.signal).catch(cause => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    };
    const timer = setInterval(poll, 5000);
    window.addEventListener("focus", poll);
    document.addEventListener("visibilitychange", poll);
    return () => {
      controller.abort(); clearInterval(timer);
      window.removeEventListener("focus", poll);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [refresh, attempt]);

  const selectedSeatIds = useMemo(() => (data?.seats || []).filter(seat => seatHoldStatus(seat, now) === "selected").map(seat => seat.id), [data, now]);
  const started = data ? showingHasStarted(data.showing, new Date(now)) : false;
  const seatRows = useMemo(() => {
    const rows = new Map();
    for (const seat of data?.seats || []) {
      const row = rows.get(seat.row_name) || [];
      row.push({ id: seat.id, label: seat.seat_label, row: seat.row_name, column: seat.seat_number, status: seatHoldStatus(seat, now) });
      rows.set(seat.row_name, row);
    }
    return [...rows].map(([row, seats]) => ({ row, seats }));
  }, [data, now]);
  const tickets = (data?.ticket_types || []).map(ticket => ({ ticketTypeId: ticket.id, label: ticket.label, unitPrice: ticket.price,
    quantity: ticketCounts[ticket.id] || 0, lineTotal: ticket.price * (ticketCounts[ticket.id] || 0) })).filter(ticket => ticket.quantity > 0);
  const ticketSelection = { ticketTypes: tickets, totalQuantity: tickets.reduce((sum, ticket) => sum + ticket.quantity, 0),
    totalPrice: tickets.reduce((sum, ticket) => sum + ticket.lineTotal, 0) };

  async function selectSeat(seat) {
    if (!data || mutation.current || started || seat.status === "reserved") return;
    if (seat.status === "held") {
      setInspectedSeatId(seat.id);
      void refresh().catch(cause => setError(cause.message));
      return;
    }
    mutation.current = true; ++requestVersion.current;
    setBusy(true); setError(""); setInspectedSeatId(null);
    try {
      const hold = await changeSeatHold(data.showing.id, seat.id, !selectedSeatIds.includes(seat.id));
      setData(current => ({ ...current, server_now: hold.server_now, seats: current.seats.map(item => {
        if (hold.seat_ids.includes(item.id)) return { ...item, held_by_me: true, hold_expires_at: hold.expires_at };
        return item.held_by_me ? { ...item, held_by_me: false, hold_expires_at: null } : item;
      }) }));
    } catch (cause) {
      setError(cause.message); setInspectedSeatId(seat.id);
      try { setData(await load()); } catch { /* Polling retries the read. */ }
    } finally { mutation.current = false; setBusy(false); }
  }

  async function proceed() {
    if (!data || mutation.current || started) return;
    if (!selectedSeatIds.length || selectedSeatIds.length !== ticketSelection.totalQuantity) {
      setError("選択した座席数と券種の合計枚数を一致させてください。"); return;
    }
    mutation.current = true; ++requestVersion.current;
    setBusy(true); setError("");
    try {
      const latest = await load();
      setData(latest);
      const serverTime = Date.parse(latest.server_now);
      if (showingHasStarted(latest.showing, new Date(serverTime))) { setError("この上映回の予約受付は終了しました。"); return; }
      const held = latest.seats.filter(seat => seatHoldStatus(seat, serverTime) === "selected" && selectedSeatIds.includes(seat.id));
      if (held.length !== selectedSeatIds.length) { setError("仮押さえ期限が切れたか、座席の選択が変更されました。座席を選び直してください。"); return; }
      if (tickets.some(ticket => !latest.ticket_types.some(current => current.id === ticket.ticketTypeId && current.price === ticket.unitPrice))) {
        setError("チケット料金が更新されました。内容を確認して、もう一度お進みください。"); return;
      }
      const draft = { ...buildCatalogScreeningDraft(toScreening(latest.showing), latest.movie, readDraft()),
        seatIds: selectedSeatIds, seatLabels: held.map(seat => seat.seat_label), ticketTypes: tickets,
        ticketCount: ticketSelection.totalQuantity, ticketTotalPrice: ticketSelection.totalPrice };
      draft.totalPrice = draft.ticketTotalPrice + (draft.foodTotalPrice || 0);
      sessionStorage.setItem("movieReservationDraft", JSON.stringify(draft));
      router.push("/food");
    } catch (cause) { setError(cause.message); }
    finally { mutation.current = false; setBusy(false); }
  }

  if (!data) return <><ReservationStepper currentStep={2} /><main className="cinema-container py-12"><p role={error ? "alert" : "status"}>{error || "最新の座席状況を読み込んでいます。"}</p>
    {error && <button className="cinema-button mt-5" onClick={() => setAttempt(value => value + 1)}>もう一度読み込む</button>}<Link href="/movie-now" className="cinema-text-link mt-6">作品一覧へ</Link></main></>;
  const selectedScreening = toScreening(data.showing, new Date(now));
  const selected = data.seats.filter(seat => selectedSeatIds.includes(seat.id));
  const remaining = selected.length ? Math.min(...selected.map(seat => secondsRemaining(seat.hold_expires_at, now))) : 0;
  const inspected = data.seats.find(seat => seat.id === inspectedSeatId);
  const inspectedHeld = inspected && seatHoldStatus(inspected, now) === "held";
  const expired = !selected.length && data.seats.some(seat => seat.held_by_me && seat.hold_expires_at);
  const notice = <div className="mt-4 rounded border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-sm">
    {remaining > 0 ? <><p className="font-bold">座席を仮押さえしています</p><p role="timer" aria-live="off" className="mt-1 font-mono text-lg font-bold tabular-nums text-[var(--accent)]">残り {formatHoldRemaining(remaining)}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">時間内に予約を完了してください。席の追加や再読み込みで期限は延長されません。</p></>
      : <p role="status">{expired ? "仮押さえ期限が切れました。座席を選び直してください。" : "座席を選ぶと10分間仮押さえします。"}</p>}
  </div>;
  return <><ReservationStepper currentStep={2} movieId={data.movie.id} showingId={data.showing.id} /><main className="cinema-container grid items-start gap-6 py-8 text-[var(--text-primary)] md:grid-cols-[minmax(0,1fr)_320px]">
    <section className="min-w-0 rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-bg)] shadow-sm">
      <MovieSummary movie={data.movie} availableSeats={data.seats.filter(seat => ["available", "selected"].includes(seatHoldStatus(seat, now))).length} selectedScreening={selectedScreening} />
      {inspected && <div className="mx-6 mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <p role="status" className="text-sm font-semibold">{inspected.seat_label}：{inspectedHeld ? "この座席は現在、他のユーザーが仮押さえしています。" : inspected.reserved ? "この座席は予約済みです。" : "この座席の仮押さえは解除されました。座席表から選択できます。"}</p>
        {inspectedHeld && <p role="timer" aria-live="off" className="mt-2 font-mono text-xl font-bold tabular-nums">残り {formatHoldRemaining(secondsRemaining(inspected.hold_expires_at, now))}</p>}
      </div>}
      <SeatMap seatRows={seatRows} selectedSeatIds={selectedSeatIds} selectedScreening={selectedScreening} onSeatClick={selectSeat} disabled={busy || started} />
    </section>
    <OrderPanel movieId={data.movie.id} availableTicketTypes={data.ticket_types} holdNotice={notice} error={started ? "この上映回の予約受付は終了しました。" : error}
      isProceedDisabled={busy || started} onProceed={proceed} onTicketQuantityChange={(id, delta) => { if (!busy) setTicketCounts(current => ({ ...current, [id]: Math.max(0, (current[id] || 0) + delta) })); }}
      selectedScreening={selectedScreening} selectedSeatIds={selected.map(seat => seat.seat_label)} ticketCounts={ticketCounts} ticketSelection={ticketSelection} />
  </main></>;
}

export default function SeatSelectionClient() {
  return <Suspense fallback={<p role="status" className="cinema-container py-12">座席を読み込んでいます…</p>}><Selection /></Suspense>;
}
