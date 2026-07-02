"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const primaryNavItems = [
  { href: "/movie-main", label: "ホーム", meta: "Home" },
  { href: "/movie-now", label: "上映中", meta: "Films" },
  { href: "/search", label: "検索", meta: "Search" },
  { href: "/mypage", label: "マイページ", meta: "My Page" },
];

const menuItems = [
  { href: "/movie-main#schedule", label: "上映スケジュール", meta: "SCHEDULE" },
  { href: "/movie-main#lineup", label: "映画一覧", meta: "LINEUP" },
  { href: "/theater", label: "劇場案内", meta: "THEATER" },
  { href: "/guide", label: "ご利用ガイド", meta: "GUIDE" },
];

export default function CampaignHeader() {
  const headerRef = useRef<HTMLDivElement>(null);
  const menuHasInteractedRef = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    menuHasInteractedRef.current = true;
    setIsMenuOpen((current) => !current);
  };

  const closeMenu = () => {
    menuHasInteractedRef.current = true;
    setIsMenuOpen(false);
  };

  useGSAP(
    () => {
      const panel = document.querySelector(".js-menu-panel");
      if (!panel) return;

      if (!menuHasInteractedRef.current) {
        gsap.set(".js-menu-panel", {
          autoAlpha: 0,
          pointerEvents: "none",
          yPercent: -100,
        });
        gsap.set(".js-menu-link", { autoAlpha: 0, yPercent: 90 });
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion) {
        gsap.set(".js-menu-panel", {
          autoAlpha: isMenuOpen ? 1 : 0,
          pointerEvents: isMenuOpen ? "auto" : "none",
          yPercent: isMenuOpen ? 0 : -100,
        });
        gsap.set(".js-menu-link", {
          autoAlpha: isMenuOpen ? 1 : 0,
          yPercent: isMenuOpen ? 0 : 90,
        });
        gsap.set(".js-menu-line-top", {
          rotation: isMenuOpen ? 45 : 0,
          y: isMenuOpen ? 7 : 0,
        });
        gsap.set(".js-menu-line-middle", { scaleX: isMenuOpen ? 0 : 1 });
        gsap.set(".js-menu-line-bottom", {
          rotation: isMenuOpen ? -45 : 0,
          y: isMenuOpen ? -7 : 0,
        });
        document.body.style.overflow = isMenuOpen ? "hidden" : "";
        return;
      }

      const timeline = gsap.timeline({
        defaults: { ease: "power4.inOut" },
        onStart: () => {
          document.body.style.overflow = isMenuOpen ? "hidden" : "";
        },
        onComplete: () => {
          document.body.style.overflow = isMenuOpen ? "hidden" : "";
        },
      });

      if (isMenuOpen) {
        timeline
          .set(".js-menu-panel", { pointerEvents: "auto" })
          .to(".js-menu-panel", {
            autoAlpha: 1,
            duration: 0.72,
            yPercent: 0,
          })
          .to(
            ".js-menu-line-top",
            { duration: 0.42, rotation: 45, transformOrigin: "center", y: 7 },
            0,
          )
          .to(
            ".js-menu-line-middle",
            { duration: 0.32, scaleX: 0, transformOrigin: "center" },
            0,
          )
          .to(
            ".js-menu-line-bottom",
            { duration: 0.42, rotation: -45, transformOrigin: "center", y: -7 },
            0,
          )
          .fromTo(
            ".js-menu-word",
            { autoAlpha: 0, xPercent: 8 },
            { autoAlpha: 0.06, duration: 0.7, xPercent: 0 },
            0.1,
          )
          .fromTo(
            ".js-menu-link",
            { autoAlpha: 0, yPercent: 120 },
            {
              autoAlpha: 1,
              duration: 0.72,
              ease: "power4.out",
              stagger: 0.07,
              yPercent: 0,
            },
            0.28,
          );
      } else {
        timeline
          .to(".js-menu-link", {
            autoAlpha: 0,
            duration: 0.22,
            ease: "power2.in",
            stagger: 0.03,
            yPercent: -40,
          })
          .to(
            ".js-menu-panel",
            { autoAlpha: 0, duration: 0.62, yPercent: -100 },
            0,
          )
          .to(".js-menu-line-top", { duration: 0.38, rotation: 0, y: 0 }, 0)
          .to(".js-menu-line-middle", { duration: 0.28, scaleX: 1 }, 0)
          .to(".js-menu-line-bottom", { duration: 0.38, rotation: 0, y: 0 }, 0)
          .set(".js-menu-panel", { pointerEvents: "none" });
      }

      return () => {
        timeline.kill();
      };
    },
    { dependencies: [isMenuOpen], scope: headerRef },
  );

  return (
    <div ref={headerRef}>
      {/* スライドメニューパネル */}
      <div
        id="campaign-menu"
        aria-hidden={!isMenuOpen}
        className="js-menu-panel invisible fixed inset-0 z-40 overflow-hidden bg-[#FFF8E1] text-[#1C0800]"
      >
        <div className="js-menu-word pointer-events-none absolute -bottom-8 left-4 text-[22vw] font-black uppercase leading-none tracking-normal text-[#1C0800]">
          Menu
        </div>
        <div className="mx-auto grid min-h-screen max-w-7xl content-end gap-10 px-5 pb-12 pt-28 sm:px-8 lg:grid-cols-[0.72fr_1fr] lg:px-12">
          <div className="hidden border-t border-[#1C0800]/14 pt-5 text-sm font-semibold leading-relaxed text-[#8C5D2A] lg:block">
            <span className="mb-4 block text-[10px] font-black uppercase tracking-[0.32em] text-[#1C0800]">
              HAL CINEMA
            </span>
            SCREEN 01
            <br />
            TOKYO
            <br />
            2026
          </div>
          <div className="grid border-t border-[#1C0800]/14">
            {menuItems.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMenu}
                className="js-menu-link group grid gap-3 border-b border-[#1C0800]/14 py-6 outline-none transition hover:bg-white focus-visible:bg-white sm:grid-cols-[72px_1fr_auto] sm:items-center sm:px-4"
              >
                <span className="font-mono text-sm text-[#A0703A]">
                  0{index + 1}
                </span>
                <span className="menu-label text-[clamp(2.15rem,3.7vw,3.5rem)] font-black leading-[0.96] tracking-normal">
                  {item.label}
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#A0703A] transition group-hover:text-[#1C0800]">
                  {item.meta}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ナビゲーションバー（fixed） */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#1C0800]/14 bg-[#FFF8E1]/92 text-[#1C0800] backdrop-blur-xl">
        <nav className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_128px] items-stretch lg:grid-cols-[132px_repeat(4,minmax(0,1fr))_148px]">
          <Link
            href="/movie-main"
            className="flex min-h-[76px] items-center border-r border-[#1C0800]/14 px-5 text-sm font-black uppercase leading-none tracking-[0.22em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E82020]"
          >
            HAL
            <br />
            CINEMA
          </Link>

          {primaryNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="hidden min-h-[76px] flex-col justify-center border-r border-[#1C0800]/14 px-5 transition hover:bg-white lg:flex"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.26em] text-[#A0703A]">
                {item.meta}
              </span>
              <span className="mt-2 text-sm font-bold">{item.label}</span>
            </Link>
          ))}

          <button
            type="button"
            aria-controls="campaign-menu"
            aria-expanded={isMenuOpen}
            onClick={toggleMenu}
            className="group flex min-h-[76px] w-full items-center justify-between gap-4 border-l border-[#1C0800]/14 px-5 text-left transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E82020]"
          >
            <span className="hidden text-[10px] font-black uppercase tracking-[0.26em] text-[#A0703A] sm:block">
              Menu
            </span>
            <span className="relative block h-5 w-12">
              <span className="js-menu-line js-menu-line-top absolute left-0 top-0 h-0.5 w-12 bg-[#E82020]" />
              <span className="js-menu-line js-menu-line-middle absolute left-0 top-[9px] h-0.5 w-12 bg-[#E82020]" />
              <span className="js-menu-line js-menu-line-bottom absolute bottom-0 left-0 h-0.5 w-12 bg-[#E82020]" />
            </span>
          </button>
        </nav>
      </header>

      {/* fixed headerの高さ分スペーサー */}
      <div className="h-[77px]" aria-hidden="true" />
    </div>
  );
}
