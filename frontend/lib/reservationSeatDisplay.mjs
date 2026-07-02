import { findScreen, findScreening, screenings, theaterScreens } from "./seatSelection.mjs";

function getRowLabels(count) {
  return Array.from({ length: count }, (_, index) =>
    String.fromCharCode("A".charCodeAt(0) + index),
  );
}

function getColumns(count) {
  return Array.from({ length: count }, (_, index) => index + 1);
}

function normalizeSeatId(seatId) {
  return String(seatId ?? "").trim().replace("-", "").toUpperCase();
}

export function createReservationSeatDisplay(screeningId, selectedSeatIds = []) {
  const screening = findScreening(screeningId) ?? screenings[0];
  const screen = findScreen(screening.screenId) ?? theaterScreens[0];
  const selectedSeats = new Set(selectedSeatIds.map(normalizeSeatId).filter(Boolean));
  const rows = getRowLabels(screen.layout.rows);
  const columns = getColumns(screen.layout.columns);

  return {
    capacity: screen.capacity,
    columns,
    screenName: screen.name,
    rows: rows.map((row) => ({
      row,
      seats: columns.map((column) => {
        const id = `${row}-${column}`;

        return {
          id,
          row,
          column,
          isSelected: selectedSeats.has(normalizeSeatId(id)),
        };
      }),
    })),
  };
}
