"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { STATUS_LABELS } from "@/lib/movie-domain.mjs";
import type { MovieStatus } from "@/lib/cinema-types";
import Icon from "./Icon";
import { useToastError } from "@/lib/use-toast-error";

export function StatusBadge({ status }: { status: MovieStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}><span />{STATUS_LABELS[status]}</span>;
}

export function Poster({ src, title, className = "" }: { src: string | null; title: string; className?: string }) {
  return <div className={`admin-poster ${className}`}><PosterContent key={src} src={src} title={title} /></div>;
}

function PosterContent({ src, title }: { src: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <Image src={src} alt={`${title}のポスター`} fill sizes="(max-width: 900px) 240px, 320px" className="poster-image" unoptimized onError={() => setFailed(true)} /> : <span className="poster-empty"><Icon name="image" size={30} /><span>{failed ? "画像を確認してください" : "NO IMAGE"}</span></span>;
}

export function LoadingRows() {
  return <div className="admin-skeleton" role="status" aria-label="読み込み中">{Array.from({ length: 4 }, (_, i) => <div className="skeleton-row" key={i}><span /><div><i /><i /></div><b /></div>)}<span className="sr-only">読み込み中</span></div>;
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  useToastError(message);
  return <div className="admin-empty" role="alert"><span className="empty-icon"><Icon name="alert" size={28} /></span><h2>情報を取得できませんでした</h2><p>{message}</p><button className="admin-button secondary" onClick={retry}>再試行</button></div>;
}

export function Dialog({ title, children, onClose, busy = false }: { title: string; children: React.ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLButtonElement>(".dialog-actions .secondary")?.focus();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className="admin-dialog" aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="dialog-top"><span className="eyebrow">確認</span><button type="button" className="icon-button" aria-label="閉じる" disabled={busy} onClick={onClose}><Icon name="close" /></button></div><h2 id="dialog-title">{title}</h2>{children}
  </dialog>;
}
