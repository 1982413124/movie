"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cinemaApi, CinemaError } from "@/lib/cinema-api";
import { filterMovies, STATUS_LABELS } from "@/lib/movie-domain.mjs";
import type { AdminSession, Movie, MovieStatus } from "@/lib/cinema-types";
import { useNotice } from "./AdminShell";
import { useToastError } from "@/lib/use-toast-error";
import { Dialog, ErrorState, LoadingRows, Poster, StatusBadge } from "./Shared";
import Icon from "./Icon";

export default function MovieLibrary({ session, dashboard = false }: { session: AdminSession; dashboard?: boolean }) {
  const notify = useNotice();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Movie | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  useToastError(deleteError);
  const searchRef = useRef<HTMLInputElement>(null);
  const deleteLock = useRef(false);
  const load = useCallback(() => cinemaApi<{ movies: Movie[] }>("admin/movies")
    .then(result => { setMovies(result.movies); setError(""); })
    .catch((cause: Error) => setError(cause.message))
    .finally(() => setLoading(false)), []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); searchRef.current?.focus(); }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const filtered = useMemo(() => filterMovies(movies, query, filter, sort) as Movie[], [movies, query, filter, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12);
  const metrics = [
    { status: "ALL", label: "総作品数", english: "TOTAL FILMS", count: movies.length },
    ...(["NOW_SHOWING", "COMING_SOON", "ENDED"] as MovieStatus[]).map(status => ({ status, label: STATUS_LABELS[status], english: status.replaceAll("_", " "), count: movies.filter(movie => movie.status === status).length })),
  ];
  async function remove() {
    if (!target || deleteLock.current) return;
    deleteLock.current = true; setDeleting(true); setDeleteError("");
    try {
      await cinemaApi(`admin/movies/${target.id}`, { method: "DELETE", body: JSON.stringify({ updated_at: target.updated_at }) }, session.csrf_token);
      setMovies(previous => previous.filter(movie => movie.id !== target.id)); setTarget(null); notify("映画を削除しました。");
    } catch (cause) { setDeleteError((cause as CinemaError).message); }
    finally { deleteLock.current = false; setDeleting(false); }
  }
  return <div className="admin-page-enter">
    <div className="admin-page-heading"><div><p className="eyebrow">{dashboard ? "WORKSPACE OVERVIEW" : "FILM LIBRARY"}</p><h1>{dashboard ? "今日のワークスペース" : "作品ライブラリ"}</h1><p className="admin-muted">{dashboard ? "公開状況を確認して、次の上映を準備しましょう。" : "作品の登録から公開まで、ここで管理できます。"}</p></div><Link className="admin-button primary" href="/admin/movies/new"><Icon name="plus" />映画を追加</Link></div>
    <div className="admin-metrics">{metrics.map(metric => <button type="button" className={`metric-cell ${filter === metric.status ? "selected" : ""}`} key={metric.status} onClick={() => { setFilter(metric.status); setPage(1); }} aria-pressed={filter === metric.status}><span className="metric-label">{metric.label}<span className={`metric-dot dot-${metric.status.toLowerCase()}`} /></span><strong key={metric.count}>{loading ? "—" : metric.count.toString().padStart(2, "0")}</strong><small>{metric.english}</small></button>)}</div>
    <section className="library-panel" aria-label="映画一覧">
      <div className="library-heading"><div><h2>{dashboard ? "作品の公開状況" : "すべての作品"}</h2><span className="count-chip">{movies.length}</span></div><span className="admin-muted library-note">上映期間に合わせて状態を自動更新</span></div>
      <div className="library-toolbar"><label className="admin-search"><Icon name="search" /><input ref={searchRef} aria-label="作品を検索" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="タイトル・ジャンルで検索" /><kbd>Ctrl K</kbd></label><div className="toolbar-selects"><label><span className="sr-only">上映状態</span><select value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="ALL">すべての状態</option>{Object.entries(STATUS_LABELS).map(([status, label]) => <option value={status} key={status}>{label}</option>)}</select></label><label><span className="sr-only">並び替え</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="updated">更新が新しい順</option><option value="title">タイトル順</option><option value="start">上映開始日順</option></select></label></div></div>
      {loading ? <LoadingRows /> : error ? <ErrorState message={error} retry={load} /> : !filtered.length ? <div className="admin-empty"><span className="empty-icon"><Icon name="film" size={28} /></span><h2>{movies.length ? "条件に合う作品がありません" : "最初の一本を登録しましょう"}</h2><p>{movies.length ? "検索ワードや上映状態を変えてお試しください。" : "ポスターと作品情報を追加して、上映の準備を始めましょう。"}</p>{movies.length ? <button className="admin-button secondary" onClick={() => { setQuery(""); setFilter("ALL"); }}>条件をクリア</button> : <Link className="admin-button primary" href="/admin/movies/new"><Icon name="plus" />映画を追加</Link>}</div> : <>
        <div className="library-columns" aria-hidden="true"><span>作品</span><span>公開状態</span><span>上映期間</span><span>上映時間</span><span>操作</span></div>
        <ul className="library-list">{visible.map(movie => <li key={movie.id} className="library-row"><Link href={`/admin/movies/${movie.id}`} className="library-movie"><Poster src={movie.poster_image} title={movie.title} /><div><span className="movie-genre">{movie.genre || "ジャンル未設定"}</span><h3>{movie.title}</h3><span className="movie-release">{movie.release_date ? `${movie.release_date.replaceAll("-", ".")} 公開` : "公開日未設定"}{movie.has_reservations && <span className="history-marker" title="予約履歴が保存されています"><Icon name="ticket" size={13} />予約あり</span>}</span></div></Link><div><StatusBadge status={movie.status} /></div><div className="row-period">{movie.screening_start ? <><span>{movie.screening_start.replaceAll("-", ".")}</span><span className="period-end">〜 {movie.screening_end?.replaceAll("-", ".")}</span></> : <span className="admin-muted">期間を設定してください</span>}</div><span className="row-runtime">{movie.duration_minutes}<small> min</small></span><div className="row-actions"><Link href={`/admin/movies/${movie.id}/edit`} className="row-edit"><Icon name="edit" size={15} />編集</Link><button type="button" className="icon-button delete-button" aria-label={`${movie.title}を削除`} onClick={() => { setTarget(movie); setDeleteError(""); }}><Icon name="trash" size={16} /></button></div></li>)}</ul>
        <div className="library-pagination"><span>{filtered.length}作品中 {(currentPage - 1) * 12 + 1}〜{Math.min(currentPage * 12, filtered.length)}件</span><div><button className="icon-button" aria-label="前のページ" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><Icon name="arrow" style={{ transform: "rotate(180deg)" }} /></button><span>{currentPage} / {pages}</span><button className="icon-button" aria-label="次のページ" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><Icon name="arrow" /></button></div></div>
      </>}
    </section>
    <div className="library-tip"><Icon name="image" size={17} /><span>登録画面では <kbd>Ctrl</kbd> + <kbd>V</kbd> でポスターを貼り付けられます。</span></div>
    {target && <Dialog title="この映画を削除しますか？" onClose={() => setTarget(null)} busy={deleting}><div className="delete-preview"><Poster src={target.poster_image} title={target.title} /><div><strong>{target.title}</strong><StatusBadge status={target.status} /></div></div><p className="dialog-copy">{target.has_reservations ? "予約履歴のある作品は削除できません。購入履歴を保護するため、上映終了後も保存されます。" : `作品と関連する上映回${target.showing_count ?? 0}件を削除します。この操作は取り消せません。`}</p>{deleteError && <p className="admin-inline-error" role="alert">{deleteError}</p>}<div className="dialog-actions"><button className="admin-button secondary" onClick={() => setTarget(null)} disabled={deleting} autoFocus>キャンセル</button><button className="admin-button danger" disabled={deleting || target.has_reservations} onClick={remove}>{deleting ? <span className="admin-spinner" /> : <Icon name="trash" size={16} />}{deleting ? "削除しています…" : "削除する"}</button></div></Dialog>}
  </div>;
}
