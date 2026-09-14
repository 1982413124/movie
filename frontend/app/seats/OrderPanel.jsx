import panelStyles from "../components/BookingSidePanel.module.css";
import Link from "next/link";
import {
  formatTicketTypeSummary,
  ticketTypes,
} from "@/lib/seatSelection.mjs";
import { formatPrice } from "./formatters";

export default function OrderPanel({
  error,
  isProceedDisabled = false,
  onProceed,
  onTicketQuantityChange,
  selectedScreening,
  selectedSeatIds,
  ticketCounts,
  ticketSelection,
  validationAttempt = 0,
  availableTicketTypes = ticketTypes,
  movieId,
}) {
  const ticketCount = ticketSelection.totalQuantity;
  const totalPrice = ticketSelection.totalPrice;
  const hasError = Boolean(error);

  return (
    <aside className={"md:sticky md:top-28 md:h-fit" + " " + panelStyles.panel}>
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-5 shadow-sm">
        <PanelTitle selectedScreening={selectedScreening} />
        <div className="mt-4 flex items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-4 text-sm">
          <div><p className="font-bold">{selectedScreening.label} ～ {selectedScreening.endDayOffset ? "翌" : ""}{selectedScreening.endTime}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{selectedScreening.screenName}</p></div>
          <Link href={movieId ? `/movie-detail?movieId=${encodeURIComponent(movieId)}` : "/movie-detail"} className="shrink-0 text-xs font-bold text-[var(--accent)] underline underline-offset-4">上映回を変更</Link>
        </div>
        <TicketTypeControls
          availableTicketTypes={availableTicketTypes}
          onTicketQuantityChange={onTicketQuantityChange}
          ticketCounts={ticketCounts}
        />
        <OrderDetails
          selectedSeatIds={selectedSeatIds}
          ticketCount={ticketCount}
          ticketSelection={ticketSelection}
          totalPrice={totalPrice}
        />

        <p
          key={hasError ? validationAttempt : "ticket-hint"}
          aria-live="polite"
          className={`mt-4 min-h-5 text-sm font-bold ${
            hasError ? "ticket-warning-shake text-[var(--danger)]" : "text-[var(--text-muted)]"
          }`}
        >
          {error || "座席数と券種の合計枚数が一致するとフード選択へ進めます。"}
        </p>

        <button
          type="button"
          onClick={onProceed}
          disabled={isProceedDisabled}
          className="mt-4 w-full bg-[var(--button-bg)] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-[var(--button-text)] transition-colors hover:bg-[var(--button-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--selection-border)] disabled:cursor-not-allowed disabled:bg-[var(--disabled-bg)] disabled:text-[var(--text-muted)]"
        >
          {isProceedDisabled ? "空席情報を確認中" : "フード選択へ進む"}
        </button>
      </div>
    </aside>
  );
}

function PanelTitle({ selectedScreening }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
          予約内容
        </p>
        <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">
          チケット情報
        </h2>
      </div>
      <span className="border border-[var(--border-soft)] px-3 py-1 font-mono text-xs text-[var(--text-muted)]">
        {selectedScreening.dateLabel}
      </span>
    </div>
  );
}

function TicketTypeControls({ onTicketQuantityChange, ticketCounts, availableTicketTypes }) {
  return (
    <div className="mt-5 border-y border-[var(--border-subtle)] py-4">
      <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
        券種
      </p>
      <div className="mt-3 grid gap-2">
        {availableTicketTypes.map((ticketType) => {
          const quantity = ticketCounts[ticketType.id] ?? 0;

          return (
            <div
              key={ticketType.id}
              className="grid grid-cols-[minmax(0,1fr)_116px] items-center gap-3 border border-[var(--border-subtle)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{ticketType.label}</p>
                <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
                  {formatPrice(ticketType.price)}
                </p>
              </div>
              <div className="rounded-lg grid grid-cols-[44px_28px_44px] items-center border border-[var(--border-subtle)] bg-[var(--surface-bg)]">
                <button
                  type="button"
                  aria-label={`${ticketType.label}を減らす`}
                  onClick={() => onTicketQuantityChange(ticketType.id, -1)}
                  disabled={quantity === 0}
                  className="grid h-11 place-items-center text-lg font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  -
                </button>
                <span className="grid h-11 place-items-center bg-[var(--surface-muted)] font-mono text-sm font-black text-[var(--text-primary)]">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label={`${ticketType.label}を増やす`}
                  onClick={() => onTicketQuantityChange(ticketType.id, 1)}
                  className="grid h-11 place-items-center bg-[var(--button-bg)] text-lg font-semibold text-white transition-colors hover:bg-[var(--button-hover)]"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderDetails({ selectedSeatIds, ticketCount, ticketSelection, totalPrice }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="mt-5 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
      <DetailRow
        label="選択座席"
        value={selectedSeatIds.length > 0 ? selectedSeatIds.join(", ") : "--"}
      />
      <DetailRow label="券種" value={formatTicketTypeSummary(ticketSelection.ticketTypes, ticketCount)} />
      <DetailRow label="枚数" value={`${ticketCount}枚 / 座席${selectedSeatIds.length}席`} />
      <DetailRow label="合計" value={formatPrice(totalPrice)} large />
    </div>
  );
}

function DetailRow({ label, value, large = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span
        className={`text-right font-mono font-semibold text-[var(--text-primary)] ${
          large ? "text-xl font-black" : "text-lg"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
