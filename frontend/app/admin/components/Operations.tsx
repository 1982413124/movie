"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cinemaApi } from "@/lib/cinema-api";
import type { AdminSession, Movie, Screen, Showing } from "@/lib/cinema-types";
import { japanDate } from "@/lib/movie-domain.mjs";
import { useNotice } from "./AdminShell";
import { useToastError } from "@/lib/use-toast-error";
import { ErrorState, LoadingRows } from "./Shared";
import Icon from "./Icon";
import AutoSchedulePanel from "./AutoSchedulePanel";

type Reservation = { id: number; order_num: string; order_status: string; total_amount: number; created_at: string; seat_count: number; movie_title: string };
type Data = { screens: Screen[]; showings: Showing[]; reservations: Reservation[] };
export default function Operations({ session, view }: { session: AdminSession; view: "schedule" | "reservations" | "screens" }) {
  const [data, setData] = useState<Data | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [error, setError] = useState(""); const [formError, setFormError] = useState("");
  useToastError(formError);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ movie_id: "", screen_id: "", show_date: japanDate(), start_time: "10:00" });
  const lock = useRef(false); const notify = useNotice();
  const load = useCallback(() => Promise.all([cinemaApi<Data>("admin/operations"), cinemaApi<{ movies: Movie[] }>("admin/movies")])
    .then(([operations, catalog]) => { setData(operations); setMovies(catalog.movies); setError(""); })
    .catch((cause: Error) => setError(cause.message)), []);
  useEffect(() => { void load(); }, [load]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setFormError("");
    try { await cinemaApi("admin/showings", { method: "POST", body: JSON.stringify(form) }, session.csrf_token); notify("上映回を登録しました。"); await load(); }
    catch (cause) { setFormError((cause as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  const title = { schedule: "上映スケジュール", reservations: "予約一覧", screens: "スクリーン" }[view];
  if (error) return <ErrorState message={error} retry={load} />;
  if (!data) return <LoadingRows />;
  const statuses: Record<string, string> = { paid: "支払済み", pending: "決済待ち", cancelled: "キャンセル", expired: "期限切れ" };
  return <div className="admin-page-enter"><div className="admin-page-heading"><div><p className="eyebrow">THEATER OPERATIONS</p><h1>{title}</h1><p className="admin-muted">{view === "schedule" ? "作品とスクリーンを選んで、上映回を登録します。" : view === "reservations" ? "新しい予約から100件を表示しています。金額は購入時の記録です。" : "登録済みスクリーンの座席数を確認できます。"}</p></div></div>
    {view === "screens" && <div className="operations-grid">{data.screens.map(screen => <section className="screen-card" key={screen.id}><Icon name="screen" size={34} /><p className="eyebrow">{screen.theater_name}</p><h2>{screen.name}</h2><strong>{screen.seat_count}</strong><small>席</small></section>)}</div>}
    {view === "schedule" && <AutoSchedulePanel movies={movies} csrf={session.csrf_token} onComplete={load} />}
    {view === "schedule" && <><form className="form-panel schedule-form" onSubmit={save}><div className="form-section-heading"><span><Icon name="plus" size={14} /></span><div><h2>上映回を追加</h2><p>上映時間は作品の長さから計算します。同じスクリーンの重複は登録できません。</p></div></div><div className="field-row"><label className="admin-field">作品<select required value={form.movie_id} onChange={event => setForm({ ...form, movie_id: event.target.value })}><option value="">作品を選択</option>{movies.map(movie => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select></label><label className="admin-field">スクリーン<select required value={form.screen_id} onChange={event => setForm({ ...form, screen_id: event.target.value })}><option value="">スクリーンを選択</option>{data.screens.map(screen => <option key={screen.id} value={screen.id}>{screen.name} · {screen.seat_count}席</option>)}</select></label><label className="admin-field">上映日<input type="date" required min={japanDate()} value={form.show_date} onChange={event => setForm({ ...form, show_date: event.target.value })} /></label><label className="admin-field">開始時刻<input type="time" required value={form.start_time} onChange={event => setForm({ ...form, start_time: event.target.value })} /></label></div>{formError && <p className="admin-inline-error" role="alert">{formError}</p>}<button className="admin-button primary" disabled={busy}>{busy ? <span className="admin-spinner" /> : <Icon name="plus" />}{busy ? "登録中…" : "上映回を登録"}</button></form></>}
    {view === "reservations" && <div className="operation-list">{data.reservations.length ? data.reservations.map(reservation => <article className="operation-row" key={reservation.id}><div><p>{reservation.order_num}</p><h3>{reservation.movie_title || "フード注文"}</h3><p>{new Date(reservation.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} · {reservation.seat_count}席</p></div><div><span className="status-badge status-ended">{statuses[reservation.order_status] ?? reservation.order_status}</span><strong>¥{reservation.total_amount.toLocaleString()}</strong></div></article>) : <div className="admin-empty"><Icon name="ticket" size={30} /><h2>予約はまだありません</h2></div>}</div>}

  </div>;
}
