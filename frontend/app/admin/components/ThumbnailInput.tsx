"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cinemaApi } from "@/lib/cinema-api";
import { validateImage } from "@/lib/movie-domain.mjs";
import { useNotice } from "./AdminShell";
import Icon from "./Icon";

export default function ThumbnailInput({ value, onChange, onBusy, onPreview, csrf, error, disabled }: {
  value: string; onChange: (value: string) => void; onBusy: (busy: boolean) => void;
  onPreview: (value: string) => void; csrf: string; error?: string; disabled: boolean;
}) {
  const [local, setLocal] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | null>(null);
  const blob = useRef("");
  const dragDepth = useRef(0);
  const notify = useNotice();
  const releaseBlob = useCallback(() => { if (blob.current) { URL.revokeObjectURL(blob.current); blob.current = ""; } }, []);
  const accept = useCallback(async (file: File) => {
    if (disabled) return;
    const problem = validateImage(file);
    if (problem) { setUploadError(problem); notify(problem, true); return; }
    active.current?.abort(); releaseBlob();
    const controller = new AbortController(); active.current = controller;
    blob.current = URL.createObjectURL(file);
    setLocal(blob.current); onPreview(blob.current); setUploadError(""); setUploading(true); onBusy(true);
    const data = new FormData(); data.set("image", file);
    try {
      const result = await cinemaApi<{ url: string }>("admin/uploads", { method: "POST", body: data, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) }, csrf);
      if (active.current !== controller) return;
      onChange(result.url); onPreview(result.url); setLocal(""); releaseBlob(); notify("画像を追加しました。");
    } catch (cause) {
      if (controller.signal.aborted) return;
      setUploadError((cause as Error).message); notify((cause as Error).message, true); setLocal(""); onPreview(value); releaseBlob();
    } finally {
      if (active.current === controller) { setUploading(false); onBusy(false); }
    }
  }, [csrf, disabled, notify, onBusy, onChange, onPreview, releaseBlob, value]);
  useEffect(() => {
    function paste(event: ClipboardEvent) {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (!files.length || disabled) return;
      event.preventDefault(); void accept(files[0]);
    }
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [accept, disabled]);
  useEffect(() => () => { active.current?.abort(); releaseBlob(); }, [releaseBlob]);
  function remove() {
    active.current?.abort(); active.current = null; releaseBlob(); setLocal(""); onChange(""); onPreview("");
    setUploading(false); onBusy(false); setUploadError(""); if (input.current) input.current.value = "";
  }
  const src = local || value;
  return <div className="thumbnail-field">
    <div className={`thumbnail-zone ${dragging ? "is-dragging" : ""} ${src ? "has-image" : ""} ${error || uploadError ? "has-error" : ""}`}
      onDragEnter={event => { event.preventDefault(); dragDepth.current++; setDragging(true); }}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
      onDragLeave={event => { event.preventDefault(); dragDepth.current--; if (dragDepth.current <= 0) setDragging(false); }}
      onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); const file = event.dataTransfer.files[0]; if (file) void accept(file); }}>
      {src ? <div className="thumbnail-image"><Image src={src} alt="選択したサムネイル" fill sizes="200px" unoptimized className="poster-image" /></div> : <span className="upload-symbol"><Icon name="upload" size={25} /></span>}
      <div className="thumbnail-instructions"><strong>{dragging ? "ここにドロップ" : uploading ? "画像を保存しています…" : src ? "画像を追加しました" : "画像を貼り付け"}</strong><p>{src ? "別の画像を貼り付けると置き換わります" : <><kbd>Ctrl</kbd> + <kbd>V</kbd>、またはドラッグ＆ドロップ</>}</p><button type="button" name="poster_image" aria-describedby={error || uploadError ? "poster_image-error" : undefined} className="admin-button secondary compact" onClick={() => input.current?.click()} disabled={disabled}>{src ? "画像を変更" : "ファイルを選択"}</button>{src && <button type="button" className="text-button" onClick={remove} disabled={disabled}>画像を削除</button>}</div>
      {uploading && <span className="upload-progress" role="status"><span className="admin-spinner" /><span className="sr-only">画像を保存中</span></span>}
    </div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label="サムネイル画像ファイル" onChange={event => { const file = event.target.files?.[0]; if (file) void accept(file); event.target.value = ""; }} />
    <p className="field-hint">JPEG・PNG・WebP / 最大5MB・20メガピクセル</p>
    {(uploadError || error) && <p className="field-error" id="poster_image-error" role="alert">{uploadError || error}</p>}
  </div>;
}
