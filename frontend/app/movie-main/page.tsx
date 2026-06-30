"use client";

/* eslint-disable @next/next/no-img-element -- Local images are intentionally optional; native img lets missing assets fall back to designed CSS posters. */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  bookingSteps,
  featuredMovies,
  heroImage,
  nowShowing,
  type MovieCardData,
} from "../data/movieCatalog";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Home() {
  const pageRef = useRef<HTMLDivElement>(null);
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
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: "(min-width: 900px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { isDesktop, reduceMotion } = context.conditions ?? {};
          const progress = { value: 0 };
          const progressEl = document.querySelector(".js-loader-progress");

          if (reduceMotion) {
            gsap.set(".js-loader", { autoAlpha: 0, display: "none" });
            gsap.set(".js-intro, .js-reveal, .js-card", {
              autoAlpha: 1,
              clearProps: "transform",
            });
            return;
          }

          gsap.set(".js-loader-line", {
            scaleX: 0,
            transformOrigin: "left center",
          });
          gsap.set(".js-intro, .js-reveal, .js-card", { autoAlpha: 0 });
          gsap.set(".js-hero-word", { yPercent: 115 });

          gsap
            .timeline({
              defaults: { ease: "power3.out" },
              onStart: () => {
                document.body.style.overflow = "hidden";
              },
              onComplete: () => {
                document.body.style.overflow = "";
                ScrollTrigger.refresh();
              },
            })
            .to(
              progress,
              {
                value: 100,
                duration: 1.15,
                ease: "power4.inOut",
                onUpdate: () => {
                  if (progressEl) {
                    progressEl.textContent = `${Math.round(progress.value)}`;
                  }
                },
              },
              0,
            )
            .to(
              ".js-loader-line",
              { scaleX: 1, duration: 1.15, ease: "power4.inOut" },
              0,
            )
            .to(
              ".js-loader-mark",
              { autoAlpha: 0, y: -18, duration: 0.42 },
              0.95,
            )
            .to(
              ".js-loader",
              { yPercent: -100, duration: 0.85, ease: "power4.inOut" },
              1.12,
            )
            .set(".js-loader", { display: "none" })
            .addLabel("hero", "-=0.5")
            .to(".js-intro", { autoAlpha: 1, duration: 0.01 }, "hero")
            .to(
              ".js-hero-word",
              {
                yPercent: 0,
                duration: 0.9,
                stagger: 0.08,
                ease: "power4.out",
              },
              "hero",
            )
            .fromTo(
              ".js-hero-visual",
              { autoAlpha: 0, scale: 0.92, y: 54, rotation: -2 },
              {
                autoAlpha: 1,
                scale: 1,
                y: 0,
                rotation: 0,
                duration: 0.95,
                ease: "power4.out",
              },
              "hero+=0.18",
            )
            .fromTo(
              ".js-hero-cta, .js-booking-rail",
              { autoAlpha: 0, y: 20 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.55,
                stagger: 0.1,
                ease: "power3.out",
              },
              "hero+=0.55",
            );

          gsap.to(".js-hero-visual", {
            yPercent: isDesktop ? 12 : 5,
            scale: 1.04,
            ease: "none",
            scrollTrigger: {
              trigger: ".js-hero",
              start: "top top",
              end: "bottom top",
              scrub: 1,
            },
          });

          gsap.to(".js-marquee-line", {
            xPercent: isDesktop ? -24 : -12,
            ease: "none",
            scrollTrigger: {
              trigger: ".js-showcase",
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          });

          ScrollTrigger.batch(".js-reveal, .js-card", {
            start: "top 84%",
            once: true,
            onEnter: (elements) => {
              gsap.fromTo(
                elements,
                { autoAlpha: 0, y: 44 },
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.8,
                  stagger: 0.1,
                  ease: "power3.out",
                },
              );
            },
          });

          const cards = gsap.utils.toArray<HTMLElement>(".js-card");
          const cleanupCallbacks = cards.map((card) => {
            const media = card.querySelector<HTMLElement>(".js-card-media");
            const glow = card.querySelector<HTMLElement>(".js-card-glow");

            const enter = () => {
              gsap.to(card, {
                y: -10,
                rotationX: 2,
                duration: 0.42,
                ease: "power3.out",
                overwrite: "auto",
              });
              gsap.to(media, {
                scale: 1.06,
                duration: 0.55,
                ease: "power3.out",
                overwrite: "auto",
              });
              gsap.to(glow, {
                autoAlpha: 1,
                xPercent: 18,
                duration: 0.5,
                ease: "power2.out",
                overwrite: "auto",
              });
            };

            const leave = () => {
              gsap.to(card, {
                y: 0,
                rotationX: 0,
                duration: 0.55,
                ease: "power3.out",
                overwrite: "auto",
              });
              gsap.to(media, {
                scale: 1,
                duration: 0.55,
                ease: "power3.out",
                overwrite: "auto",
              });
              gsap.to(glow, {
                autoAlpha: 0,
                xPercent: 0,
                duration: 0.35,
                ease: "power2.out",
                overwrite: "auto",
              });
            };

            card.addEventListener("pointerenter", enter);
            card.addEventListener("pointerleave", leave);
            card.addEventListener("focusin", enter);
            card.addEventListener("focusout", leave);

            return () => {
              card.removeEventListener("pointerenter", enter);
              card.removeEventListener("pointerleave", leave);
              card.removeEventListener("focusin", enter);
              card.removeEventListener("focusout", leave);
            };
          });

          return () => {
            cleanupCallbacks.forEach((cleanup) => cleanup());
          };
        },
      );

      return () => mm.revert();
    },
    { scope: pageRef },
  );

  useGSAP(
    () => {
      const panel = document.querySelector(".js-menu-panel");

      if (!panel) {
        return;
      }

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
    { dependencies: [isMenuOpen], scope: pageRef },
  );

  return (
    <div
      ref={pageRef}
      className="cinema-campaign min-h-screen overflow-hidden bg-[#FFF8E1] text-[#1C0800]"
    >
      <OpeningLoader />
      <CampaignMenu isOpen={isMenuOpen} onClose={closeMenu} />
      <CampaignNav isOpen={isMenuOpen} onMenuToggle={toggleMenu} />

      <main>
        <section className="js-hero relative min-h-screen overflow-hidden px-5 pb-8 pt-20 sm:px-8 lg:px-12">
          <div className="hero-fallback absolute inset-0" />
          <div className="cinema-grain absolute inset-0 opacity-45" />

          <div className="relative z-10 mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-7xl items-end gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="js-intro pb-6">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.42em] text-[#8C5D2A]">
                Movie Reservation
              </p>
              <h1 className="text-[18vw] font-black uppercase leading-[0.78] tracking-normal text-[#1C0800] sm:text-[15vw] lg:text-[9.6rem]">
                <span className="block overflow-hidden">
                  <span className="js-hero-word block">HAL</span>
                </span>
                <span className="block overflow-hidden">
                  <span className="js-hero-word block">CINEMA</span>
                </span>
              </h1>
              <div className="js-hero-cta mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/movie-detail"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#E82020] px-7 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#C01818] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E82020]"
                >
                  上映時間を見る
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#1C0800]/22 px-7 text-sm font-bold uppercase tracking-[0.16em] text-[#1C0800] transition hover:border-[#1C0800] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E82020]"
                >
                  Login
                </Link>
              </div>
            </div>

            <div className="js-hero-visual relative hidden min-h-[620px] overflow-hidden border border-[#1C0800]/14 bg-white p-3 shadow-[0_35px_120px_rgba(0,0,0,0.16)] lg:block">
              <div className="poster-fallback absolute inset-3 [--movie-accent:#d6d6d6]" />
              <CampaignImage
                imageSrc={heroImage.imageSrc}
                imageAlt={heroImage.imageAlt}
                className="js-card-media relative h-full w-full object-cover opacity-80 mix-blend-screen"
              />
              <div className="absolute left-6 top-6 bg-[#E82020] px-3 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-white">
                Screen 01
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between border-t border-white/20 pt-5 text-white">
                <span className="text-4xl font-black uppercase leading-none">
                  21:10
                </span>
                <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#1C0800]">
                  Select
                </span>
              </div>
            </div>
          </div>

          <div className="js-booking-rail relative z-10 mx-auto grid max-w-7xl border-y border-[#1C0800]/14 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[#5C3010] sm:grid-cols-3">
            {bookingSteps.map((step) => (
              <div
                key={step.label}
                className="flex min-h-12 items-center justify-between gap-3 border-[#1C0800]/10 py-2 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
              >
                <span className="font-mono text-[#1C0800]">{step.label}</span>
                <span>{step.title}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="relative z-10 px-5 pb-20 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-3 border border-[#1C0800]/14 bg-white/90 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur md:grid-cols-[1fr_auto_auto]">
            <label className="sr-only" htmlFor="movie-search">
              映画を検索
            </label>
            <input
              id="movie-search"
              type="text"
              placeholder="Title / Genre"
              className="min-h-12 w-full bg-[#FFF8E1] px-5 text-sm text-[#1C0800] outline-none ring-1 ring-[#E82020]/12 transition placeholder:text-[#A0703A] focus:ring-[#E82020]"
            />
            <Link
              href="/search"
              className="inline-flex min-h-12 items-center justify-center px-6 text-sm font-bold uppercase tracking-[0.14em] text-[#1C0800] ring-1 ring-[#E82020]/18 transition hover:bg-[#E82020] hover:text-white hover:ring-[#E82020]"
            >
              Search
            </Link>
            <Link
              href="/movie-detail"
              className="inline-flex min-h-12 items-center justify-center bg-[#E82020] px-6 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#C01818] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E82020]"
            >
              予約へ
            </Link>
          </div>
        </section>

        <section
          id="featured"
          className="js-showcase relative px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
        >
          <div className="js-marquee-line pointer-events-none absolute left-4 top-10 whitespace-nowrap text-[18vw] font-black uppercase leading-none tracking-normal text-[#E82020]/[0.07]">
            Now Showing
          </div>

          <div className="relative mx-auto max-w-7xl">
            <SectionHeader eyebrow="Selection" title="NOW SHOWING" />

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {featuredMovies.map((movie, index) => (
                <MovieCard key={movie.id} movie={movie} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="relative border-t border-[#1C0800]/10 px-5 py-20 sm:px-8 lg:px-12">
          <div className="relative mx-auto max-w-7xl">
            <SectionHeader eyebrow="Schedule" title="BOOK A SEAT" />

            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {nowShowing.map((movie, index) => (
                <CompactMovieCard key={movie.id} movie={movie} index={index} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function OpeningLoader() {
  return (
    <div className="js-loader fixed inset-0 z-[80] flex bg-[#FFF8E1] text-[#1C0800]">
      <div className="m-auto w-[min(520px,78vw)]">
        <div className="js-loader-mark text-center text-4xl font-black uppercase leading-none tracking-[0.12em] sm:text-6xl">
          HAL
          <br />
          CINEMA
        </div>
        <div className="mt-10 h-px overflow-hidden bg-[#E82020]/14">
          <div className="js-loader-line h-full w-full bg-[#E82020]" />
        </div>
        <div className="mt-4 text-center font-mono text-sm text-[#8C5D2A]">
          <span className="js-loader-progress">0</span>%
        </div>
      </div>
    </div>
  );
}

const primaryNavItems = [
  { href: "/", label: "ホーム", meta: "Home" },
  { href: "/detail", label: "上映中の作品", meta: "Films" },
  { href: "/search", label: "検索", meta: "Search" },
  { href: "/mypage", label: "マイページ", meta: "My Page" },
];

const menuItems = [
  {
    href: "/movie-detail",
    label: "上映スケジュール",
    meta: "Schedule",
  },
  {
    href: "#featured",
    label: "映画一覧",
    meta: "Lineup",
  },
  {
    href: "/confirm",
    label: "購入情報確認",
    meta: "Confirm",
  },
  {
    href: "/mypage",
    label: "予約状況確認",
    meta: "My Tickets",
  },
];

function CampaignNav({
  isOpen,
  onMenuToggle,
}: {
  isOpen: boolean;
  onMenuToggle: () => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#1C0800]/14 bg-[#FFF8E1]/92 text-[#1C0800] backdrop-blur-xl">
      <nav className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_128px] items-stretch lg:grid-cols-[132px_repeat(4,minmax(0,1fr))_148px]">
        <Link
          href="/"
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
          aria-expanded={isOpen}
          onClick={onMenuToggle}
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
  );
}

function CampaignMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <div
      id="campaign-menu"
      aria-hidden={!isOpen}
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
              onClick={onClose}
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
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="js-reveal flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.42em] text-[#8C5D2A]">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-5xl font-black uppercase leading-none tracking-normal text-[#1C0800] sm:text-6xl lg:text-8xl">
          {title}
        </h2>
      </div>
      <Link
        href="/movie-detail"
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#1C0800]/22 px-5 text-xs font-bold uppercase tracking-[0.16em] text-[#1C0800] transition hover:border-[#1C0800] hover:bg-white"
      >
        Reserve
      </Link>
    </div>
  );
}

function MovieCard({ movie, index }: { movie: MovieCardData; index: number }) {
  const style = { "--movie-accent": movie.accent } as CSSProperties;

  return (
    <Link
      href="/movie-detail"
      className="js-card group relative min-h-[500px] overflow-hidden border border-[#1C0800]/14 bg-white/82 p-3 text-[#1C0800] shadow-[0_18px_70px_rgba(0,0,0,0.08)] outline-none transition-colors hover:border-[#1C0800] focus-visible:border-[#1C0800] focus-visible:ring-2 focus-visible:ring-[#E82020]"
      style={style}
    >
      <span className="js-card-glow pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-[linear-gradient(90deg,transparent,rgba(232,32,32,0.22),transparent)] opacity-0 blur-2xl" />
      <div className="relative flex h-full flex-col">
        <div className="relative aspect-[3/4] overflow-hidden bg-[#1C0800]">
          <div className="poster-fallback absolute inset-0" style={style} />
          <CampaignImage
            imageSrc={movie.imageSrc}
            imageAlt={movie.imageAlt}
            className="js-card-media absolute inset-0 h-full w-full object-cover opacity-86 transition-opacity duration-300 group-hover:opacity-95"
          />
          <div className="absolute left-3 top-3 bg-[#E82020]/88 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
            {movie.screen}
          </div>
          <div className="absolute bottom-3 right-3 font-mono text-5xl font-black text-white/18">
            0{index + 1}
          </div>
        </div>

        <div className="flex flex-1 flex-col pt-5">
          <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-[#8C5D2A]">
            <span>{movie.genre}</span>
            <span>{movie.runtime}</span>
          </div>
          <h3 className="mt-4 text-3xl font-black uppercase leading-none tracking-normal text-[#1C0800]">
            {movie.title}
          </h3>
          <div className="mt-auto flex items-center justify-between gap-4 border-t border-[#1C0800]/12 pt-5">
            <span className="text-sm font-bold text-[#5C3010]">
              {movie.schedule}
            </span>
            <span className="shrink-0 rounded-full bg-[#E82020] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
              予約
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CompactMovieCard({
  movie,
  index,
}: {
  movie: MovieCardData;
  index: number;
}) {
  const style = { "--movie-accent": movie.accent } as CSSProperties;

  return (
    <Link
      href="/movie-detail"
      className="js-reveal group grid grid-cols-[84px_1fr] gap-4 border border-[#1C0800]/12 bg-white/82 p-3 text-[#1C0800] outline-none transition hover:border-[#1C0800] focus-visible:border-[#1C0800] focus-visible:ring-2 focus-visible:ring-[#E82020]"
      style={style}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[#1C0800]">
        <div className="poster-fallback absolute inset-0" style={style} />
        <CampaignImage
          imageSrc={movie.imageSrc}
          imageAlt={movie.imageAlt}
          className="absolute inset-0 h-full w-full object-cover opacity-74 transition duration-300 group-hover:scale-105 group-hover:opacity-95"
        />
      </div>
      <div className="min-w-0 py-1">
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.16em] text-[#A0703A]">
          <span>0{index + 1}</span>
          <span>{movie.rating}</span>
        </div>
        <h3 className="mt-3 text-lg font-black uppercase leading-tight text-[#1C0800]">
          {movie.title}
        </h3>
        <p className="mt-4 text-xs font-semibold text-[#5C3010]">
          {movie.schedule}
        </p>
      </div>
    </Link>
  );
}

function CampaignImage({
  imageSrc,
  imageAlt,
  className,
}: {
  imageSrc: string;
  imageAlt: string;
  className: string;
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const image = new Image();

    image.onload = () => {
      if (active) {
        setLoadedSrc(imageSrc);
      }
    };
    image.onerror = () => {
      if (active) {
        setLoadedSrc(null);
      }
    };
    image.src = imageSrc;

    return () => {
      active = false;
    };
  }, [imageSrc]);

  if (!loadedSrc) {
    return <span className="sr-only">{imageAlt}</span>;
  }

  return (
    <img
      src={loadedSrc}
      alt={imageAlt}
      className={`${className} campaign-image`}
    />
  );
}
