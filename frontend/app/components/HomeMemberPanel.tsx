"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { storeMemberAccount, logoutAccount } from "@/lib/authStorage.mjs";
import { readMemberSession, signOutMember, isMemberAuthError } from "@/lib/member-api.mjs";
import { fetchReservationHistories } from "@/lib/purchaseHistoryApi.mjs";
import { toast } from "@/lib/toast-store.mjs";
import { useToastError } from "@/lib/use-toast-error";
import {
  calculateMonthlyRankSummary,
  findNextReservation,
  formatFoodSummary,
  getFoodPickupDetails,
  getMonthlyBenefitPeriod,
} from "@/lib/reservationExperience.mjs";
import type { TicketHistory } from "@/lib/reservationHistoryTypes";

import { useMovieCatalog } from "@/lib/use-movie-catalog";
import MemberIcon, { type MemberIconName } from "./MemberIcon";
import MemberPass from "./MemberPass";

type Account = {
  createdAt?: string;
  email?: string;
  name?: string;
  nickname?: string;
  phone?: string;
};

type LoadState = "error" | "loading" | "ready";
type MemberTone = "booking" | "history" | "member";

const memberShortcuts = [
  {
    href: "/mypage?view=reservations",
    label: "次の予約",
    description: "上映予定を確認",
    icon: "calendar",
    tone: "booking",
  },
  {
    href: "/mypage?view=history",
    label: "予約履歴",
    description: "過去の予約を見る",
    icon: "history",
    tone: "history",
  },
  {
    href: "/mypage?view=settings",
    label: "登録情報",
    description: "連絡先を変更",
    icon: "edit",
    tone: "member",
  },
] satisfies ReadonlyArray<{
  href: string;
  label: string;
  description: string;
  icon: MemberIconName;
  tone: MemberTone;
}>;

export default function HomeMemberPanel() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [histories, setHistories] = useState<TicketHistory[]>([]);
  const [logoutError, setLogoutError] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  useToastError(logoutError || (loadState === "error" ? "予約情報を取得できませんでした。もう一度お試しください。" : ""));

  const loadReservations = useCallback(async (email: string) => {
    setLoadState("loading");

    try {
      const items = (await fetchReservationHistories(email)) as TicketHistory[];
      setHistories(items);
      setLoadState("ready");
    } catch {
      setHistories([]);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    readMemberSession().then(({ user }) => {
      if (!active) return;
      const currentAccount = storeMemberAccount(window.localStorage, user);
      setAccount(currentAccount);
      void loadReservations(currentAccount.email);
    }).catch((error) => {
      if (!active) return;
      if (isMemberAuthError(error)) logoutAccount(window.localStorage);
      else toast.error("ログイン情報を確認できませんでした。もう一度お試しください。");
      setAccount(null);
    });
    return () => { active = false; };
  }, [loadReservations]);

  if (account === undefined || !account) {
    return null;
  }

  const memberName = account.nickname || account.name || "会員";
  const period = getMonthlyBenefitPeriod();
  const rankSummary = loadState === "ready" ? calculateMonthlyRankSummary(histories) : null;
  const nextReservation = loadState === "ready"
    ? (findNextReservation(histories) as TicketHistory | null)
    : null;
  const retryReservations = () => account.email && void loadReservations(account.email);
  const handleLogout = async () => {
    try { await signOutMember(); }
    catch { setLogoutError("ログアウトできませんでした。もう一度お試しください。"); return; }
    logoutAccount(window.localStorage);
    setAccount(null);
    router.replace("/");
  };

  return (
    <section
      aria-labelledby="member-home-title"
      className="border-b border-[var(--border-subtle)] bg-[var(--page-bg)] px-5 py-8 sm:px-8 lg:px-12"
    >
      <h2 id="member-home-title" className="sr-only">
        会員ホーム
      </h2>

      {logoutError && <p role="alert" className="mx-auto mb-4 max-w-[1280px] text-sm">{logoutError}</p>}
      <div className="mx-auto grid max-w-[1280px] items-start gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(320px,0.98fr)] lg:gap-6">
        <div className="order-1 min-w-0">
          <MemberPass
            benefitState={loadState}
            createdAt={account.createdAt}
            email={account.email}
            memberName={memberName}
            onLogout={handleLogout}
            onRetry={retryReservations}
            periodLabel={period.label}
            phone={account.phone}
            rankSummary={rankSummary}
          />
        </div>

        <div className="order-2 min-w-0">
          <NextReservationCard
            history={nextReservation}
            loadState={loadState}
            onRetry={retryReservations}
          />
        </div>

        <div className="order-3 min-w-0 lg:col-span-2">
          <MemberShortcuts />
        </div>
      </div>
    </section>
  );
}

function MemberShortcuts() {
  return (
    <nav aria-label="会員機能">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {memberShortcuts.map((item) => (
          <Link
            key={item.href}
            data-tone={item.tone}
            href={item.href}
            className="member-shortcut-tile group flex min-h-[96px] min-w-0 flex-col items-center justify-center gap-2 px-2 py-3 text-center text-xs font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)] sm:flex-row sm:justify-start sm:gap-3 sm:px-5 sm:text-left sm:text-sm"
          >
            <span
              className={`member-icon-shell member-icon-shell--${item.tone} grid h-10 w-10 shrink-0 place-items-center rounded-full`}
            >
              <MemberIcon className="h-5 w-5" name={item.icon} />
            </span>
            <span className="min-w-0 leading-5">
              <span className="block">{item.label}</span>
              <span className="mt-0.5 hidden text-xs font-bold text-[var(--text-muted)] sm:block">
                {item.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function NextReservationCard({
  history,
  loadState,
  onRetry,
}: {
  history: TicketHistory | null;
  loadState: LoadState;
  onRetry: () => void;
}) {
  const { movies } = useMovieCatalog();
  if (loadState === "loading") {
    return (
      <article
        aria-busy="true"
        aria-label="次の予約を読み込み中"
        className="member-reservation-card member-surface-card grid min-h-72 content-center gap-5 overflow-hidden p-6 sm:p-7"
      >
        <div className="cinema-skeleton h-11 w-11 rounded-full" />
        <div className="cinema-skeleton h-6 w-28 rounded-[8px]" />
        <div className="cinema-skeleton h-10 w-4/5 rounded-[8px]" />
        <div className="cinema-skeleton h-14 w-full rounded-[8px]" />
      </article>
    );
  }

  if (loadState === "error") {
    return (
      <article
        role="alert"
        className="member-reservation-card member-surface-card flex min-h-72 flex-col justify-center overflow-hidden p-6 sm:p-7"
      >
        <span className="member-icon-shell member-icon-shell--booking grid h-11 w-11 place-items-center rounded-full">
          <MemberIcon className="h-5 w-5" name="film" />
        </span>
        <h3 className="mt-5 text-xl font-black">次の予約を取得できませんでした</h3>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          通信状態を確認して、もう一度お試しください。
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 min-h-11 w-fit rounded-[10px] border border-[var(--text-primary)] px-5 text-sm font-black transition-colors hover:bg-[var(--text-primary)] hover:text-[var(--surface-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]"
        >
          もう一度読み込む
        </button>
      </article>
    );
  }

  if (!history) {
    return (
      <article className="member-reservation-card member-surface-card flex min-h-72 flex-col justify-between overflow-hidden p-6 sm:p-7">
        <div>
          <span className="member-icon-shell member-icon-shell--booking grid h-11 w-11 place-items-center rounded-full">
            <MemberIcon className="h-5 w-5" name="film" />
          </span>
          <p className="mt-5 text-xs font-black text-[var(--accent)]">次の予約</p>
          <h3 className="mt-2 text-2xl font-black">次回の予約はありません。</h3>
          <p className="mt-3 max-w-sm text-sm leading-7 text-[var(--text-secondary)]">
            上映中の作品から、次に観る映画を探しましょう。
          </p>
        </div>
        <Link
          href="/movie-now"
          className="mt-6 inline-flex min-h-12 w-fit items-center justify-center rounded-[10px] bg-[var(--accent)] px-6 text-sm font-black text-white transition-colors hover:bg-[var(--accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]"
        >
          作品を探す
        </Link>
      </article>
    );
  }

  const pickup = getFoodPickupDetails(history);
  const movie = movies.find((item) => item.title === history.movieTitle && item.imageSrc);

  return (
    <article className="member-reservation-card member-surface-card overflow-hidden p-5 sm:p-6">
      <div className={movie ? "grid grid-cols-[96px_minmax(0,1fr)] gap-5" : "grid"}>
        {movie ? (
          <div className="relative min-h-36 overflow-hidden rounded-[10px] border border-[var(--border-soft)]">
            <Image
              src={movie.imageSrc}
              alt={movie.imageAlt}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-xs font-black text-[var(--accent)]">
              <MemberIcon className="h-4 w-4" name="calendar" />
              次の予約
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--success)]">
              <MemberIcon className="h-4 w-4" name="check" />
              支払い済み
            </span>
          </div>
          <h3 className="mt-3 break-words text-2xl font-black leading-tight">
            {history.movieTitle}
          </h3>
          <p className="mt-3 text-sm font-bold leading-6 text-[var(--text-secondary)]">
            {history.showtime}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <MemberDetail label="スクリーン" value={history.screen} />
        <MemberDetail label="座席" value={history.seats.join("、")} />
        <MemberDetail label="フード" value={formatFoodSummary(history.foodItems)} />
        {pickup ? (
          <MemberDetail
            label="受取予定"
            value={`${pickup.timeLabel} / ${pickup.locationLabel}`}
          />
        ) : null}
      </dl>

      <Link
        href="/mypage?view=reservations"
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-[10px] border border-[var(--text-primary)] px-5 text-sm font-black transition-colors hover:bg-[var(--text-primary)] hover:text-[var(--surface-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]"
      >
        予約詳細を見る
      </Link>
    </article>
  );
}

function MemberDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-black tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-bold leading-6">{value || "-"}</dd>
    </div>
  );
}
