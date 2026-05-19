import { countAvailableSeats, screenings } from "@/lib/seatSelection.mjs";
import { formatPrice } from "./formatters";

export default function OrderPanel({
  error,
  onProceed,
  onScreeningChange,
  screeningId,
  selectedScreening,
  selectedSeatIds,
}) {
  const ticketCount = selectedSeatIds.length;
  const totalPrice = selectedScreening.price * ticketCount;

  return (
    <aside className="md:sticky md:top-8 md:h-fit">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
        <PanelTitle selectedScreening={selectedScreening} />
        <ScreeningList
          screeningId={screeningId}
          onScreeningChange={onScreeningChange}
        />
        <OrderDetails
          selectedSeatIds={selectedSeatIds}
          ticketCount={ticketCount}
          totalPrice={totalPrice}
        />

        <p
          aria-live="polite"
          className={`mt-4 min-h-5 text-sm ${
            error ? "text-red-600" : "text-gray-500"
          }`}
        >
          {error || "座席を選ぶと購入手続きへ進めます。"}
        </p>

        <button
          type="button"
          onClick={onProceed}
          className="mt-4 w-full rounded-lg bg-gray-700 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-gray-800"
        >
          購入へ進む
        </button>
      </div>
    </aside>
  );
}

function PanelTitle({ selectedScreening }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-500">
          予約内容
        </p>
        <h2 className="mt-2 text-2xl font-bold text-gray-800">チケット情報</h2>
      </div>
      <span className="rounded border border-gray-300 px-3 py-1 font-mono text-xs text-gray-600">
        {selectedScreening.dateLabel}
      </span>
    </div>
  );
}

function ScreeningList({ screeningId, onScreeningChange }) {
  return (
    <div className="mt-6 space-y-2">
      {screenings.map((screening) => (
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
        "grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-lg border p-4 text-left transition-colors",
        isActive
          ? "border-[var(--selection-border)] bg-[var(--selection-bg)] text-[var(--selection-text)]"
          : "border-gray-200 bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      <span>
        <span className="block font-mono text-xl font-semibold">
          {screening.label}
        </span>
        <span
          className={`mt-1 block text-xs ${
            isActive ? "text-[var(--selection-text)]" : "text-gray-500"
          }`}
        >
          {screening.screenName}
        </span>
      </span>
      <span
        className={`font-mono text-sm ${
          isActive ? "text-[var(--selection-text)]" : "text-gray-700"
        }`}
      >
        {countAvailableSeats(screening.id)}席
      </span>
    </button>
  );
}

function OrderDetails({ selectedSeatIds, ticketCount, totalPrice }) {
  return (
    <div className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
      <DetailRow
        label="選択座席"
        value={selectedSeatIds.length > 0 ? selectedSeatIds.join(", ") : "--"}
      />
      <DetailRow label="チケット" value={`一般 ${ticketCount}枚`} />
      <DetailRow label="合計" value={formatPrice(totalPrice)} large />
    </div>
  );
}

function DetailRow({ label, value, large = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-sm text-gray-600">{label}</span>
      <span
        className={`text-right font-semibold text-gray-800 ${
          large ? "font-mono text-xl" : "font-mono text-lg"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
