"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CampaignHeader from "../components/CampaignHeader";
import {
  countAvailableSeats,
  findScreen,
  findScreening,
  getScreeningsForDate,
  getScreeningsForDateAndScreen,
  movieDetail,
  screeningDates,
  screenings,
  theaterScreens,
  ticketTypes,
} from "@/lib/seatSelection.mjs";

export default function MovieDetailPage() {
  const router = useRouter();
  const initialScreening = screenings[0];
  const [selectedDateId, setSelectedDateId] = useState(initialScreening.dateId);
  const [selectedScreenId, setSelectedScreenId] = useState(initialScreening.screenId);
  const [selectedScreeningId, setSelectedScreeningId] = useState(initialScreening.id);

  const selectedScreen = findScreen(selectedScreenId) ?? theaterScreens[0];
  const selectedScreening = findScreening(selectedScreeningId) ?? initialScreening;
  const dateScreenings = useMemo(
    () => getScreeningsForDate(selectedDateId),
    [selectedDateId],
  );
  const visibleScreenings = useMemo(
    () => getScreeningsForDateAndScreen(selectedDateId, selectedScreenId),
    [selectedDateId, selectedScreenId],
  );
  const availableSeats = countAvailableSeats(selectedScreening.id);

  function handleDateSelect(dateId: string) {
    const nextScreening = getScreeningsForDate(dateId)[0] ?? initialScreening;

    setSelectedDateId(dateId);
    setSelectedScreenId(nextScreening.screenId);
    setSelectedScreeningId(nextScreening.id);
  }

  function handleScreenSelect(screenId: string) {
    const nextScreening = getScreeningsForDateAndScreen(selectedDateId, screenId)[0];

    setSelectedScreenId(screenId);
    if (nextScreening) {
      setSelectedScreeningId(nextScreening.id);
    }
  }

  function handleProceedToSeats() {
    const draft = {
      movieId: movieDetail.id,
      screeningId: selectedScreening.id,
      screeningTime: selectedScreening.label,
      screenName: selectedScreening.screenName,
      seatIds: [],
      ticketCount: 0,
      ticketTotalPrice: 0,
      foodItems: [],
      foodTotalPrice: 0,
      totalPrice: 0,
    };

    window.sessionStorage.setItem("movieReservationDraft", JSON.stringify(draft));
    router.push("/seats");
  }

  return (
    <div className="min-h-screen bg-[#FFF8E1] text-[#1C0800]">
      <CampaignHeader />

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
        <section className="grid gap-8 border-b border-[#1C0800]/14 pb-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.38em] text-[#8C5D2A]">
              Movie Reservation
            </p>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none tracking-normal sm:text-7xl lg:text-8xl">
              DETAIL
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-[#5C3010]">
              日付、スクリーン、上映時間の順に選択してから座席指定へ進みます。
            </p>
          </div>

          <div className="grid gap-3 border-y border-[#1C0800]/14 py-4 text-sm">
            <Metric label="スクリーン数" value="8" helper="大3 / 中2 / 小3" />
            <Metric label="収容人数" value="1050" helper="全体で1050名が収容可能" />
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-28 lg:h-fit">
            <div className="overflow-hidden border border-[#1C0800]/14 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.10)]">
              <div className="relative aspect-[3/4] bg-[#1C0800]">
                <Image
                  src="/images/man.jpg"
                  alt="映画のポスター"
                  fill
                  priority
                  sizes="(min-width: 1024px) 360px, 100vw"
                  className="object-cover opacity-85"
                />
                <div className="absolute left-4 top-4 bg-[#1C0800] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white">
                  {selectedScreen.name}
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#A0703A]">
                  {movieDetail.genre}
                </p>
                <h2 className="mt-3 text-3xl font-black uppercase leading-none">
                  {movieDetail.title}
                </h2>
                <p className="mt-3 text-sm font-bold text-[#8C5D2A]">
                  {movieDetail.subtitle}
                </p>
                <p className="mt-4 text-sm leading-7 text-[#5C3010]">
                  {movieDetail.synopsis}
                </p>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-8">
            <section className="border-y border-[#1C0800]/14 bg-white/64 p-5 sm:p-6">
              <SectionTitle eyebrow="Step 01" title="予約する日にち" />
              <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {screeningDates.map((date) => {
                  const isSelected = selectedDateId === date.id;
                  const screeningCount = getScreeningsForDate(date.id).length;

                  return (
                    <button
                      key={date.id}
                      type="button"
                      onClick={() => handleDateSelect(date.id)}
                      className={`min-h-28 border p-4 text-left transition ${
                        isSelected
                          ? "border-[var(--selection-border)] bg-[var(--selection-bg)] text-[var(--selection-text)]"
                          : "border-[#1C0800]/14 bg-white text-[#1C0800] hover:border-[#1C0800]"
                      }`}
                    >
                      <span className="block font-mono text-2xl font-black">{date.shortLabel}</span>
                      <span className="mt-1 block text-xs font-bold uppercase tracking-[0.2em]">
                        {date.dayLabel} / {date.caption}
                      </span>
                      <span className="mt-4 block text-xs font-bold text-current/75">
                        {screeningCount} 上映
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="border-y border-[#1C0800]/14 bg-white/64 p-5 sm:p-6">
              <SectionTitle eyebrow="Step 02" title="スクリーンを選ぶ" />
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {theaterScreens.map((screen) => {
                  const isSelected = selectedScreenId === screen.id;
                  const screenSlots = dateScreenings.filter(
                    (screening) => screening.screenId === screen.id,
                  );

                  return (
                    <button
                      key={screen.id}
                      type="button"
                      onClick={() => handleScreenSelect(screen.id)}
                      className={`border p-4 text-left transition ${
                        isSelected
                          ? "border-[var(--selection-border)] bg-[#1C0800] text-white"
                          : "border-[#1C0800]/14 bg-white text-[#1C0800] hover:border-[#1C0800]"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.28em] text-current/70">
                        Screen {screen.id.replace("screen-", "")}
                      </span>
                      <span className="mt-2 block text-xl font-black">{screen.name}</span>
                      <span className="mt-3 block text-sm font-bold text-current/75">
                        {screen.sizeLabel} / {screen.capacity}席
                      </span>
                      <span className="mt-5 block border-t border-current/15 pt-3 text-xs font-bold">
                        {screenSlots.length} 回上映
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="border-y border-[#1C0800]/14 bg-white/64 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <SectionTitle eyebrow="Step 03" title="上映時間を選ぶ" />
                <p className="text-sm font-bold text-[#5C3010]">
                  残席 {availableSeats}/{selectedScreening.capacity}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {visibleScreenings.map((screening) => {
                  const isSelected = selectedScreeningId === screening.id;
                  const remainingSeats = countAvailableSeats(screening.id);

                  return (
                    <button
                      key={screening.id}
                      type="button"
                      onClick={() => setSelectedScreeningId(screening.id)}
                      className={`border p-5 text-left transition ${
                        isSelected
                          ? "border-[var(--selection-border)] bg-[var(--selection-bg)] text-[var(--selection-text)]"
                          : "border-[#1C0800]/14 bg-white text-[#1C0800] hover:border-[#1C0800]"
                      }`}
                    >
                      <span className="block font-mono text-3xl font-black">{screening.label}</span>
                      <span className="mt-2 block text-xs font-bold uppercase tracking-[0.2em] text-current/75">
                        {screening.screenName} / {remainingSeats}席
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-6 border-y border-[#1C0800]/14 bg-white/64 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <SectionTitle eyebrow="Ticket Price" title="チケット料金" />
                <div className="mt-5 grid gap-0 border-t border-[#1C0800]/14">
                  {ticketTypes.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between gap-4 border-b border-[#1C0800]/14 py-4"
                    >
                      <span className="text-sm font-bold text-[#5C3010]">{ticket.label}</span>
                      <span className="font-mono text-xl font-black text-[#1C0800]">
                        {formatPrice(ticket.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#1C0800]/14 bg-[#FFF8E1] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8C5D2A]">
                  Selected
                </p>
                <dl className="mt-4 grid gap-4 text-sm">
                  <SummaryRow label="日付" value={selectedScreening.dateLabel} />
                  <SummaryRow label="スクリーン" value={selectedScreening.screenName} />
                  <SummaryRow label="上映時間" value={selectedScreening.label} />
                </dl>
                <button
                  type="button"
                  onClick={handleProceedToSeats}
                  className="mt-6 flex min-h-14 w-full items-center justify-center bg-[#1C0800] px-5 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#2B2119]"
                >
                  座席を選択する
                </button>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#8C5D2A]">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-2xl font-black uppercase tracking-normal text-[#1C0800]">
        {title}
      </h3>
    </div>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8C5D2A]">
        {label}
      </span>
      <span className="text-right">
        <span className="block font-mono text-2xl font-black text-[#1C0800]">{value}</span>
        <span className="block text-xs font-bold text-[#5C3010]">{helper}</span>
      </span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#1C0800]/10 pb-3">
      <dt className="text-xs font-bold text-[#8C5D2A]">{label}</dt>
      <dd className="text-right font-bold text-[#1C0800]">{value}</dd>
    </div>
  );
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(price);
}