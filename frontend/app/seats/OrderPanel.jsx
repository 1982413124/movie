import {
  countAvailableSeats,
  formatTicketTypeSummary,
  getScreeningsForDateAndScreen,
  ticketTypes,
} from "@/lib/seatSelection.mjs";
import { formatPrice } from "./formatters";

export default function OrderPanel({
  error,
  onProceed,
  onScreeningChange,
  onTicketQuantityChange,
  screeningId,
  selectedScreening,
  selectedSeatIds,
  ticketCounts,
  ticketSelection,
  validationAttempt = 0,
}) {
  const ticketCount = ticketSelection.totalQuantity;
  const totalPrice = ticketSelection.totalPrice;
  const hasError = Boolean(error);

  return (
    <aside className="md:sticky md:top-8 md:h-fit">
      <div className="border border-[#1C0800]/14 bg-white p-6 shadow-[0_18px_60px_rgba(28,8,0,0.08)]">
        <PanelTitle selectedScreening={selectedScreening} />
        <ScreeningList
          screeningId={screeningId}
          selectedScreening={selectedScreening}
          onScreeningChange={onScreeningChange}
        />
        <TicketTypeControls
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
            hasError ? "ticket-warning-shake text-[#E82020]" : "text-[#8C5D2A]"
          }`}
        >
          {error || "座席数と券種の合計枚数が一致するとフード選択へ進めます。"}
        </p>

        <button
          type="button"
          onClick={onProceed}
          className="mt-4 w-full bg-[var(--button-bg)] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-[var(--button-text)] transition-colors hover:bg-[var(--button-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--selection-border)]"
        >
          フード選択へ進む
        </button>
      </div>
    </aside>
  );
}

function PanelTitle({ selectedScreening }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#8C5D2A]">
          予約内容
        </p>
        <h2 className="mt-2 text-2xl font-black uppercase text-[#1C0800]">
          チケット情報
        </h2>
      </div>
      <span className="border border-[#C8860A]/40 px-3 py-1 font-mono text-xs text-[#8C5D2A]">
        {selectedScreening.dateLabel}
      </span>
    </div>
  );
}

function ScreeningList({ screeningId, selectedScreening, onScreeningChange }) {
  const visibleScreenings = getScreeningsForDateAndScreen(
    selectedScreening.dateId,
    selectedScreening.screenId,
  );

  return (
    <div className="mt-6 space-y-2">
      {visibleScreenings.map((screening) => (
        <ScreeningButton
          key={screening.id}
          isActive={screening.id === screeningId}
          onClick={() => onScreeningChange(screening.id)}
          screening={screening}
        />
      ))}
    </div>
  );
}

function ScreeningButton({ isActive, onClick, screening }) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={[
        "grid w-full grid-cols-[1fr_auto] items-center gap-3 border p-4 text-left transition-colors",
        isActive
          ? "border-[var(--selection-border)] bg-[var(--selection-bg)] text-[var(--selection-text)]"
          : "border-[#1C0800]/14 bg-white hover:bg-[#FFF8E1]",
      ].join(" ")}
    >
      <span>
        <span className="block font-mono text-xl font-black">
          {screening.label}
        </span>
        <span
          className={`mt-1 block text-xs uppercase tracking-[0.16em] ${
            isActive ? "text-[var(--selection-text)]" : "text-[#8C5D2A]"
          }`}
        >
          {screening.screenName}
        </span>
      </span>
      <span
        className={`font-mono text-sm ${
          isActive ? "text-[var(--selection-text)]" : "text-[#5C3010]"
        }`}
      >
        {countAvailableSeats(screening.id)}席
      </span>
    </button>
  );
}

function TicketTypeControls({ onTicketQuantityChange, ticketCounts }) {
  return (
    <div className="mt-6 border-y border-[#1C0800]/14 py-4">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8C5D2A]">
        券種
      </p>
      <div className="mt-3 grid gap-2">
        {ticketTypes.map((ticketType) => {
          const quantity = ticketCounts[ticketType.id] ?? 0;

          return (
            <div
              key={ticketType.id}
              className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 border border-[#1C0800]/10 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1C0800]">{ticketType.label}</p>
                <p className="mt-0.5 font-mono text-xs text-[#8C5D2A]">
                  {formatPrice(ticketType.price)}
                </p>
              </div>
              <div className="grid grid-cols-[30px_36px_30px] items-center border border-[#1C0800]/14 bg-white">
                <button
                  type="button"
                  aria-label={`${ticketType.label}を減らす`}
                  onClick={() => onTicketQuantityChange(ticketType.id, -1)}
                  disabled={quantity === 0}
                  className="grid h-8 place-items-center text-lg font-semibold text-[#5C3010] transition-colors hover:bg-[#F4EFE6] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  -
                </button>
                <span className="grid h-8 place-items-center bg-[#FFF8E1] font-mono text-sm font-black text-[#1C0800]">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label={`${ticketType.label}を増やす`}
                  onClick={() => onTicketQuantityChange(ticketType.id, 1)}
                  className="grid h-8 place-items-center bg-[#1C0800] text-lg font-semibold text-white transition-colors hover:bg-[#3A2A20]"
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
    <div className="mt-6 divide-y divide-[#1C0800]/10 border-y border-[#1C0800]/14">
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
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-sm text-[#8C5D2A]">{label}</span>
      <span
        className={`text-right font-mono font-semibold text-[#1C0800] ${
          large ? "text-xl font-black" : "text-lg"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
