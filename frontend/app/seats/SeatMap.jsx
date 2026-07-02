export default function SeatMap({
  seatRows,
  selectedSeatIds,
  selectedScreening,
  onSeatClick,
}) {
  const columns = seatRows[0]?.seats.map((seat) => seat.column) ?? [];
  const gridTemplateColumns = `34px repeat(${columns.length}, minmax(28px, 1fr))`;

  return (
    <div className="p-6">
      <SeatMapHeader selectedScreening={selectedScreening} />

      <div className="border border-[#1C0800]/14 bg-[#FFF8E1] p-4 md:p-6">
        <div className="mx-auto mb-9 h-10 max-w-3xl border-t-2 border-[#1C0800] pt-3 text-center text-[10px] font-black uppercase tracking-[0.32em] text-[#1C0800]">
          スクリーン
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="mx-auto min-w-[720px] max-w-6xl">
            <div
              className="mb-3 grid gap-x-2 text-center font-mono text-[11px] text-[#8C5D2A]"
              style={{ gridTemplateColumns }}
            >
              <span />
              {columns.map((column) => (
                <span key={column}>{column}</span>
              ))}
            </div>

            <div className="grid gap-y-2">
              {seatRows.map((row) => (
                <SeatRow
                  key={row.row}
                  row={row}
                  selectedSeatIds={selectedSeatIds}
                  onSeatClick={onSeatClick}
                  gridTemplateColumns={gridTemplateColumns}
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
          className="bg-[var(--selection-bg)] ring-1 ring-[var(--selection-border)]"
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

function SeatRow({ row, selectedSeatIds, onSeatClick, gridTemplateColumns }) {
  return (
    <div
      className="grid items-center gap-x-2"
      style={{ gridTemplateColumns }}
    >
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
        "h-7 rounded-sm border text-[0px] transition duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C0800]",
        isReserved
          ? "cursor-not-allowed border-[#1C0800]/20 bg-[#1C0800]/20 opacity-70"
          : isSelected
            ? "border-[var(--selection-border)] bg-[var(--selection-bg)] shadow-sm"
            : "border-[#1C0800]/22 bg-white hover:-translate-y-[1px] hover:bg-[#FFF0C0] active:translate-y-[1px]",
      ].join(" ")}
    >
      {seat.id}
    </button>
  );
}