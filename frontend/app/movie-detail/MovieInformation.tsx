"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowTopRightOnSquareIcon, ChevronDownIcon, PlayIcon } from "@heroicons/react/24/solid";
import type { Movie } from "@/lib/cinema-types";
import { officialSiteUrl } from "@/lib/movie-domain.mjs";
import styles from "./movie-information.module.css";

function Synopsis({ text }: { text: string }) {
  const id = useId();
  const paragraph = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const element = paragraph.current;
    if (!element) return;
    const measure = () => setCanExpand(element.scrollHeight > parseFloat(getComputedStyle(element).lineHeight) * 4 + 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  return <div className={styles.panel}>
    <p ref={paragraph} id={id} className={`${styles.synopsis} ${expanded ? "" : styles.collapsed}`}>{text}</p>
    {canExpand && <button type="button" className={styles.readMore} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
      {expanded ? "閉じる" : "続きを読む"}<ChevronDownIcon aria-hidden="true" className={expanded ? styles.flipped : undefined} />
    </button>}
  </div>;
}

function Trailer({ movie }: { movie: Movie }) {
  const [playing, setPlaying] = useState(false);
  return <div className={styles.trailer}>
    {playing ? <iframe src={`https://www.youtube-nocookie.com/embed/${movie.youtube_id}?autoplay=1&rel=0`} title={`${movie.title} 公式予告編`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      : <button type="button" className={styles.playButton} onClick={() => setPlaying(true)} aria-label={`${movie.title}の予告動画を再生`}>
        {movie.poster_image && <Image src={movie.poster_image} alt="" fill unoptimized sizes="(max-width: 700px) 90vw, 800px" className={styles.trailerPoster} />}
        <span className={styles.trailerShade} />
        <span className={styles.playCircle}><PlayIcon aria-hidden="true" /></span>
        <span className={styles.playLabel}>予告動画を再生</span>
      </button>}
  </div>;
}

export default function MovieInformation({ movie }: { movie: Movie }) {
  const id = useId();
  const credits = [["監督", movie.director], ["キャスト", movie.cast_members], ["配給", movie.distributor]].filter(([, value]) => value?.trim());
  const officialUrl = officialSiteUrl(movie.official_site_url);
  return <div className={styles.information}>
    <section aria-labelledby={`${id}-synopsis`}>
      <h2 id={`${id}-synopsis`} className={styles.heading}>あらすじ</h2>
      <Synopsis key={movie.synopsis} text={movie.synopsis || "あらすじは準備中です。"} />
    </section>
    {(credits.length > 0 || officialUrl) && <section aria-labelledby={`${id}-credits`}>
      <h2 id={`${id}-credits`} className={styles.heading}>{credits.length ? "キャスト・スタッフ" : "公式サイト"}</h2>
      <div className={styles.panel}>
        {credits.length > 0 && <dl className={styles.credits}>{credits.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        {officialUrl && <div className={`${styles.officialSite} ${credits.length ? styles.withCredits : ""}`}>
          <a href={officialUrl} target="_blank" rel="noopener noreferrer"><span>公式サイトを見る</span><ArrowTopRightOnSquareIcon aria-hidden="true" /><span className="sr-only">（新しいタブで開きます）</span></a>
          <span className={styles.siteUrl}>{officialUrl}</span>
        </div>}
      </div>
    </section>}
    {movie.youtube_id && <section aria-labelledby={`${id}-trailer`}>
      <h2 id={`${id}-trailer`} className={styles.heading}>予告動画</h2>
      <Trailer key={movie.youtube_id} movie={movie} />
    </section>}
  </div>;
}
