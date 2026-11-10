"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cinemaApi } from "@/lib/cinema-api";
import type { Movie, Showing } from "@/lib/cinema-types";
import SeatMap from "./SeatMap";

type Seat = { id: string; row_name: string; seat_number: number; seat_label: string; reserved: boolean };
type Ticket = { id: string; label: string; price: number };
type BookingData = { movie: Movie; showing: Showing; seats: Seat[]; ticket_types: Ticket[] };

function hasStarted(showing: Showing) {
  return new Date(`${showing.show_date}T${showing.start_time}+09:00`).getTime() <= Date.now();
}

function Selection() {
  const router = useRouter(); const params = useSearchParams();
  const [data, setData] = useState<BookingData | null>(null);
  const [error, setError] = useState(""); const [selection, setSelection] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const load = useCallback(() => {
    let showingId = params.get("showingId");
    if (!showingId) { try { showingId = JSON.parse(sessionStorage.getItem("movieReservationDraft") || "{}").screeningId; } catch { /* An invalid draft is handled below. */ } }
    const request = showingId ? cinemaApi<BookingData>(`screenings/${showingId}`) : Promise.reject(new Error("作品詳細で上映回を選んでください。"));
    return request.then(result => {
      setData(result); setError(""); setStarted(hasStarted(result.showing));
      try {
        const draft = JSON.parse(sessionStorage.getItem("movieReservationDraft") || "{}");
        if (draft.screeningId === result.showing.id) {
          setSelection(current => current.length ? current : result.seats.filter(seat => !seat.reserved && draft.seatIds?.includes(seat.id)).map(seat => seat.id));
          setCounts(current => Object.keys(current).length ? current : Object.fromEntries((draft.ticketTypes ?? []).filter((ticket: { ticketTypeId: string }) => result.ticket_types.some(type => type.id === ticket.ticketTypeId)).map((ticket: { ticketTypeId: string; quantity: number }) => [ticket.ticketTypeId, Math.max(0, Number(ticket.quantity) || 0)])));
        }
      } catch { /* Ignore an outdated or invalid local draft. */ }
    })
      .catch((cause: Error) => setError(cause.message));
  }, [params]);
  useEffect(() => { void load(); }, [load]);
  const rows = useMemo(() => {
    const grouped = new Map<string, { id: string; label: string; row: string; column: number; status: string }[]>();
    for (const seat of data?.seats ?? []) { const row = grouped.get(seat.row_name) ?? []; row.push({ id: seat.id, label: seat.seat_label, row: seat.row_name, column: seat.seat_number, status: seat.reserved ? "reserved" : "available" }); grouped.set(seat.row_name, row); }
    return [...grouped].map(([row, seats]) => ({ row, seats }));
  }, [data]);
  const ticketTypes = data?.ticket_types.map(ticket => ({ ticketTypeId: ticket.id, label: ticket.label, unitPrice: ticket.price, quantity: counts[ticket.id] || 0 })).filter(ticket => ticket.quantity > 0) ?? [];
  const ticketCount = ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0);
  const total = ticketTypes.reduce((sum, ticket) => sum + ticket.quantity * ticket.unitPrice, 0);
  async function proceed() {
    if (!data || busy) return;
    if (!selection.length || selection.length !== ticketCount) { setError("座席数と券種の合計枚数をそろえてください。"); return; }
    setBusy(true); setError("");
    try {
      const latest = await cinemaApi<BookingData>(`screenings/${data.showing.id}`);
      if (hasStarted(latest.showing)) { setStarted(true); return; }
      const conflicts = latest.seats.filter(seat => seat.reserved && selection.includes(seat.id));
      if (conflicts.length) { setData(latest); setSelection(current => current.filter(id => !conflicts.some(seat => seat.id === id))); setError("選択した座席が予約されました。空席を選び直してください。"); return; }
      const { movie, showing } = latest;
      const draft = { movieId: movie.id, movieTitle: movie.title, movieDurationMinutes: movie.duration_minutes, moviePoster: movie.poster_image, screeningId: showing.id, screeningTime: showing.start_time.slice(0, 5), screeningDate: showing.show_date, screenId: showing.screen_id, screenName: showing.screen_name, screenCapacity: showing.capacity, theaterName: showing.theater_name, seatIds: selection, seatLabels: latest.seats.filter(seat => selection.includes(seat.id)).map(seat => seat.seat_label), ticketTypes, ticketCount, ticketTotalPrice: total, foodItems: [], foodTotalPrice: 0, totalPrice: total };
      window.sessionStorage.setItem("movieReservationDraft", JSON.stringify(draft));
      router.push("/food");
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  if (!data) return <main className="mx-auto max-w-5xl px-6 py-16">{error ? <div role="alert"><p>{error}</p><Link className="mt-5 inline-block underline" href="/movie-now">作品一覧へ</Link><button className="ml-5 underline" onClick={load}>再試行</button></div> : <p role="status">座席を読み込んでいます…</p>}</main>;
  const { movie, showing } = data;
  return <main className="mx-auto w-full max-w-7xl px-5 py-10"><Link className="text-sm underline" href={`/movie-detail?movieId=${movie.id}`}>← {movie.title}の上映回</Link><h1 className="mt-6 text-3xl font-bold">座席を選択</h1><p className="mt-3 text-sm">{movie.title} · {showing.show_date} {showing.start_time.slice(0, 5)} · {showing.screen_name}</p><div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]"><section className="min-w-0 rounded-lg border border-[#d7c9b7] bg-white"><SeatMap seatRows={rows} selectedSeatIds={selection} selectedScreening={{ theaterName: showing.theater_name }} onSeatClick={(seat: { id: string; status: string }) => { if (seat.status === "available") setSelection(current => current.includes(seat.id) ? current.filter(id => id !== seat.id) : [...current, seat.id]); }} /></section><aside className="h-fit rounded-lg border border-[#d7c9b7] bg-white p-6 lg:sticky lg:top-6"><h2 className="text-xl font-bold">チケット情報</h2><div className="my-5 space-y-4">{data.ticket_types.map(ticket => <div className="flex items-center justify-between gap-3" key={ticket.id}><div><p className="text-sm font-semibold">{ticket.label}</p><p className="text-xs text-[#8c765a]">¥{ticket.price.toLocaleString()}</p></div><div className="flex items-center gap-3"><button type="button" className="h-8 w-8 rounded border disabled:opacity-40" aria-label={`${ticket.label}を減らす`} disabled={!counts[ticket.id]} onClick={() => setCounts(current => ({ ...current, [ticket.id]: Math.max(0, (current[ticket.id] || 0) - 1) }))}>−</button><span>{counts[ticket.id] || 0}</span><button type="button" className="h-8 w-8 rounded border" aria-label={`${ticket.label}を増やす`} onClick={() => setCounts(current => ({ ...current, [ticket.id]: (current[ticket.id] || 0) + 1 }))}>+</button></div></div>)}</div><p className="border-t pt-4 text-sm">選択した座席：{data.seats.filter(seat => selection.includes(seat.id)).map(seat => seat.seat_label).join("、") || "未選択"}</p><p className="mt-3 flex justify-between text-lg font-bold"><span>合計 {ticketCount}枚</span><span>¥{total.toLocaleString()}</span></p>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}{started && <p className="mt-4 text-sm text-red-700">この上映回の予約受付は終了しました。</p>}<button className="mt-5 w-full rounded-lg bg-[#b64227] px-4 py-4 text-sm font-bold text-white disabled:opacity-50" onClick={proceed} disabled={busy || started}>{busy ? "空席を確認しています…" : "フード選択へ進む"}</button></aside></div></main>;
}
export default function DatabaseSeatSelection() { return <Suspense><Selection /></Suspense>; }
