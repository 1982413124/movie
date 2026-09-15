"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPinIcon } from "@heroicons/react/24/outline";
import { ticketTypes } from "@/lib/seatSelection.mjs";
import { formatCinemaDate } from "@/lib/cinemaDate.mjs";
import BookingCalendar from "./BookingCalendar";
import ScreeningList from "./ScreeningList";
import StickyBookingBar from "./StickyBookingBar";
import MovieInformation from "./MovieInformation";
import { useScreeningSelection } from "./useScreeningSelection";
import styles from "./booking.module.css";

const priceFormat = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });

export default function BookingScreen({ movieId }: { movieId: string }) {
  const booking = useScreeningSelection(movieId);
  const movie = booking.schedule?.movie;
  if (!movie) return <main className="cinema-container py-12"><p role={booking.loadState === "error" ? "alert" : "status"}>{booking.error || "作品を読み込んでいます…"}</p>{booking.error && <button className="cinema-button mt-4" onClick={booking.refresh}>再試行</button>}<Link href="/movie-now" className="cinema-text-link mt-6">作品一覧に戻る</Link></main>;
  return (
    <>
      <main className={styles.bookingLayout}>
        <aside className={styles.filmAside} aria-label="映画情報">
          <div className={styles.poster}>
            {movie.poster_image ? <Image src={movie.poster_image} alt={movie.title + "の映画ポスター"} fill unoptimized priority sizes="240px" className="object-cover" /> : <span>ポスター準備中</span>}
          </div>
          <p className={styles.theater}><MapPinIcon aria-hidden="true" />HAL CINEMA 名古屋栄</p>
          <Link href="/movie-now" className={styles.backLink}>‹ 作品一覧に戻る</Link>
        </aside>
        <div className={styles.bookingMain}>
          <header className={styles.filmHeading}>
            <p className={styles.eyebrow}>チケット予約</p>
            <h1>{movie.title}</h1>
            <div className={styles.filmDescription}>
              <div className={styles.filmMeta}><span>{movie.genre}</span><span>{movie.age_rating}</span><span>{movie.duration_minutes}分</span></div>
            </div>
          </header>
          <MovieInformation key={movie.id} movie={movie} />
          {booking.loadState === "ready" && !booking.schedule?.dates.length ? <p role="status" className="cinema-card my-8 p-6 text-sm">上映スケジュールは準備中です。上映情報の公開をお待ちください。</p> : <><div className={styles.dateSection}>
            <BookingCalendar selectedDate={booking.selectedDate} today={booking.schedule?.today} dates={booking.schedule?.dates ?? []}
              disabled={booking.isProceeding || !booking.schedule} onSelect={booking.chooseDate} />
            <div className={styles.dateHint}>
              {Boolean(booking.schedule?.dates.length) && booking.schedule && <p>{formatCinemaDate(booking.schedule.bookingWindow.to)}までの上映予定を公開中</p>}
              <span>日付を選んで、上映回をお選びください。</span>
            </div>
          </div>
          <ScreeningList dateId={booking.selectedDate} screenings={booking.schedule?.screenings ?? []}
            selectedId={booking.selectedScreening?.id} state={booking.loadState} busy={booking.isProceeding}
            error={booking.error} onSelect={booking.chooseScreening} onRetry={booking.refresh} /></>}
          <section className={styles.ticketSection} aria-labelledby="ticket-price-heading">
            <div><h2 id="ticket-price-heading">チケット料金</h2><p>券種・枚数は座席選択で指定できます。</p></div>
            <dl>{ticketTypes.map((ticket) => <div key={ticket.id}><dt>{ticket.label}</dt><dd>{priceFormat.format(ticket.price)}</dd></div>)}</dl>
          </section>
        </div>
      </main>
      {Boolean(booking.schedule?.dates.length) && <StickyBookingBar selected={booking.selectedScreening} enabled={booking.canProceed} busy={booking.isProceeding}
        error={booking.loadState === "error" ? "" : booking.error} onProceed={booking.proceed} />}
    </>
  );
}
