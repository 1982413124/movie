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
      <div className="border border-[#1C0800]/14 bg-white p-6 shadow-[0_18px_60px_rgba(28,8,0,0.08)]">
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
            error ? "text-[#1C0800]" : "text-[#8C5D2A]"
          }`}
        >
          {error || "座席を選ぶと購入手続きへ進めます。"}
        </p>

        <button
          type="button"
          onClick={onProceed}
          className="mt-4 w-full bg-[#E82020] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#C01818] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E82020]"
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
        "grid w-full grid-cols-[1fr_auto] items-center gap-3 border p-4 text-left transition-colors",
        isActive
          ? "border-[#1C0800] bg-[#1C0800] text-white"
          : "border-[#1C0800]/14 bg-white hover:bg-[#FFF8E1]",
      ].join(" ")}
    >
      <span>
        <span className="block font-mono text-xl font-black">
          {screening.label}
        </span>
        <span
          className={`mt-1 block text-xs uppercase tracking-[0.16em] ${
            isActive ? "text-white" : "text-[#8C5D2A]"
          }`}
        >
          {screening.screenName}
        </span>
      </span>
      <span
        className={`font-mono text-sm ${
          isActive ? "text-white" : "text-[#5C3010]"
        }`}
      >
        {countAvailableSeats(screening.id)}席
      </span>
    </button>
  );
}

function OrderDetails({ selectedSeatIds, ticketCount, totalPrice }) {
  return (
    <div className="mt-6 divide-y divide-[#1C0800]/10 border-y border-[#1C0800]/14">
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
