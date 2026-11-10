"use client";

import { useRef, useState } from "react";
import { cinemaApi, CinemaError } from "@/lib/cinema-api";
import type { Movie } from "@/lib/cinema-types";
import { useNotice } from "./AdminShell";
import { toast } from "@/lib/toast-store.mjs";
import { useToastError } from "@/lib/use-toast-error";
import AutoScheduleSettings from "./AutoScheduleSettings";

type Result = { message: string; auto_schedule: { created_count: number; unfilled_count: number; unfilled_dates: string[] } };

export default function AutoSchedulePanel({ movies, csrf, onComplete }: { movies: Movie[]; csrf: string; onComplete: () => Promise<void> }) {
  const [movieId, setMovieId] = useState("");
  const [daily, setDaily] = useState(3);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  useToastError(error);
  const lock = useRef(false);
  const notify = useNotice();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!movieId || lock.current) return;
    lock.current = true; setBusy(true); setResult(null); setError("");
    try {
      const response = await cinemaApi<Result>(`admin/movies/${encodeURIComponent(movieId)}/auto-schedule`, { method: "POST", body: JSON.stringify({ daily_showings: daily }) }, csrf);
      setResult(response);
      if (response.auto_schedule.unfilled_count > 0) toast.warning(response.message);
      else notify(response.message);
      await onComplete();
    } catch (cause) { setError((cause as CinemaError).message); }
    finally { lock.current = false; setBusy(false); }
  }
  return <form onSubmit={submit} className="form-panel schedule-form" style={{ marginBottom: 24 }}>
    <div className="form-section-heading"><span>自動</span><div><h2>上映回を自動で割り当てる</h2><p>登録済みの上映回を残して、1日の設定回数に足りない分を追加します。</p></div></div>
    <label className="admin-field">自動割り当てする作品<select required value={movieId} disabled={busy} onChange={event => { setMovieId(event.target.value); setResult(null); setError(""); }}>
      <option value="">作品を選択</option>{movies.map(movie => <option key={movie.id} value={movie.id}>{movie.title}</option>)}
    </select></label>
    <AutoScheduleSettings daily={daily} onDailyChange={value => { setDaily(value); setResult(null); setError(""); }} disabled={busy} />
    {error && <p className="admin-inline-error" role="alert">{error}</p>}
    {result && <div role="status" className="form-status-note" style={{ display: "block" }}><p>{result.message}</p>
      {result.auto_schedule.unfilled_dates.length > 0 && <details><summary>割り当てが足りない日を確認</summary><p>{result.auto_schedule.unfilled_dates.join("、")}</p></details>}
    </div>}
    <button className="admin-button primary" disabled={busy || !movieId}>{busy ? "割り当て中…" : "自動で割り当てる"}</button>
  </form>;
}
