"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";

import { formatMemberSince, maskEmail, maskPhone } from "@/lib/memberProfile.mjs";

import MemberIcon, { type MemberIconName } from "./MemberIcon";
import MemberRankPanel, { type MemberRankSummary } from "./MemberRankPanel";

type BenefitState = "error" | "loading" | "ready";
type MemberTabId = "benefits" | "profile";

type MemberPassProps = {
  benefitState: BenefitState;
  createdAt?: string;
  email?: string;
  memberName: string;
  onLogout: () => void;
  onRetry: () => void;
  periodLabel: string;
  phone?: string;
  rankSummary: MemberRankSummary | null;
};

const memberTabs = [
  { id: "benefits", label: "ランク・特典", icon: "gift", tone: "benefit" },
  { id: "profile", label: "会員情報", icon: "user", tone: "member" },
] satisfies ReadonlyArray<{
  id: MemberTabId;
  label: string;
  icon: MemberIconName;
  tone: "benefit" | "member";
}>;

export default function MemberPass({
  benefitState,
  createdAt,
  email,
  memberName,
  onLogout,
  onRetry,
  periodLabel,
  phone,
  rankSummary,
}: MemberPassProps) {
  const [activeTab, setActiveTab] = useState<MemberTabId>("benefits");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectTab = (index: number) => {
    const nextTab = memberTabs[index];

    if (!nextTab) {
      return;
    }

    setActiveTab(nextTab.id);
    tabRefs.current[index]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % memberTabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + memberTabs.length) % memberTabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = memberTabs.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    selectTab(nextIndex);
  };

  return (
    <article className="member-pass-card min-w-0 overflow-hidden p-5 sm:p-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--member-card-accent)]">
            HAL CINEMA MEMBER
          </p>
          <h2 className="mt-2 text-xl font-black text-[var(--member-card-text)]">会員エリア</h2>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="会員エリアの表示"
        aria-orientation="horizontal"
        className="member-tab-list mt-5"
      >
        {memberTabs.map((tab, index) => {
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={`member-tab-${tab.id}`}
              data-tone={tab.tone}
              type="button"
              role="tab"
              aria-controls={`member-panel-${tab.id}`}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className="member-tab focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--focus-ring)]"
            >
              <span
                className={`member-icon-shell member-icon-shell--${tab.tone} grid h-8 w-8 shrink-0 place-items-center rounded-full`}
              >
                <MemberIcon className="h-4 w-4" name={tab.icon} />
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <section
        id="member-panel-benefits"
        role="tabpanel"
        aria-labelledby="member-tab-benefits"
        hidden={activeTab !== "benefits"}
        className="member-tab-panel"
        data-member-slot="benefits"
      >
        <BenefitPanel
          state={benefitState}
          rankSummary={rankSummary}
          periodLabel={periodLabel}
          onRetry={onRetry}
        />
      </section>

      <section
        id="member-panel-profile"
        role="tabpanel"
        aria-labelledby="member-tab-profile"
        hidden={activeTab !== "profile"}
        className="member-tab-panel"
        data-member-slot="profile"
      >
        <ProfilePanel
          createdAt={createdAt}
          email={email}
          memberName={memberName}
          onLogout={onLogout}
          phone={phone}
        />
      </section>
    </article>
  );
}

function BenefitPanel({
  onRetry,
  periodLabel,
  rankSummary,
  state,
}: {
  onRetry: () => void;
  periodLabel: string;
  rankSummary: MemberRankSummary | null;
  state: BenefitState;
}) {
  if (state === "loading") {
    return (
      <div aria-busy="true" aria-label="特典情報を読み込み中" className="grid min-h-[440px] content-center gap-5">
        <div className="cinema-skeleton h-40 w-full rounded-[16px]" />
        <div className="grid grid-cols-4 gap-2">
          <div className="cinema-skeleton h-24 rounded-[12px]" />
          <div className="cinema-skeleton h-24 rounded-[12px]" />
          <div className="cinema-skeleton h-24 rounded-[12px]" />
          <div className="cinema-skeleton h-24 rounded-[12px]" />
        </div>
        <div className="cinema-skeleton h-2 w-full rounded-full" />
        <div className="cinema-skeleton h-28 w-full rounded-[12px]" />
      </div>
    );
  }

  if (state === "error" || !rankSummary) {
    return (
      <div role="alert" className="flex min-h-[440px] flex-col items-start justify-center">
        <span className="member-icon-shell member-icon-shell--booking grid h-12 w-12 place-items-center rounded-full">
          <MemberIcon className="h-6 w-6" name="film" />
        </span>
        <h3 className="mt-5 text-xl font-black text-[var(--member-card-text)]">
          特典情報を読み込めませんでした
        </h3>
        <p className="mt-3 text-sm leading-7 text-[var(--member-card-muted)]">
          予約情報の取得に失敗しました。会員情報タブはそのまま確認できます。
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 min-h-11 rounded-[10px] border border-[var(--member-card-text)] px-5 text-sm font-black transition-colors hover:bg-[var(--member-card-text)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]"
        >
          もう一度読み込む
        </button>
      </div>
    );
  }

  return <MemberRankPanel periodLabel={periodLabel} summary={rankSummary} />;
}

function ProfilePanel({
  createdAt,
  email,
  memberName,
  onLogout,
  phone,
}: {
  createdAt?: string;
  email?: string;
  memberName: string;
  onLogout: () => void;
  phone?: string;
}) {
  const maskedEmail = maskEmail(email);
  const maskedPhone = maskPhone(phone);
  const memberSince = formatMemberSince(createdAt);

  return (
    <div className="grid min-h-[300px] content-center gap-6">
      <div className="flex items-center gap-4">
        <span className="member-icon-shell member-icon-shell--member grid h-14 w-14 shrink-0 place-items-center rounded-full">
          <MemberIcon className="h-7 w-7" name="user" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--member-card-muted)]">HAL CINEMA 会員</p>
          <h3 className="mt-1 break-words text-3xl font-black leading-tight text-[var(--member-card-text)]">
            {memberName} 様
          </h3>
        </div>
        <span className="member-status-chip ml-auto hidden min-h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-black sm:inline-flex">
          <MemberIcon className="h-4 w-4" name="check" />
          登録済み
        </span>
      </div>

      <dl className="divide-y divide-[var(--member-card-border)] border-y border-[var(--member-card-border)]">
        <PrivateInfoRow
          label="メールアドレス"
          value={maskedEmail || "未設定"}
          accessibleLabel={maskedEmail ? "メールアドレスは一部を非表示にしています" : "メールアドレスは未設定です"}
        />
        <PrivateInfoRow
          label="電話番号"
          value={maskedPhone || "未設定"}
          accessibleLabel={maskedPhone ? "電話番号は一部を非表示にしています" : "電話番号は未設定です"}
        />
        {memberSince ? <InfoRow label="会員登録日" value={memberSince} /> : null}
      </dl>

      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
        <Link
          href="/mypage?view=settings"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--member-card-text)] px-5 text-sm font-black text-white transition-colors hover:bg-[var(--neutral-gray)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)] sm:w-auto"
        >
          <MemberIcon className="h-4 w-4" name="edit" />
          登録情報を編集
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--member-card-border)] px-5 text-sm font-black text-[var(--member-card-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--member-card-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)] sm:w-auto"
        >
          <MemberIcon className="h-4 w-4" name="logout" />
          ログアウト
        </button>
      </div>
    </div>
  );
}

function PrivateInfoRow({
  accessibleLabel,
  label,
  value,
}: {
  accessibleLabel: string;
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 py-3 text-sm sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
      <dt className="text-xs font-bold text-[var(--member-card-muted)]">{label}</dt>
      <dd className="break-all font-bold text-[var(--member-card-text)]">
        <span aria-hidden="true">{value}</span>
        <span className="sr-only">{accessibleLabel}</span>
      </dd>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 text-sm sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
      <dt className="text-xs font-bold text-[var(--member-card-muted)]">{label}</dt>
      <dd className="font-bold text-[var(--member-card-text)]">{value}</dd>
    </div>
  );
}
