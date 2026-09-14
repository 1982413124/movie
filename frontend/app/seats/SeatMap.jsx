export default function SeatMap({
  seatRows,
  selectedSeatIds,
  selectedScreening,
  onSeatClick,
  disabled = false,
}) {
  const columns = seatRows[0]?.seats.map((seat) => seat.column) ?? [];
  const seatGridStyle = { "--seat-columns": columns.length };

  return (
    <div className="p-6">
      <SeatMapHeader selectedScreening={selectedScreening} />

      <div className="border border-[var(--border-subtle)] bg-[var(--page-bg)] p-4 md:p-6">
        <div className="mx-auto mb-9 h-10 max-w-3xl border-t-2 border-[var(--border-strong)] pt-3 text-center text-[10px] font-black uppercase tracking-wide text-[var(--text-primary)]">
          スクリーン
        </div>

        <p id="seat-scroll-hint" className="mb-3 text-xs font-semibold text-[var(--text-secondary)] md:hidden">
          座席表は横にスクロールできます。
        </p>
        <div
          className="overflow-x-auto pb-3"
          aria-describedby="seat-scroll-hint"
          tabIndex={0}
        >
          <div className="mx-auto min-w-[860px] max-w-6xl lg:min-w-[660px]">
            <div
              className="seat-grid mb-3 grid gap-x-2 text-center font-mono text-[11px] text-[var(--text-muted)] lg:gap-x-1"
              style={seatGridStyle}
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
                  seatGridStyle={seatGridStyle}
                  disabled={disabled}
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
        <h2 className="text-lg font-black uppercase tracking-[0.08em] text-[var(--text-primary)]">
          {selectedScreening.theaterName}
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          空席のみ複数選択できます。選択済みの座席は再度押すと解除されます。
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
        <LegendChip label="利用可能" className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)]" />
        <LegendChip label="予約済み" className="bg-[var(--disabled-bg)]" />
        <LegendChip label="仮押さえ中" className="border border-amber-400 bg-amber-100" />
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

function SeatRow({ row, selectedSeatIds, onSeatClick, seatGridStyle, disabled }) {
  return (
    <div
      className="seat-grid grid items-center gap-x-2 lg:gap-x-1"
      style={seatGridStyle}
    >
      <span className="font-mono text-[11px] font-semibold text-[var(--text-muted)]">
        {row.row}
      </span>
      {row.seats.map((seat) => (
        <SeatButton
          key={seat.id}
          seat={seat}
          isSelected={selectedSeatIds.includes(seat.id)}
          onSeatClick={onSeatClick}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function SeatButton({ seat, isSelected, onSeatClick, disabled }) {
  const isReserved = seat.status === "reserved";
  const isHeld = seat.status === "held";

  return (
    <button
      type="button"
      disabled={disabled || isReserved}
      aria-pressed={isSelected}
      aria-label={`${seat.label || seat.id} ${
        isReserved ? "予約済み" : isHeld ? "仮押さえ中・残り時間を確認" : isSelected ? "選択中" : "利用可能"
      }`}
      onClick={() => onSeatClick(seat)}
      className={[
        "h-9 min-w-9 rounded-sm border text-[10px] font-bold transition duration-200 lg:h-9 lg:min-w-0",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
        isReserved
          ? "cursor-not-allowed border-[var(--border-subtle)] bg-[var(--disabled-bg)] text-[var(--disabled-text)]"
          : isHeld
            ? "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
          : isSelected
            ? "border-[var(--selection-border)] bg-[var(--selection-bg)] text-[var(--selection-text)] shadow-sm"
            : "border-[var(--border-subtle)] bg-[var(--surface-bg)] hover:-translate-y-[1px] hover:bg-[var(--surface-muted)] active:translate-y-[1px]",
      ].join(" ")}
    >
      {isReserved ? "×" : isHeld ? "仮" : isSelected ? "✓" : seat.column}
    </button>
  );
}
