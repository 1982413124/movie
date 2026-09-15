"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cinemaApi, CinemaError } from "@/lib/cinema-api";
import { movieStatus, validateMovie, youtubeId } from "@/lib/movie-domain.mjs";
import type { AdminSession, Movie, MovieInput, MovieStatus } from "@/lib/cinema-types";
import Icon from "./Icon";
import { useNotice } from "./AdminShell";
import { toast } from "@/lib/toast-store.mjs";
import { Dialog, ErrorState, LoadingRows, Poster, StatusBadge } from "./Shared";
import ThumbnailInput from "./ThumbnailInput";
import AutoScheduleSettings from "./AutoScheduleSettings";

const empty: MovieInput = { title: "", genre: "", duration_minutes: 0, age_rating: "G", synopsis: "", poster_image: "", release_date: "", screening_start: "", screening_end: "", trailer_url: "", director: "", cast_members: "", distributor: "", official_site_url: "" };

export default function MovieForm({ session, movieId }: { session: AdminSession; movieId?: string }) {
  const router = useRouter(); const notify = useNotice();
  const [form, setForm] = useState<MovieInput>(empty);
  const [original, setOriginal] = useState(JSON.stringify(empty));
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(Boolean(movieId));
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);
  const [automatic, setAutomatic] = useState(true);
  const [daily, setDaily] = useState(3);
  const [uploading, setUploading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState("/admin/movies");
  const lock = useRef(false); const formRef = useRef<HTMLFormElement>(null);
  const dirty = JSON.stringify(form) !== original || (!movieId && (!automatic || daily !== 3));
  const status = movieStatus(form.screening_start, form.screening_end) as MovieStatus;
  const videoId = youtubeId(form.trailer_url);
  const load = useCallback(() => {
    if (!movieId) return;
    return cinemaApi<{ movie: Movie }>(`admin/movies/${movieId}`).then(({ movie }) => {
      const values: MovieInput = { ...empty, title: movie.title, genre: movie.genre ?? "", duration_minutes: movie.duration_minutes, age_rating: movie.age_rating ?? "G", synopsis: movie.synopsis ?? "", poster_image: movie.poster_image ?? "", release_date: movie.release_date ?? "", screening_start: movie.screening_start ?? "", screening_end: movie.screening_end ?? "", trailer_url: movie.trailer_url ?? "", director: movie.director ?? "", cast_members: movie.cast_members ?? "", distributor: movie.distributor ?? "", official_site_url: movie.official_site_url ?? "", updated_at: movie.updated_at };
      setLoadError(""); setForm(values); setOriginal(JSON.stringify(values)); setPreview(values.poster_image);
    }).catch((cause: Error) => setLoadError(cause.message)).finally(() => setLoading(false));
  }, [movieId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || uploading) { event.preventDefault(); event.returnValue = ""; } };
    const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); formRef.current?.requestSubmit(); } };
    const followLink = (event: MouseEvent) => {
      if ((!dirty && !uploading) || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.getAttribute("href")?.startsWith("#")) return;
      event.preventDefault(); event.stopPropagation(); setLeaveTarget(link.href); setLeaving(true);
    };
    window.addEventListener("beforeunload", warn); window.addEventListener("keydown", shortcut);
    document.addEventListener("click", followLink, true);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("keydown", shortcut); document.removeEventListener("click", followLink, true); };
  }, [dirty, uploading]);
  const changePoster = useCallback((value: string) => { setForm(current => ({ ...current, poster_image: value })); setErrors(current => ({ ...current, poster_image: "" })); }, []);
  function change(key: keyof MovieInput, value: string | number) {
    setForm(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: "" }));
  }
  function cancel() { if (dirty || uploading) { setLeaveTarget("/admin/movies"); setLeaving(true); } else router.push("/admin/movies"); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current || uploading) return;
    const problems = validateMovie(form) as Record<string, string>; setErrors(problems); setSaveError("");
    if (Object.keys(problems).length) {
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(problems)[0]}"]`)?.focus();
      notify("入力内容を確認してください。", true); return;
    }
    lock.current = true; setBusy(true);
    try {
      const response = await cinemaApi<{ message: string; auto_schedule?: { unfilled_count: number } | null }>(movieId ? `admin/movies/${movieId}` : "admin/movies", { method: movieId ? "PUT" : "POST", body: JSON.stringify(movieId ? form : { ...form, auto_schedule: automatic, daily_showings: daily }) }, session.csrf_token);
      setOriginal(JSON.stringify(form));
      if (response.auto_schedule?.unfilled_count) toast.warning(response.message);
      else notify(response.message);
      router.push(!movieId && automatic ? "/admin/schedule" : "/admin/movies"); router.refresh();
    } catch (cause) {
      const failure = cause as CinemaError; setSaveError(failure.message); setErrors(failure.fields ?? {}); notify(failure.message, true);
    } finally { lock.current = false; setBusy(false); }
  }
  const field = (key: keyof MovieInput, label: string, type = "text", extra: Record<string, string | number> = {}) => <label className="admin-field" key={key}>{label}<input name={key} type={type} value={form[key] === 0 ? "" : form[key] ?? ""} onChange={event => change(key, type === "number" ? Number(event.target.value) : event.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined} disabled={busy} {...extra} />{errors[key] && <span className="field-error" id={`${key}-error`}>{errors[key]}</span>}</label>;
  if (loading) return <LoadingRows />;
  if (loadError) return <ErrorState message={loadError} retry={load} />;
  return <div className="admin-page-enter">
    <button type="button" onClick={cancel} className="back-link"><Icon name="arrow" style={{ transform: "rotate(180deg)" }} />作品ライブラリ</button>
    <div className="admin-page-heading form-page-heading"><div><p className="eyebrow">{movieId ? "EDIT FILM" : "NEW FILM"}</p><h1>{movieId ? "作品を編集" : "新しい作品を追加"}</h1><p className="admin-muted">作品の魅力が伝わる情報を、ひとつずつ。</p></div><span className="required-note">年齢区分・予告編・キャスト・スタッフ・公式サイトは任意</span></div>
    <form ref={formRef} onSubmit={submit} noValidate className="movie-form">
      <div className="form-columns"><div className="form-sections">
        <section className="form-panel"><div className="form-section-heading"><span>01</span><div><h2>基本情報</h2><p>作品を見つけるための情報です。</p></div></div>{field("title", "映画タイトル", "text", { placeholder: "映画の正式タイトル", maxLength: 255 })}<div className="field-row">{field("genre", "ジャンル", "text", { placeholder: "例：アニメーション", maxLength: 100, list: "movie-genres" })}{field("duration_minutes", "上映時間（分）", "number", { min: 1, max: 600, step: 1, placeholder: "120" })}</div><datalist id="movie-genres">{["アニメーション", "アクション", "ドラマ", "コメディ", "SF", "ホラー", "ドキュメンタリー", "ファンタジー"].map(genre => <option key={genre} value={genre} />)}</datalist><div className="field-row">{field("release_date", "公開日", "date")}{field("age_rating", "年齢区分", "text", { maxLength: 20, placeholder: "G / PG12 / R15+" })}</div></section>
        <section className="form-panel"><div className="form-section-heading"><span>02</span><div><h2>サムネイル</h2><p>作品のポスターやキービジュアルを登録します。</p></div></div><ThumbnailInput value={form.poster_image} onChange={changePoster} onBusy={setUploading} onPreview={setPreview} csrf={session.csrf_token} error={errors.poster_image} disabled={busy} /></section>
        <section className="form-panel"><div className="form-section-heading"><span>03</span><div><h2>上映情報</h2><p>上映状態は、この期間から自動で切り替わります。</p></div></div><div className="field-row">{field("screening_start", "上映開始日", "date")}{field("screening_end", "上映終了日", "date")}</div><div className="form-status-note"><StatusBadge status={status} /><span>日本時間の本日を基準に表示</span></div>{!movieId && <div style={{ marginTop: 20 }}><label style={{ display: "flex", alignItems: "center", gap: 10 }}><input type="checkbox" checked={automatic} onChange={event => setAutomatic(event.target.checked)} disabled={busy} style={{ width: 18, height: 18 }} />映画の追加と同時に上映回を自動で割り当てる</label>{automatic && <AutoScheduleSettings daily={daily} onDailyChange={setDaily} disabled={busy} />}{(errors.auto_schedule || errors.daily_showings) && <p className="field-error" role="alert">{errors.auto_schedule || errors.daily_showings}</p>}</div>}</section>
        <section className="form-panel"><div className="form-section-heading"><span>04</span><div><h2>作品紹介</h2><p>あらすじと公式予告編を掲載します。</p></div></div><label className="admin-field">あらすじ<textarea name="synopsis" rows={6} value={form.synopsis} maxLength={10000} onChange={event => change("synopsis", event.target.value)} placeholder="物語のあらすじを入力してください。" aria-invalid={Boolean(errors.synopsis)} aria-describedby={errors.synopsis ? "synopsis-error" : undefined} disabled={busy} />{errors.synopsis && <span id="synopsis-error" className="field-error">{errors.synopsis}</span>}<small className="character-count">{form.synopsis.length.toLocaleString()} / 10,000</small></label>{field("trailer_url", "公式YouTube予告URL（任意）", "url", { placeholder: "https://www.youtube.com/watch?v=…", maxLength: 500 })}{form.trailer_url && !videoId && !errors.trailer_url && <p className="field-error">YouTube動画のURLを確認してください。</p>}{videoId && <iframe className="trailer-frame" src={`https://www.youtube-nocookie.com/embed/${videoId}`} title="公式予告編のプレビュー" allow="encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}</section>
        <section className="form-panel">
          <div className="form-section-heading"><span>05</span><div><h2>キャスト・スタッフ・公式サイト</h2><p>入力した項目だけを公開ページに表示します。</p></div></div>
          {field("director", "監督（任意）", "text", { placeholder: "監督名", maxLength: 255 })}
          <label className="admin-field">キャスト（任意）
            <textarea name="cast_members" rows={4} value={form.cast_members} maxLength={4000} onChange={event => change("cast_members", event.target.value)} placeholder={"出演者名を入力してください。\n複数名は改行して入力できます。"} aria-invalid={Boolean(errors.cast_members)} aria-describedby={errors.cast_members ? "cast_members-error" : undefined} disabled={busy} />
            {errors.cast_members && <span id="cast_members-error" className="field-error">{errors.cast_members}</span>}
            <small className="character-count">{form.cast_members.length.toLocaleString()} / 4,000</small>
          </label>
          {field("distributor", "配給（任意）", "text", { placeholder: "配給会社名", maxLength: 255 })}
          {field("official_site_url", "公式サイトURL（任意）", "url", { placeholder: "https://…", maxLength: 2000 })}
        </section>
      </div><aside className="form-preview"><div className="preview-label"><span className="live-dot" />LIVE PREVIEW<span>公開イメージ</span></div><div className="preview-card"><Poster src={preview || form.poster_image || null} title={form.title || "新しい作品"} /><div className="preview-card-copy"><StatusBadge status={status} /><h2>{form.title || "映画タイトル"}</h2><p className="preview-meta">{form.genre || "ジャンル"}<span>·</span>{form.duration_minutes || "—"} min</p>{form.release_date && <p className="preview-release">{form.release_date.replaceAll("-", ".")} 公開</p>}<p className="preview-synopsis">{form.synopsis || "入力したあらすじがここに表示されます。"}</p><div className="preview-period"><Icon name="calendar" size={15} /><span>{form.screening_start || "上映開始日"} 〜<br />{form.screening_end || "上映終了日"}</span></div></div></div><p className="preview-help">入力内容をリアルタイムに表示しています。<br />保存すると公開サイトに反映されます。</p></aside></div>
      <div className="form-action-bar"><div><span className={`save-indicator ${dirty ? "is-dirty" : ""}`} />{busy ? "保存しています…" : uploading ? "画像を保存しています…" : dirty ? "未保存の変更があります" : "作品情報を入力してください"}<small>Ctrl + S で保存</small></div><div><button type="button" onClick={cancel} className="admin-button secondary" disabled={busy}>キャンセル</button><button className="admin-button primary" type="submit" disabled={busy || uploading}>{busy ? <span className="admin-spinner" /> : <Icon name="check" />}{busy ? "保存中…" : movieId ? "変更を保存" : "映画を登録"}</button></div></div>{saveError && <div className="form-save-error" role="alert">{saveError}{saveError.includes("更新") && <button type="button" className="text-button" onClick={load}>最新の情報を読み込む</button>}{saveError.includes("ログイン") && <Link href="/admin/login">ログイン画面へ</Link>}</div>}
    </form>
    {leaving && <Dialog title="変更を破棄しますか？" onClose={() => setLeaving(false)}><p className="dialog-copy">入力した内容はまだ保存されていません。</p><div className="dialog-actions"><button className="admin-button secondary" autoFocus onClick={() => setLeaving(false)}>編集を続ける</button><button className="admin-button danger" onClick={() => router.push(leaveTarget)}>破棄して移動</button></div></Dialog>}
  </div>;
}
