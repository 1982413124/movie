"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast-store.mjs";
import type { AdminSession } from "@/lib/cinema-types";
import { cinemaApi } from "@/lib/cinema-api";
import Icon, { type IconName } from "./Icon";

const notify = (message: string, error = false) => error ? toast.error(message) : toast.success(message);
export const useNotice = () => notify;
const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "ダッシュボード", icon: "grid" },
  { href: "/admin/movies", label: "作品ライブラリ", icon: "film" },
  { href: "/admin/schedule", label: "上映スケジュール", icon: "calendar" },
  { href: "/admin/reservations", label: "予約一覧", icon: "ticket" },
  { href: "/admin/coupons", label: "クーポン", icon: "ticket" },
  { href: "/admin/screens", label: "スクリーン", icon: "screen" },
];

export default function AdminShell({ session, children }: { session: AdminSession; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    document.querySelector<HTMLAnchorElement>(".admin-sidebar nav a")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); document.querySelector<HTMLButtonElement>(".nav-toggle")?.focus(); }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [open]);
  async function logout() {
    if (leaving) return;
    setLeaving(true);
    try {
      await cinemaApi("admin/logout", { method: "POST" }, session.csrf_token);
      router.replace("/admin/login"); router.refresh();
    } catch (error) { notify((error as Error).message, true); setLeaving(false); }
  }
  const current = navigation.find(item => item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href));
  return <div className={`admin-workspace ${open ? "nav-open" : ""}`}>
      <a className="admin-skip" href="#admin-main">本文へ移動</a>
      <aside className="admin-sidebar" aria-label="管理ナビゲーション">
        <Link href="/admin" className="admin-brand"><span className="brand-mark"><Icon name="film" size={23} /></span><span>HAL CINEMA<small>MANAGEMENT STUDIO</small></span></Link>
        <div className="admin-venue"><span className="venue-dot" />名古屋栄<small>THEATER WORKSPACE</small></div>
        <p className="nav-caption">ワークスペース</p>
        <nav>{navigation.map(item => {
          const selected = current?.href === item.href;
          return <Link href={item.href} key={item.href} onClick={() => setOpen(false)} className={`admin-nav-link ${selected ? "is-active" : ""}`} aria-current={selected ? "page" : undefined}><Icon name={item.icon} /><span>{item.label}</span>{selected && <span className="nav-active-dot" />}</Link>;
        })}</nav>
        <div className="sidebar-bottom"><p>映画を届ける、その裏側を。</p><Link href="/movie-now" target="_blank">公開サイトを見る<Icon name="external" size={15} /></Link><div className="sidebar-user"><span className="admin-avatar">HC</span><span><strong>{session.user.name}</strong><small>管理者</small></span><button type="button" className="icon-button" aria-label="ログアウト" disabled={leaving} onClick={logout}><Icon name="logout" /></button></div></div>
      </aside>
      {open && <button className="nav-scrim" aria-label="メニューを閉じる" onClick={() => setOpen(false)} />}
      <div className="admin-body">
        <header className="admin-topbar"><button type="button" className="icon-button nav-toggle" aria-label="メニュー" aria-expanded={open} onClick={() => setOpen(v => !v)}><Icon name="menu" /></button><div><span className="topbar-prefix">ワークスペース</span><span className="topbar-divider">/</span><span>{current?.label ?? "作品の編集"}</span></div><span className="staff-badge"><span />ADMIN ACCESS</span></header>
        <main id="admin-main" className="admin-content">{children}</main>
        <footer className="admin-footer"><span>HAL CINEMA · MANAGEMENT STUDIO</span><span>上映日の基準：日本時間</span></footer>
      </div>
    </div>;
}
