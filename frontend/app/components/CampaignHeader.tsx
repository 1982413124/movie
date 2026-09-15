"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useReducedMotion } from "./useReducedMotion";

gsap.registerPlugin(useGSAP);

const primaryNavItems = [
  { href: "/", label: "ホーム", meta: "Home" },
  { href: "/movie-now", label: "作品を探す", meta: "Films" },
  { href: "/mypage", label: "マイページ", meta: "My Page" },
];
const menuItems = [
  { href: "/#today", label: "本日観られる映画", meta: "TODAY" },
  { href: "/#experience", label: "予約の流れ", meta: "HOW TO" },
  { href: "/theater", label: "劇場案内", meta: "THEATER" },
  { href: "/guide", label: "ご利用ガイド", meta: "GUIDE" },
  { href: "/login", label: "ログイン", meta: "SIGN IN" },
];

export default function CampaignHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scope = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isMenuOpen]);

  useGSAP(() => {
    const modal = dialog.current;
    if (!modal || !panel.current) return;
    const close = () => {
      modal.close();
      menuButton.current?.focus({ preventScroll: true });
    };
    if (isMenuOpen) {
      if (!modal.open) modal.showModal();
      if (reducedMotion) return;
      gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.18 });
      gsap.fromTo(panel.current, { x: 32 }, { x: 0, duration: 0.24, ease: "power2.out" });
      gsap.fromTo(panel.current.querySelectorAll("[data-menu-link]"),
        { x: 8, opacity: 0 }, { x: 0, opacity: 1, duration: 0.2, stagger: 0.018, delay: 0.04, ease: "power2.out" });
    } else if (modal.open) {
      if (reducedMotion) close();
      else gsap.to(modal, { opacity: 0, duration: 0.16, onComplete: close });
    }
  }, { scope, dependencies: [isMenuOpen, reducedMotion], revertOnUpdate: true });

  return (
    <div ref={scope}>
      <a href="#main-content" className="skip-link">本文へ移動</a>
      <header className="site-header">
        <nav aria-label="メインナビゲーション" className="site-nav">
          <Link href="/" aria-label="HAL CINEMA ホーム" className="site-brand">
            <span aria-hidden="true" className="site-brand-mark">H</span>
            <span>HAL <span className="font-medium">CINEMA</span></span>
          </Link>
          <div className="site-nav-links">
            {primaryNavItems.map((item) => {
              const isCurrent = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return <Link key={item.href} href={item.href} aria-current={isCurrent ? "page" : undefined} className="site-nav-link">
                {item.label}
              </Link>;
            })}
          </div>
          <button ref={menuButton} type="button" aria-controls="campaign-menu" aria-expanded={isMenuOpen}
            aria-label="メニューを開く" onClick={() => setIsMenuOpen(true)} className="site-menu-button">
            <span className={isMenuOpen ? "menu-icon is-open" : "menu-icon"} aria-hidden="true"><span /><span /><span /></span>
            <span>メニュー</span>
          </button>
        </nav>
      </header>
      <dialog ref={dialog} id="campaign-menu" role="dialog" aria-modal="true" aria-labelledby="menu-title"
        className="site-menu-dialog"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)'));
          const first = controls[0];
          const last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}
        onCancel={(event) => { event.preventDefault(); setIsMenuOpen(false); }}
        onClick={(event) => { if (event.target === event.currentTarget) setIsMenuOpen(false); }}>
        <div ref={panel} className="site-menu-panel">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-5">
            <h2 id="menu-title" className="text-xl font-bold">メニュー</h2>
            <button type="button" className="cinema-button cinema-button-secondary" onClick={() => setIsMenuOpen(false)}>
              <span aria-hidden="true" className="menu-icon is-open"><span /><span /><span /></span>閉じる
            </button>
          </div>
          <p className="mb-2 mt-6 text-xs font-bold text-[var(--text-muted)]">映画・予約</p>
          {primaryNavItems.map((item) => <Link data-menu-link key={item.href} href={item.href}
            onClick={() => setIsMenuOpen(false)} className="site-menu-link">{item.label}<span aria-hidden="true">›</span></Link>)}
          <p className="mb-2 mt-7 text-xs font-bold text-[var(--text-muted)]">ご案内・会員サービス</p>
          {menuItems.map((item) => <Link data-menu-link key={item.href} href={item.href}
            onClick={() => setIsMenuOpen(false)} className="site-menu-link">{item.label}<span aria-hidden="true">›</span></Link>)}
          <Link data-menu-link href="/register" onClick={() => setIsMenuOpen(false)} className="cinema-button mt-7 w-full">会員登録</Link>
        </div>
      </dialog>
      <div className="h-[80px]" aria-hidden="true" />
      <span id="main-content" tabIndex={-1} className="block scroll-mt-24 outline-none" />
    </div>
  );
}
