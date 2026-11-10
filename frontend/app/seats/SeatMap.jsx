const columns = [1, 2, 3, 4, 5, 6, 7];

export default function SeatMap({
  seatRows,
  selectedSeatIds,
  selectedScreening,
  onSeatClick,
}) {
  return (
    <div className="p-6">
      <SeatMapHeader selectedScreening={selectedScreening} />

      <div className="border border-[#1C0800]/14 bg-[#FFF8E1] p-4 md:p-6">
        <div className="mx-auto mb-9 h-10 max-w-3xl border-t-2 border-[#1C0800] pt-3 text-center text-[10px] font-black uppercase tracking-[0.32em] text-[#1C0800]">
          スクリーン
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="mx-auto min-w-[620px] max-w-4xl">
            <div className="mb-3 grid grid-cols-[34px_repeat(7,minmax(48px,1fr))] gap-x-7 text-center font-mono text-[11px] text-[#8C5D2A]">
              <span />
              {columns.map((column) => (
                <span key={column}>{column}</span>
              ))}
            </div>

            <div className="grid gap-y-3">
              {seatRows.map((row) => (
                <SeatRow
                  key={row.row}
                  row={row}
                  selectedSeatIds={selectedSeatIds}
                  onSeatClick={onSeatClick}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeatMapHeader({ selectedScreening }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-lg font-black uppercase tracking-[0.08em] text-[#1C0800]">
          {selectedScreening.theaterName}
        </h2>
        <p className="mt-1 text-xs text-[#8C5D2A]">
          空席のみ複数選択できます。選択済みの座席は再度押すと解除されます。
        </p>
      </div>

      <div className="flex gap-4 text-xs text-[#8C5D2A]">
        <LegendChip label="利用可能" className="border border-[#1C0800]/22 bg-white" />
        <LegendChip label="予約済み" className="bg-[#1C0800]/30" />
        <LegendChip
          label="選択中"
          className="bg-[#1C0800] ring-1 ring-[#1C0800]"
        />
      </div>
    </div>
  );
}

function LegendChip({ label, className }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-5 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

function SeatRow({ row, selectedSeatIds, onSeatClick }) {
  return (
    <div className="grid grid-cols-[34px_repeat(7,minmax(48px,1fr))] items-center gap-x-7">
      <span className="font-mono text-[11px] font-semibold text-[#8C5D2A]">
        {row.row}
      </span>
      {row.seats.map((seat) => (
        <SeatButton
          key={seat.id}
          seat={seat}
          isSelected={selectedSeatIds.includes(seat.id)}
          onSeatClick={onSeatClick}
        />
      ))}
    </div>
  );
}

function SeatButton({ seat, isSelected, onSeatClick }) {
  const isReserved = seat.status === "reserved";

  return (
    <button
      type="button"
      disabled={isReserved}
      aria-pressed={isSelected}
      aria-label={`${seat.id} ${
        isReserved ? "予約済み" : isSelected ? "選択中" : "利用可能"
      }`}
      onClick={() => onSeatClick(seat)}
      className={[
        "h-8 rounded-sm border text-[0px] transition duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C0800]",
        isReserved
          ? "cursor-not-allowed border-[#1C0800]/20 bg-[#1C0800]/20 opacity-70"
          : isSelected
            ? "border-[#1C0800] bg-[#1C0800] shadow-sm"
            : "border-[#1C0800]/22 bg-white hover:-translate-y-[1px] hover:bg-[#FFF0C0] active:translate-y-[1px]",
      ].join(" ")}
    >
      {seat.id}
    </button>
  );
}
