"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cinemaApi } from "@/lib/cinema-api";
import { useToastError } from "@/lib/use-toast-error";
import Icon from "../components/Icon";
import AdminCat from "../components/AdminCat";
import { CAT_SUCCESS_DELAY_MS, type CatMood } from "@/lib/login-cat-behavior";
import "./cat-login.css";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const lock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<CatMood>("idle");
  const [error, setError] = useState("");
  useToastError(error);
  const reason = search.get("reason");
  const busy = phase === "busy" || phase === "success";
  const success = phase === "success";
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (phase !== "success") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => { router.replace("/admin/movies"); router.refresh(); }, reduced ? 450 : CAT_SUCCESS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [phase, router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setPhase("busy"); setError("");
    const data = new FormData(event.currentTarget);
    const abort = new AbortController(); request.current = abort;
    try {
      await cinemaApi("admin/login", { method:"POST", body:JSON.stringify({email:data.get("email"),password:data.get("password")}), signal:AbortSignal.any([abort.signal, AbortSignal.timeout(20000)]) });
      if (!abort.signal.aborted) setPhase("success");
    } catch (cause) {
      if (!abort.signal.aborted) { setError((cause as Error).message); setPhase("error"); lock.current = false; }
    }
  }
  return <main className="cat-login">
    <header className="cat-login-header">
      <div className="cat-login-brand"><span className="cat-login-mark"><Icon name="film" size={23} /></span><span>HAL CINEMA<small>MANAGEMENT STUDIO</small></span></div>
      <span className="cat-login-access"><span /> STAFF ACCESS</span>
    </header>
    <section className={`cat-login-card ${success ? "is-success" : ""}`} aria-labelledby="cat-login-title">
      <AdminCat mood={phase} />
      <div className="cat-login-intro"><span className="cat-login-eyebrow">WELCOME BACK</span><h1 id="cat-login-title">管理者ログイン</h1><p>今日も、いい上映を。</p></div>
      <form method="post" onSubmit={submit} className="cat-login-form" aria-busy={phase === "busy"}>
        {reason && !error && !success && <p className="cat-login-notice" role="status">{reason === "unavailable" ? "サーバーに接続できません。時間をおいて再試行してください。" : "ログインし直してください。"}</p>}
        <label htmlFor="admin-email">メールアドレス</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" placeholder="メールアドレスを入力" required maxLength={255} disabled={busy} spellCheck={false} autoCapitalize="none" />
        <label htmlFor="admin-password">パスワード</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" placeholder="パスワードを入力" required maxLength={1024} disabled={busy} />
        {error && <p className="cat-login-error" role="alert">{error}</p>}
        <div className="cat-login-result" role="status" aria-live="polite" aria-atomic="true">{success && <><Icon name="check" size={17} /><span>ログインしました</span></>}</div>
        <button className="cat-login-submit" type="submit" disabled={busy}>{phase === "busy" ? <span className="admin-spinner" /> : null}<span>{success ? "管理画面へ移動します…" : phase === "busy" ? "認証しています…" : "ログイン"}</span>{success ? <Icon name="check" /> : <Icon name="arrow" />}</button>
        <p className="cat-login-help">アカウントの発行は運営担当者へご連絡ください。</p>
      </form>
    </section>
    <footer className="cat-login-footer"><span>HAL CINEMA · NAGOYA SAKAE</span><span>BEHIND EVERY GREAT SCREENING.</span></footer>
  </main>;
}
export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }
