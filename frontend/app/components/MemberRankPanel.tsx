import { ChevronRightIcon } from "@heroicons/react/24/outline";
import Image from "next/image";

import { MEMBER_RANK_RULES } from "@/lib/reservationExperience.mjs";

type MemberRankId = "bronze" | "silver" | "gold" | "platinum";

type MemberRankRule = {
  id: MemberRankId;
  label: string;
  spendTarget: number;
  visitTarget: number;
  benefitLabel: string;
};

export type MemberRankSummary = {
  amountSpent: number;
  visitCount: number;
  currentRankIndex: number;
  currentRankId: MemberRankId;
  nextRankIndex: number | null;
  remainingAmount: number;
  remainingVisits: number;
  amountRatio: number;
  visitRatio: number;
};

const rankImages: Record<MemberRankId, string> = {
  bronze: "/images/UI/Membership/499b6076-2826-43cc-8854-bdc9c5547e20_r1_c1.png",
  silver: "/images/UI/Membership/499b6076-2826-43cc-8854-bdc9c5547e20_r1_c2.png",
  gold: "/images/UI/Membership/499b6076-2826-43cc-8854-bdc9c5547e20_r1_c3.png",
  platinum: "/images/UI/Membership/499b6076-2826-43cc-8854-bdc9c5547e20_r1_c4.png",
};

const memberRanks = MEMBER_RANK_RULES as readonly MemberRankRule[];
const yenFormatter = new Intl.NumberFormat("ja-JP");

export default function MemberRankPanel({
  periodLabel,
  summary,
}: {
  periodLabel: string;
  summary: MemberRankSummary;
}) {
  const currentRank = memberRanks[summary.currentRankIndex] ?? memberRanks[0];
  const nextRank = summary.nextRankIndex === null
    ? null
    : memberRanks[summary.nextRankIndex];
  const targetRank = nextRank ?? currentRank;
  const remainingParts = [
    summary.remainingAmount > 0
      ? `${yenFormatter.format(summary.remainingAmount)}円`
      : "",
    summary.remainingVisits > 0 ? `${summary.remainingVisits}回来館` : "",
  ].filter(Boolean);

  return (
    <div className="member-rank-panel" data-rank={currentRank.id}>
      <section
        aria-label="今月の会員ランク"
        className="member-rank-reference-card"
      >
        <header className="member-rank-reference-heading">
          <RankImage
            rank={currentRank}
            className="member-rank-current-image"
            sizes="(max-width: 420px) 76px, 92px"
          />
          <div className="min-w-0">
            <p className="member-rank-heading-label">今月のランク</p>
            <div className="member-rank-heading-title">
              <h3>{currentRank.label}</h3>
              <ChevronRightIcon aria-hidden="true" />
            </div>
          </div>
        </header>

        <div className="member-rank-progress-grid">
          <RankMetric
            label="ご利用金額"
            value={`${yenFormatter.format(summary.amountSpent)}円`}
            valueNow={summary.amountSpent}
            valueMax={targetRank.spendTarget}
            targetValue={`${yenFormatter.format(targetRank.spendTarget)}円`}
            ratio={summary.amountRatio}
            tone="spend"
          />
          <RankMetric
            label="ご来館回数"
            value={`${summary.visitCount}回`}
            valueNow={summary.visitCount}
            valueMax={targetRank.visitTarget}
            targetValue={`${targetRank.visitTarget}回`}
            ratio={summary.visitRatio}
            tone="visit"
          />
        </div>

        <section aria-label="次のランクと特典" className="member-rank-next-summary">
          <p className="member-rank-next-label">{nextRank ? "次のランク" : "達成ランク"}</p>
          <RankImage
            rank={targetRank}
            className="member-rank-next-image"
            sizes="54px"
            decorative
          />
          <div className="member-rank-next-copy">
            {nextRank ? (
              <>
                <p>
                  {remainingParts.length > 0
                    ? `あと${remainingParts.join("・")}で`
                    : "ランク条件を達成"}
                </p>
                <strong>{nextRank.label}へランクアップ</strong>
              </>
            ) : (
              <>
                <p>今月は最上位ランクです</p>
                <strong>プラチナをキープ</strong>
              </>
            )}
          </div>
          <div className="member-rank-next-benefit">
            <span>{targetRank.label}特典</span>
            <strong>{targetRank.benefitLabel}</strong>
          </div>
        </section>
      </section>

      <section aria-labelledby="rank-benefits-title" className="member-rank-benefits-summary">
        <header>
          <h4 id="rank-benefits-title">ランク特典一覧</h4>
          <p>{periodLabel}</p>
        </header>
        <ol>
          {memberRanks.map((rank, index) => {
            const state = index === summary.currentRankIndex
              ? "current"
              : index < summary.currentRankIndex
                ? "complete"
                : "upcoming";

            return (
              <li
                key={rank.id}
                aria-current={state === "current" ? "step" : undefined}
                data-rank={rank.id}
                data-state={state}
              >
                <RankImage
                  rank={rank}
                  className="member-rank-benefit-image"
                  sizes="38px"
                  decorative
                />
                <span>{rank.label}</span>
                <strong>{rank.benefitLabel}</strong>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="member-rank-note">
        利用金額は今月支払った予約、来館回数は今月の上映終了分を集計しています。
      </p>
    </div>
  );
}

function RankMetric({
  label,
  ratio,
  targetValue,
  tone,
  value,
  valueMax,
  valueNow,
}: {
  label: string;
  ratio: number;
  targetValue: string;
  tone: "spend" | "visit";
  value: string;
  valueMax: number;
  valueNow: number;
}) {
  const progress = Math.min(1, Math.max(0, ratio));
  const percentage = Math.floor(progress * 100);

  return (
    <div className="member-rank-metric" data-tone={tone}>
      <span className="member-rank-metric-label">{label}</span>
      <strong className="member-rank-metric-value">{value}</strong>
      <div className="member-rank-metric-progress">
        <div className="member-rank-metric-caption" aria-hidden="true">
          <span>目標 {targetValue}</span>
          <strong>{progress === 1 ? "達成" : `${percentage}%`}</strong>
        </div>
        <div
          role="progressbar"
          aria-label={`今月の${label} ${value}`}
          aria-valuemin={0}
          aria-valuemax={valueMax}
          aria-valuenow={Math.min(valueNow, valueMax)}
          aria-valuetext={`${value} / 目標 ${targetValue}（${percentage}%）`}
          className="member-rank-metric-track"
        >
          <span
            className="member-rank-metric-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function RankImage({
  className,
  decorative = false,
  rank,
  sizes,
}: {
  className: string;
  decorative?: boolean;
  rank: MemberRankRule;
  sizes: string;
}) {
  return (
    <span className={className} aria-hidden={decorative ? "true" : undefined}>
      <Image
        src={rankImages[rank.id]}
        alt={decorative ? "" : `${rank.label}ランクのメダル`}
        fill
        sizes={sizes}
        className="object-contain"
      />
    </span>
  );
}
