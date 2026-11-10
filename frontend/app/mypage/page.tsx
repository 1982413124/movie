"use client";

import { toast } from "@/lib/toast-store.mjs";
import { useToastError } from "@/lib/use-toast-error";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import CampaignHeader from "../components/CampaignHeader";
import PointsPanel from "./PointsPanel";
import type { FoodHistory, TicketHistory } from "../../lib/reservationHistoryTypes";
import {
  storeMemberAccount,
  logoutAccount,
  updateCurrentAccount,
} from "../../lib/authStorage.mjs";
import {
  cancelReservation,
  fetchReservationHistories,
} from "../../lib/purchaseHistoryApi.mjs";
import {
  canCancelReservation,
  findNextReservation,
  formatFoodSummary,
  getFoodPickupDetails,
  getReservationDisplayStatus,
} from "../../lib/reservationExperience.mjs";

import { readMemberSession, signOutMember, isMemberAuthError } from "../../lib/member-api.mjs";
import { cancellationReason, formatCancellationDeadline } from "../../lib/reservationCancellation.mjs";

type MenuKey = "reservations" | "history" | "points" | "profile" | "settings" | "logout";
type ViewMenuKey = Exclude<MenuKey, "logout">;
type HistoryState = "idle" | "loading" | "ready" | "error";
type StatusTone = "error" | "success";

type ProfileForm = {
  email: string;
  name: string;
  nickname: string;
  phone: string;
};

type Account = ProfileForm & {
  password: string;
};

const MENU_ITEMS: { key: MenuKey; label: string; meta: string }[] = [
  { key: "reservations", label: "次の予約", meta: "Next" },
  { key: "history", label: "購入履歴", meta: "History" },
  { key: "points", label: "ポイント", meta: "Points" },
  { key: "profile", label: "プロフィール", meta: "Profile" },
  { key: "settings", label: "設定", meta: "Settings" },
  { key: "logout", label: "ログアウト", meta: "Logout" },
];

const VIEW_MENU_KEYS: ViewMenuKey[] = ["reservations", "history", "points", "profile", "settings"];

function isViewMenuKey(value: string | null): value is ViewMenuKey {
  return Boolean(value && VIEW_MENU_KEYS.includes(value as ViewMenuKey));
}

const PROFILE_FIELDS: {
  name: keyof ProfileForm;
  label: string;
  placeholder: string;
  type: string;
}[] = [
  { name: "name", label: "名前", placeholder: "名前を入力", type: "text" },
  { name: "nickname", label: "ニックネーム", placeholder: "表示名を入力", type: "text" },
  { name: "email", label: "メールアドレス", placeholder: "メールアドレスを入力", type: "email" },
  { name: "phone", label: "電話番号", placeholder: "電話番号を入力", type: "tel" },
];

const emptyForm: ProfileForm = {
  email: "",
  name: "",
  nickname: "",
  phone: "",
};

function toProfileForm(account: Account | null): ProfileForm {
  if (!account) {
    return emptyForm;
  }

  return {
    email: account.email ?? "",
    name: account.name ?? "",
    nickname: account.nickname ?? "",
    phone: account.phone ?? "",
  };
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(price);
}

function paymentLabel(history: TicketHistory): string {
  if (history.paymentStatus === "refunded") {
    return history.refundMode === "simulation" ? "支払い取消（テスト決済）" : "返金済み";
  }
  return ({ paid: "支払い済み", unpaid: "未払い", failed: "支払い失敗" } as Record<string, string>)[history.paymentStatus ?? ""] ?? "確認中";
}

function getFoodTotal(items: FoodHistory[] = []): number {
  return items.reduce((total, item) => total + item.subtotal, 0);
}

function StatusBadge({ history }: { history: TicketHistory }) {
  const status = getReservationDisplayStatus(history);
  const isCanceled = status === "キャンセル済み" || status === "返金済み";

  return (
    <span
      className={`inline-flex w-fit border px-3 py-1 text-xs font-bold ${
        isCanceled
          ? "border-[var(--danger)]/35 bg-[var(--selection-soft)] text-[var(--danger)]"
          : "border-[var(--success)]/35 bg-[var(--success)]/7 text-[var(--success)]"
      }`}
    >
      {status}
    </span>
  );
}

function HistoryStatePanel({
  state,
  onRetry,
}: {
  state: HistoryState;
  onRetry: () => void;
}) {
  if (state === "loading" || state === "idle") {
    return (
      <div aria-live="polite" className="rounded-lg grid gap-4 border border-[var(--border-soft)] bg-[var(--surface-bg)] p-6">
        <span className="cinema-skeleton h-5 w-36" />
        <span className="cinema-skeleton h-10 w-3/4" />
        <span className="cinema-skeleton h-20 w-full" />
        <span className="sr-only">予約情報を読み込んでいます。</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div role="alert" className="rounded-lg border border-[var(--danger)] bg-[var(--surface-bg)] p-6">
        <h2 className="text-xl font-black text-[var(--text-primary)]">予約情報を取得できませんでした</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          通信状態を確認して、もう一度読み込んでください。
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--button-hover)] hover:text-white"
        >
          もう一度読み込む
        </button>
      </div>
    );
  }

  return null;
}

function NextReservationPanel({
  histories,
  historyState,
  notice,
  onCancel,
  onOpenDetails,
  onRetry,
}: {
  histories: TicketHistory[];
  historyState: HistoryState;
  notice: string;
  onCancel: (history: TicketHistory) => void;
  onOpenDetails: (history: TicketHistory) => void;
  onRetry: () => void;
}) {
  if (historyState !== "ready") {
    return <HistoryStatePanel state={historyState} onRetry={onRetry} />;
  }

  const nextReservation = findNextReservation(histories);

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Next Reservation</p>
        <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)]">次の予約</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          次に観る映画と、上映前に受け取るフードをここで確認できます。
        </p>
      </div>

      {notice ? (
        <p role="status" className="mb-5 border border-[var(--success)]/30 bg-[var(--success)]/6 p-4 text-sm font-bold text-[var(--success)]">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-6">
        {nextReservation ? (
          <NextReservationCard
            history={nextReservation}
            onCancel={() => onCancel(nextReservation)}
            onOpenDetails={() => onOpenDetails(nextReservation)}
          />
        ) : (
          <div className="rounded-lg grid min-h-80 place-items-center border border-[var(--border-soft)] bg-[var(--surface-bg)] p-8 text-center">
            <div>
              <p className="cinema-label">Empty</p>
              <h3 className="mt-3 text-2xl font-black text-[var(--text-primary)]">次の予約はありません</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                上映中の作品から、次に観る映画を探せます。
              </p>
              <Link
                href="/movie-now"
                className="mt-6 inline-flex min-h-12 items-center justify-center bg-[var(--button-bg)] px-6 text-sm font-bold text-white hover:bg-[var(--button-hover)]"
              >
                映画を探す
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function NextReservationCard({
  history,
  onCancel,
  onOpenDetails,
}: {
  history: TicketHistory;
  onCancel: () => void;
  onOpenDetails: () => void;
}) {
  const pickup = getFoodPickupDetails(history);

  return (
    <article className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-bg)] p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="cinema-label">Your Next Movie</p>
          <h3 className="mt-3 text-3xl font-black leading-tight text-[var(--text-primary)]">{history.movieTitle}</h3>
        </div>
        <StatusBadge history={history} />
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <DetailCell label="上映日時" value={history.showtime} />
        <DetailCell label="スクリーン" value={history.screen} />
        <DetailCell label="座席" value={history.seats.join(", ") || "-"} />
        <DetailCell label="チケット" value={`${history.ticketCount}枚 / ${formatPrice(history.totalPrice)}`} />
      </dl>

      <div className="mt-6 border-l-4 border-[var(--danger)] bg-[var(--selection-soft)] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--danger)]">Food Pre-Order</p>
        <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">{formatFoodSummary(history.foodItems)}</p>
        {pickup ? (
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {pickup.timeLabel} / {pickup.locationLabel}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">フード注文はありません。</p>
        )}
      </div>

      <p className="mt-5 text-xs leading-5 text-[var(--text-muted)]">
        キャンセルは上映開始の1時間前まで可能です。チケット・フードを取り消し、座席を解放します。
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenDetails}
          className="min-h-12 bg-[var(--button-bg)] px-5 text-sm font-bold text-white hover:bg-[var(--button-hover)]"
        >
          予約詳細を見る
        </button>
        <button
          type="button"
          disabled={!canCancelReservation(history)}
          onClick={onCancel}
          className="min-h-12 border border-[var(--danger)] px-5 text-sm font-bold text-[var(--danger)] enabled:hover:bg-[var(--button-hover)] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          予約をキャンセル
        </button>
      </div>
    </article>
  );
}

function PurchaseHistoryPanel({
  histories,
  historyState,
  notice,
  onCancel,
  onOpenDetails,
  onRetry,
}: {
  histories: TicketHistory[];
  historyState: HistoryState;
  notice: string;
  onCancel: (history: TicketHistory) => void;
  onOpenDetails: (history: TicketHistory) => void;
  onRetry: () => void;
}) {
  if (historyState !== "ready") {
    return <HistoryStatePanel state={historyState} onRetry={onRetry} />;
  }

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Purchase History</p>
        <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)]">購入履歴</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          支払い状況、座席、フード注文を予約ごとに確認できます。
        </p>
      </div>

      {notice ? (
        <p role="status" className="mb-5 border border-[var(--success)]/30 bg-[var(--success)]/6 p-4 text-sm font-bold text-[var(--success)]">
          {notice}
        </p>
      ) : null}

      {histories.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-bg)] p-8 text-center">
          <h3 className="text-xl font-black text-[var(--text-primary)]">購入履歴はまだありません</h3>
          <Link href="/movie-now" className="mt-5 inline-flex min-h-11 items-center bg-[var(--button-bg)] px-5 text-sm font-bold text-white">
            上映中の映画を見る
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {histories.map((history) => (
            <article key={history.id} className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-bg)] p-5 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">購入日時 {history.purchasedAt}</p>
                      <h3 className="mt-2 text-2xl font-black text-[var(--text-primary)]">{history.movieTitle}</h3>
                    </div>
                    <StatusBadge history={history} />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[var(--text-secondary)]">
                    {history.showtime} / {history.screen}
                  </p>
                  <dl className="mt-5 grid gap-3 border-t border-[var(--border-soft)] pt-4 sm:grid-cols-2">
                    <DetailCell label="座席" value={history.seats.join(", ") || "-"} />
                    <DetailCell label="フード" value={formatFoodSummary(history.foodItems)} />
                  </dl>
                </div>

                <div className="flex flex-col justify-between border-t border-[var(--border-soft)] pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-muted)]">合計金額</p>
                    <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{formatPrice(history.totalPrice)}</p>
                  </div>
                  <div className="mt-5 grid gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDetails(history)}
                      className="min-h-11 bg-[var(--button-bg)] px-4 text-sm font-bold text-white hover:bg-[var(--button-hover)]"
                    >
                      詳細を見る
                    </button>
                    {canCancelReservation(history) ? (
                      <button
                        type="button"
                        onClick={() => onCancel(history)}
                        className="min-h-11 border border-[var(--danger)] px-4 text-sm font-bold text-[var(--danger)] enabled:hover:bg-[var(--button-hover)] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        予約をキャンセル
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ReservationDetailPanel({
  history,
  notice,
  onBack,
  onCancel,
}: {
  history: TicketHistory;
  notice: string;
  onBack: () => void;
  onCancel: (history: TicketHistory) => void;
}) {
  const foodItems = history.foodItems ?? [];
  const foodTotal = getFoodTotal(foodItems);
  const ticketTotal = history.ticketTotalPrice ?? Math.max(0, (history.subtotalAmount ?? history.totalPrice) - foodTotal);
  const pickup = getFoodPickupDetails(history);

  return (
    <section className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-bg)] p-6 sm:p-8">
      <div className="flex flex-col gap-5 border-b border-[var(--border-soft)] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="cinema-label">Reservation Detail</p>
          <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)]">{history.movieTitle}</h2>
          <p className="mt-3 break-all text-sm text-[var(--text-secondary)]">予約番号 {history.orderNum ?? history.id}</p>
        </div>
        <StatusBadge history={history} />
      </div>

      {notice && <p role="status" className="mt-6 border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm font-bold">{notice}</p>}
      <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DetailCell label="上映日時" value={history.showtime} />
        <DetailCell label="スクリーン" value={history.screen} />
        <DetailCell label="座席" value={history.seats.join(", ") || "-"} />
        <DetailCell label="券種" value={history.ticketSummary || `${history.ticketCount}枚`} />
        <DetailCell label="購入日時" value={history.purchasedAt} />
        <DetailCell label="支払い" value={paymentLabel(history)} />
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
          <h3 className="text-lg font-black text-[var(--text-primary)]">料金内訳</h3>
          <dl className="mt-4 divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
            <PriceRow label="チケット小計" value={formatPrice(ticketTotal)} />
            <PriceRow label="フード小計" value={formatPrice(foodTotal)} />
            <PriceRow label="割引前金額" value={formatPrice(history.subtotalAmount ?? history.totalPrice)} />
            <PriceRow label={history.couponCode ? `クーポン（${history.couponCode}）` : "クーポン割引"} value={`−${formatPrice(history.couponDiscountAmount ?? 0)}`} />
            <PriceRow label="ポイント利用" value={`−${formatPrice(history.pointsUsed ?? 0)}`} />
            <PriceRow label="最終支払額" value={formatPrice(history.totalPrice)} strong />
            <PriceRow label={history.orderStatus === "cancelled" ? "獲得ポイント（取消済み）" : "獲得ポイント"} value={`${history.pointsEarned ?? 0} pt`} />
            {history.orderStatus === "cancelled" && <PriceRow label="返還ポイント" value={`${history.pointsUsed ?? 0} pt`} />}
          </dl>
        </div>
        <div className="border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
          <h3 className="text-lg font-black text-[var(--text-primary)]">フード注文</h3>
          <p className="mt-4 text-sm font-bold text-[var(--text-secondary)]">{formatFoodSummary(foodItems)}</p>
          {history.orderStatus === "cancelled" ? (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">フード注文もキャンセル済みです。</p>
          ) : pickup ? (
            <dl className="mt-4 space-y-3 border-t border-[var(--border-soft)] pt-4">
              <DetailCell label="受取時間" value={pickup.timeLabel} />
              <DetailCell label="受取場所" value={pickup.locationLabel} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">フード注文はありません。</p>
          )}
        </div>
      </div>

      <div className="mt-7 text-sm leading-7 text-[var(--text-secondary)]">
        <p>キャンセル期限：{formatCancellationDeadline(history)}（上映開始の1時間前）</p>
        {cancellationReason(history) && <p>{cancellationReason(history)}</p>}
      </div>
      <div className="mt-7 flex flex-col gap-3 border-t border-[var(--border-soft)] pt-6 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
        >
          購入履歴へ戻る
        </button>
        {history.orderStatus !== "cancelled" ? (
          <button
            type="button"
            disabled={!canCancelReservation(history)}
            onClick={() => onCancel(history)}
            className="min-h-11 border border-[var(--danger)] px-5 text-sm font-bold text-[var(--danger)] enabled:hover:bg-[var(--button-hover)] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            予約をキャンセル
          </button>
        ) : null}
      </div>
    </section>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold leading-6 text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

function PriceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <dt className="text-sm text-[var(--text-secondary)]">{label}</dt>
      <dd className={strong ? "text-xl font-black text-[var(--text-primary)]" : "font-bold text-[var(--text-primary)]"}>{value}</dd>
    </div>
  );
}

function ProfilePanel({ account }: { account: Account }) {
  const nickname = account.nickname?.trim() || account.email.split("@")[0];

  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Profile</p>
      <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)]">プロフィール</h2>
      <dl className="rounded-lg mt-7 divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)] bg-[var(--surface-bg)] px-5 sm:px-7">
        <ProfileRow label="名前" value={account.name || "未設定"} />
        <ProfileRow label="ニックネーム" value={nickname || "未設定"} />
        <ProfileRow label="メールアドレス" value={account.email} />
        <ProfileRow label="電話番号" value={account.phone || "未設定"} />
      </dl>
    </section>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 py-5 sm:grid-cols-[180px_1fr]">
      <dt className="text-xs font-bold text-[var(--text-muted)]">{label}</dt>
      <dd className="break-all font-bold text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

function SettingsPanel({
  form,
  onChange,
  onSave,
  statusMessage,
  statusTone,
}: {
  form: ProfileForm;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  statusMessage: string;
  statusTone: StatusTone;
}) {
  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Account Settings</p>
      <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)]">設定</h2>
      <form
        className="rounded-lg mt-7 border border-[var(--border-soft)] bg-[var(--surface-bg)] p-5 sm:p-7"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="grid gap-6 md:grid-cols-2">
          {PROFILE_FIELDS.map((field) => (
            <label key={field.name}>
              <span className="block text-xs font-bold text-[var(--text-muted)]">{field.label}</span>
              <input
                type={field.type}
                name={field.name}
                value={form[field.name]}
                onChange={onChange}
                placeholder={field.placeholder}
                required={field.name === "name" || field.name === "email"}
                className="rounded-lg mt-2 min-h-12 w-full border border-[var(--border-soft)] bg-[var(--surface-bg)] px-4 text-[var(--text-primary)] outline-none focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/20"
              />
            </label>
          ))}
        </div>
        <p
          aria-live="polite"
          className={`mt-5 min-h-5 text-sm font-bold ${statusTone === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
        >
          {statusMessage}
        </p>
        <button type="submit" className="mt-5 min-h-12 bg-[var(--button-bg)] px-8 text-sm font-bold text-white hover:bg-[var(--button-hover)]">
          変更を保存
        </button>
      </form>
    </section>
  );
}

function CancelReservationModal({
  history,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: {
  history: TicketHistory;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (!first) { event.preventDefault(); dialog.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => { document.removeEventListener("keydown", trapFocus); previousFocus?.focus(); };
  }, []);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[var(--overlay)] px-4 py-8">
      <section
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        className="rounded-lg w-full max-w-lg border border-[var(--border-soft)] bg-[var(--surface-bg)] p-6 shadow-sm sm:p-8"
      >
        <p className="cinema-label">Cancel Reservation</p>
        <h2 id="cancel-title" className="mt-3 text-2xl font-black text-[var(--text-primary)]">
          この予約をキャンセルしますか？
        </h2>
        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
          上映開始の1時間前までキャンセルできます。チケットと同時に注文したフードも取り消し、座席を解放します。この操作は元に戻せません。
        </p>
        <dl className="mt-6 space-y-4 border-y border-[var(--border-soft)] py-5">
          <DetailCell label="作品" value={history.movieTitle} />
          <DetailCell label="上映日時" value={history.showtime} />
          <DetailCell label="座席" value={history.seats.join(", ") || "-"} />
          <DetailCell label="取消対象額" value={formatPrice(history.totalPrice)} />
          <DetailCell label="キャンセル期限" value={formatCancellationDeadline(history)} />
        </dl>
        {history.refundMode === "simulation" && <p className="mt-4 text-xs leading-6 text-[var(--text-secondary)]">テスト決済のため、実際の請求・返金は発生しません。</p>}
        {!canCancelReservation(history) && <p role="status" className="mt-4 text-sm">{cancellationReason(history)}</p>}
        {error && <p role="alert" className="mt-4 text-sm font-bold text-[var(--danger)]">{error}</p>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-12 border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text-primary)] disabled:opacity-50"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || !canCancelReservation(history)}
            className="min-h-12 bg-[var(--button-bg)] px-5 text-sm font-bold text-white hover:bg-[var(--button-hover)] disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "キャンセル処理中..." : "キャンセルを確定"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function MyPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState("");
  const [authRetry, setAuthRetry] = useState(0);
  const [, refreshClock] = useState(0);
  const cancelLock = useRef(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey>("reservations");
  const [currentAccount, setCurrentAccount] = useState<Account | null | undefined>(undefined);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [histories, setHistories] = useState<TicketHistory[]>([]);
  const [historyState, setHistoryState] = useState<HistoryState>("idle");
  const [historyNotice, setHistoryNotice] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [pendingCancelId, setPendingCancelId] = useState("");
  const [cancelingReservationId, setCancelingReservationId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("success");
  useToastError(authError || cancelError || (statusTone === "error" ? statusMessage : "")
    || (historyState === "error" ? "予約履歴を取得できませんでした。もう一度お試しください。" : ""));

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const view = new URLSearchParams(window.location.search).get("view");

      if (isViewMenuKey(view)) {
        setActiveMenu(view);
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    let active = true;
    readMemberSession().then(({ user }) => {
      if (!active) return;
      const account = storeMemberAccount(window.localStorage, user) as Account;
      setCurrentAccount(account);
      setForm(toProfileForm(account));
      setAuthError("");
    }).catch((error) => {
      if (!active) return;
      if (isMemberAuthError(error)) {
        logoutAccount(window.localStorage);
        setCurrentAccount(null);
        router.replace("/login");
      } else {
        setAuthError("ログイン情報を確認できませんでした。もう一度お試しください。");
      }
    });
    return () => { active = false; };
  }, [router, authRetry]);

  useEffect(() => {
    const timer = window.setInterval(() => refreshClock((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);


  useEffect(() => {
    if (!currentAccount?.email) {
      return;
    }

    let isActive = true;
    const frameId = window.requestAnimationFrame(() => {
      setHistoryState("loading");
      setHistoryNotice("");

      fetchReservationHistories(currentAccount.email)
        .then((items: TicketHistory[]) => {
          if (isActive) {
            setHistories(items);
            setHistoryState("ready");
          }
        })
        .catch((error) => {
          if (isActive) {
            if (isMemberAuthError(error)) {
              logoutAccount(window.localStorage);
              router.replace("/login");
              return;
            }
            setHistoryState("error");
          }
        });
    });

    return () => {
      isActive = false;
      window.cancelAnimationFrame(frameId);
    };
  }, [currentAccount?.email, retryKey, router]);

  useEffect(() => {
    if (!pendingCancelId) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !cancelingReservationId) {
        setPendingCancelId("");
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cancelingReservationId, pendingCancelId]);

  const selectedHistory = histories.find((history) => history.id === selectedHistoryId) ?? null;
  const pendingCancelHistory = histories.find((history) => history.id === pendingCancelId) ?? null;

  const handleOpenDetails = (history: TicketHistory) => {
    setHistoryNotice("");
    setSelectedHistoryId(history.id);
    setActiveMenu("history");
  };

  const handleCancelRequest = (history: TicketHistory) => {
    if (canCancelReservation(history)) {
      setCancelError("");
      setHistoryNotice("");
      setPendingCancelId(history.id);
    }
  };

  const handleConfirmCancel = async () => {
    if (!pendingCancelHistory || !currentAccount?.email || cancelLock.current) {
      return;
    }

    setCancelError("");
    const reservationId = pendingCancelHistory.id;
    cancelLock.current = true;
    setCancelingReservationId(reservationId);
    setHistoryNotice("");

    try {
      const result = await cancelReservation(reservationId, currentAccount.email);

      if (!result.ok) {
        setCancelError(result.message || "キャンセルできませんでした。");
        toast.error(result.message || "キャンセルできませんでした。");
        if (result.httpStatus === 401) {
          logoutAccount(window.localStorage);
          router.replace("/login");
        }
        return;
      }

      setHistories((currentHistories) =>
        currentHistories.map((history) =>
          history.id === reservationId
            ? {
                ...history,
                status: "キャンセル済み",
                orderStatus: result.orderStatus,
                paymentStatus: result.paymentStatus,
                refundMode: result.refundMode,
                canCancel: false,
                cancelReason: "キャンセル済みです。",
              }
            : history,
        ),
      );
      setPendingCancelId("");
      toast.event("reservation.cancelled");
      setHistoryNotice(result.refundMode === "simulation" && result.refundedAmount > 0
        ? "キャンセル完了。座席を解放し、テスト決済の支払いを取り消しました。"
        : "キャンセル完了。座席を解放しました。");
    } catch {
      setCancelError("通信を確認できませんでした。もう一度お試しください。再送しても取消処理は重複しません。");
    } finally {
      cancelLock.current = false;
      setCancelingReservationId("");
    }
  };

  const handleMenuClick = async (menuKey: MenuKey) => {
    if (menuKey === "logout") {
      try { await signOutMember(); }
      catch { setHistoryNotice("ログアウトできませんでした。もう一度お試しください。"); toast.error("ログアウトできませんでした。もう一度お試しください。"); return; }
      logoutAccount(window.localStorage);
      setCurrentAccount(null);
      router.replace("/");
      return;
    }

    setSelectedHistoryId("");
    setActiveMenu(menuKey);
    window.history.replaceState(null, "", `/mypage?view=${menuKey}`);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setStatusMessage("");
  };

  const handleSave = () => {
    try {
      const result = updateCurrentAccount(window.localStorage, form) as
        | { ok: true; account: Account }
        | { ok: false; message: string };

      if (!result.ok) {
        setStatusTone("error");
        setStatusMessage(result.message);
        toast.error(result.message);
        return;
      }

      setCurrentAccount(result.account);
      setForm(toProfileForm(result.account));
      setStatusTone("success");
      setStatusMessage("変更を保存しました。");
      toast.event("profile.updated");
    } catch {
      setStatusTone("error");
      setStatusMessage("会員情報を保存できませんでした。ブラウザの保存設定を確認してください。");
    }
  };

  if (authError && currentAccount === undefined) {
    return <div className="min-h-screen"><CampaignHeader /><main className="mx-auto max-w-xl px-6 py-20">
      <p role="alert">{authError}</p>
      <button type="button" className="mt-6 min-h-12 border px-6" onClick={() => setAuthRetry((value) => value + 1)}>再試行</button>
    </main></div>;
  }

  if (currentAccount === undefined) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
        <CampaignHeader />
        <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-6 py-10">
          <div className="w-full space-y-4" aria-label="マイページを読み込み中">
            <div className="cinema-skeleton h-6 w-40" />
            <div className="cinema-skeleton h-16 w-3/4" />
            <div className="cinema-skeleton h-48 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (currentAccount === null) {
    return null;
  }

  const displayName = form.name || currentAccount.name || "メンバー";

  let activePanel;
  if (activeMenu === "reservations") {
    activePanel = (
      <NextReservationPanel
        histories={histories}
        historyState={historyState}
        notice={historyNotice}
        onCancel={handleCancelRequest}
        onOpenDetails={handleOpenDetails}
        onRetry={() => setRetryKey((value) => value + 1)}
      />
    );
  } else if (activeMenu === "history") {
    activePanel = selectedHistory ? (
      <ReservationDetailPanel
        history={selectedHistory}
        notice={historyNotice}
        onBack={() => setSelectedHistoryId("")}
        onCancel={handleCancelRequest}
      />
    ) : (
      <PurchaseHistoryPanel
        histories={histories}
        historyState={historyState}
        notice={historyNotice}
        onCancel={handleCancelRequest}
        onOpenDetails={handleOpenDetails}
        onRetry={() => setRetryKey((value) => value + 1)}
      />
    );
  } else if (activeMenu === "points") {
    activePanel = <PointsPanel />;
  } else if (activeMenu === "profile") {
    activePanel = <ProfilePanel account={currentAccount} />;
  } else {
    activePanel = (
      <SettingsPanel
        form={form}
        onChange={handleChange}
        onSave={handleSave}
        statusMessage={statusMessage}
        statusTone={statusTone}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />
      <main className="cinema-container cinema-page">
        <header className="grid gap-6 border-b border-[var(--border-soft)] pb-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div>
            <p className="cinema-label">HAL CINEMA MEMBER</p>
            <h1 className="cinema-page-title mt-3    text-[var(--text-primary)]">マイページ</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              次の予約、フードの受取案内、購入履歴をひとつの場所で確認できます。
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-bg)] px-5 py-4">
            <p className="text-xs text-[var(--text-muted)]">ログイン中</p>
            <p className="mt-1 font-black text-[var(--text-primary)]">{displayName}</p>
            <p className="mt-1 break-all text-sm text-[var(--text-secondary)]">{currentAccount.email}</p>
          </div>
        </header>

        <div className="mt-7 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="マイページメニュー"
            className="rounded-lg h-fit min-w-0 max-w-full border-y border-[var(--border-soft)] bg-[var(--surface-bg)] p-2 lg:sticky lg:top-28"
          >
            <div className="flex w-full max-w-full gap-2 overflow-x-auto lg:grid">
              {MENU_ITEMS.map((item, index) => {
                const isActive = activeMenu === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleMenuClick(item.key)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-w-[156px] items-center gap-3 px-3 py-3 text-left transition lg:min-w-0 ${
                      isActive
                        ? "bg-[var(--selection-soft)] text-[var(--accent)] ring-1 ring-inset ring-[var(--selection-border)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    <span className="font-mono text-xs opacity-65">{String(index + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="block text-sm font-bold">{item.label}</span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-[0.18em] opacity-65">{item.meta}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div key={activeMenu} className="cinema-feedback min-w-0">{!["history", "reservations"].includes(activeMenu) && historyNotice && <p role="alert" className="mb-4">{historyNotice}</p>}{activePanel}</div>
        </div>
      </main>

      {pendingCancelHistory ? (
        <CancelReservationModal
          history={pendingCancelHistory}
          isSubmitting={cancelingReservationId === pendingCancelHistory.id}
          error={cancelError}
          onClose={() => {
            if (!cancelingReservationId) {
              setPendingCancelId("");
            }
          }}
          onConfirm={handleConfirmCancel}
        />
      ) : null}
    </div>
  );
}
