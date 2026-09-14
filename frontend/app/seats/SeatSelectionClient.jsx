"use client";

import { useToastError } from "@/lib/use-toast-error";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cinemaApi } from "@/lib/cinema-api";
import { buildCatalogScreeningDraft, showingHasStarted, toScreening } from "@/lib/public-movie-catalog.mjs";
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
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [ticketCounts, setTicketCounts] = useState({});
  const [error, setError] = useState("");
  useToastError(error);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const load = useCallback(async signal => {
    const draft = readDraft();
    const id = showingId || draft?.screeningId;
    if (!id) throw new Error("作品詳細で上映回を選んでください。");
    return cinemaApi(`screenings/${encodeURIComponent(id)}`, { signal });
  }, [showingId]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const draft = readDraft();
      const same = draft?.screeningId === result.showing.id && draft?.movieId === result.movie.id;
      setData(result); setError(""); setStarted(showingHasStarted(result.showing));
      setSelectedSeatIds(same ? result.seats.filter(seat => !seat.reserved && draft.seatIds?.includes(seat.id)).map(seat => seat.id) : []);
      setTicketCounts(same ? Object.fromEntries((draft.ticketTypes || []).map(ticket => [ticket.ticketTypeId, Math.max(0, Number(ticket.quantity) || 0)])) : {});
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [load, attempt]);

  const seatRows = useMemo(() => {
    const rows = new Map();
    for (const seat of data?.seats || []) {
      const row = rows.get(seat.row_name) || [];
      row.push({ id: seat.id, label: seat.seat_label, row: seat.row_name, column: seat.seat_number, status: seat.reserved ? "reserved" : "available" });
      rows.set(seat.row_name, row);
    }
    return [...rows].map(([row, seats]) => ({ row, seats }));
  }, [data]);
  const tickets = (data?.ticket_types || []).map(ticket => ({ ticketTypeId: ticket.id, label: ticket.label, unitPrice: ticket.price,
    quantity: ticketCounts[ticket.id] || 0, lineTotal: ticket.price * (ticketCounts[ticket.id] || 0) })).filter(ticket => ticket.quantity > 0);
  const ticketSelection = { ticketTypes: tickets, totalQuantity: tickets.reduce((sum, ticket) => sum + ticket.quantity, 0),
    totalPrice: tickets.reduce((sum, ticket) => sum + ticket.lineTotal, 0) };

  async function proceed() {
    if (!data || busy || started) return;
    if (!selectedSeatIds.length || selectedSeatIds.length !== ticketSelection.totalQuantity) {
      setError("選択した座席数と券種の合計枚数を一致させてください。"); return;
    }
    setBusy(true); setError("");
    try {
      const latest = await cinemaApi(`screenings/${encodeURIComponent(data.showing.id)}`);
      if (showingHasStarted(latest.showing)) { setStarted(true); setError("この上映回の予約受付は終了しました。"); return; }
      const available = latest.seats.filter(seat => !seat.reserved && selectedSeatIds.includes(seat.id));
      if (available.length !== selectedSeatIds.length) {
        setData(latest); setSelectedSeatIds(available.map(seat => seat.id)); setError("選択した座席が予約されました。空席を選び直してください。"); return;
      }
      if (tickets.some(ticket => !latest.ticket_types.some(current => current.id === ticket.ticketTypeId && current.price === ticket.unitPrice))) {
        setData(latest); setError("チケット料金が更新されました。内容を確認して、もう一度お進みください。"); return;
      }
      const draft = { ...buildCatalogScreeningDraft(toScreening(latest.showing), latest.movie, readDraft()),
        seatIds: selectedSeatIds, seatLabels: available.map(seat => seat.seat_label), ticketTypes: tickets,
        ticketCount: ticketSelection.totalQuantity, ticketTotalPrice: ticketSelection.totalPrice };
      draft.totalPrice = draft.ticketTotalPrice + (draft.foodTotalPrice || 0);
      sessionStorage.setItem("movieReservationDraft", JSON.stringify(draft));
      router.push("/food");
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  if (!data) return <main className="cinema-container py-12"><p role={error ? "alert" : "status"}>{error || "最新の座席状況を読み込んでいます。"}</p>
    {error && <button className="cinema-button mt-5" onClick={() => setAttempt(value => value + 1)}>もう一度読み込む</button>}<Link href="/movie-now" className="cinema-text-link mt-6">作品一覧へ</Link></main>;
  const selectedScreening = toScreening(data.showing);
  const labels = data.seats.filter(seat => selectedSeatIds.includes(seat.id)).map(seat => seat.seat_label);
  return <main className="cinema-container grid items-start gap-6 py-8 text-[var(--text-primary)] md:grid-cols-[minmax(0,1fr)_320px]">
    <section className="min-w-0 rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-bg)] shadow-sm">
      <MovieSummary movie={data.movie} availableSeats={data.seats.filter(seat => !seat.reserved).length} selectedScreening={selectedScreening} />
      <SeatMap seatRows={seatRows} selectedSeatIds={selectedSeatIds} selectedScreening={selectedScreening}
        onSeatClick={seat => { if (!busy && !started && seat.status === "available") setSelectedSeatIds(current => current.includes(seat.id) ? current.filter(id => id !== seat.id) : [...current, seat.id]); }} />
    </section>
    <OrderPanel movieId={data.movie.id} availableTicketTypes={data.ticket_types} error={started ? "この上映回の予約受付は終了しました。" : error}
      isProceedDisabled={busy || started} onProceed={proceed} onTicketQuantityChange={(id, delta) => { if (!busy) setTicketCounts(current => ({ ...current, [id]: Math.max(0, (current[id] || 0) + delta) })); }}
      selectedScreening={selectedScreening} selectedSeatIds={labels} ticketCounts={ticketCounts} ticketSelection={ticketSelection} />
  </main>;
}

export default function SeatSelectionClient() {
  return <Suspense fallback={<p role="status" className="cinema-container py-12">座席を読み込んでいます…</p>}><Selection /></Suspense>;
}
