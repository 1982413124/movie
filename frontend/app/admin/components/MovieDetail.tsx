"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cinemaApi } from "@/lib/cinema-api";
import type { Movie, Showing } from "@/lib/cinema-types";
import { ErrorState, LoadingRows, Poster, StatusBadge } from "./Shared";
import Icon from "./Icon";

export default function MovieDetail({ id }: { id: string }) {
  const [data, setData] = useState<{ movie: Movie; showings: Showing[] } | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => cinemaApi<{ movie: Movie; showings: Showing[] }>(`admin/movies/${id}`)
    .then(result => { setData(result); setError(""); })
    .catch((cause: Error) => setError(cause.message)), [id]);
  useEffect(() => { void load(); }, [load]);
  if (error) return <ErrorState message={error} retry={load} />;
  if (!data) return <LoadingRows />;
  const { movie, showings } = data;
  return <div className="admin-page-enter"><Link className="back-link" href="/admin/movies"><Icon name="arrow" style={{ transform: "rotate(180deg)" }} />作品ライブラリ</Link><div className="admin-page-heading"><div><p className="eyebrow">FILM DETAILS</p><h1>作品の詳細</h1></div><Link href={`/admin/movies/${id}/edit`} className="admin-button primary"><Icon name="edit" />編集する</Link></div><section className="admin-detail-grid"><Poster src={movie.poster_image} title={movie.title} /><div className="admin-detail-copy"><StatusBadge status={movie.status} /><h2>{movie.title}</h2><p>{movie.synopsis || "あらすじ未登録"}</p><dl className="detail-facts">{[["ジャンル", movie.genre], ["上映時間", `${movie.duration_minutes}分`], ["公開日", movie.release_date], ["年齢区分", movie.age_rating], ["上映開始日", movie.screening_start], ["上映終了日", movie.screening_end]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "未登録"}</dd></div>)}</dl><Link className="admin-button secondary" href={`/movie-detail?movieId=${id}`} target="_blank">公開ページを確認<Icon name="external" size={15} /></Link>{movie.youtube_id && <iframe className="trailer-frame" src={`https://www.youtube-nocookie.com/embed/${movie.youtube_id}`} title={`${movie.title} 公式予告編`} allow="encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}</div></section><div className="library-heading"><h2>上映スケジュール · {showings.length}回</h2><Link className="admin-button secondary compact" href="/admin/schedule"><Icon name="calendar" size={15} />上映回を管理</Link></div>{showings.length ? <div className="operation-list">{showings.map(showing => <div className="operation-row" key={showing.id}><div><h3>{showing.show_date} · {showing.start_time.slice(0, 5)}</h3><p>{showing.screen_name}</p></div><span className="admin-muted">予約 {showing.reserved_count} / {showing.capacity}席</span></div>)}</div> : <p className="admin-muted">上映回はまだ登録されていません。上映スケジュールから追加できます。</p>}</div>;
}
