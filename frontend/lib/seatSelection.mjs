export const movieDetail = {
  id: "movie-001",
  title: "映画のタイトル",
  subtitle: "サブタイトル",
  genre: "ジャンル",
  durationMinutes: 124,
  ageRating: "G",
  synopsis:
    "映画のあらすじがここに入る",
};

export const screenings = [
  {
    id: "scr-1820",
    label: "18:20",
    dateLabel: "本日",
    screenName: "スクリーン 3",
    theaterName: "CINEMA XX",
    price: 1800,
  },
  {
    id: "scr-2050",
    label: "20:50",
    dateLabel: "本日",
    screenName: "スクリーン 1",
    theaterName: "CINEMA XX",
    price: 1800,
  },
  {
    id: "scr-2315",
    label: "23:15",
    dateLabel: "本日",
    screenName: "スクリーン 5",
    theaterName: "CINEMA XX",
    price: 1500,
  },
];

const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
const columns = [1, 2, 3, 4, 5, 6, 7];

const reservedSeatsByScreening = {
  "scr-1820": [
    "A-2",
    "A-3",
    "A-4",
    "B-1",
    "B-2",
    "B-3",
    "B-4",
    "B-5",
    "B-6",
    "B-7",
    "C-1",
    "C-2",
    "C-3",
    "D-1",
    "D-4",
    "D-5",
    "D-6",
    "E-2",
    "E-3",
    "E-4",
    "E-5",
    "E-6",
    "E-7",
    "F-2",
    "F-3",
    "F-4",
    "F-7",
    "G-3",
    "G-4",
    "H-5",
    "H-6",
    "H-7",
  ],
  "scr-2050": [
    "A-1",
    "A-2",
    "B-2",
    "B-5",
    "B-6",
    "C-3",
    "C-4",
    "D-2",
    "D-3",
    "D-4",
    "E-1",
    "E-5",
    "F-4",
    "F-5",
    "F-6",
    "G-1",
    "G-7",
    "H-2",
    "H-3",
  ],
  "scr-2315": [
    "A-5",
    "A-6",
    "B-3",
    "C-1",
    "C-2",
    "C-7",
    "D-4",
    "E-2",
    "E-3",
    "F-1",
    "F-5",
    "G-3",
    "G-4",
    "G-5",
    "H-6",
  ],
};

export function createSeatMap(screeningId) {
  const reservedSeats = new Set(reservedSeatsByScreening[screeningId] ?? []);

  return rows.map((row) => ({
    row,
    seats: columns.map((column) => {
      const id = `${row}-${column}`;

      return {
        id,
        row,
        column,
        status: reservedSeats.has(id) ? "reserved" : "available",
      };
    }),
  }));
}

export function countAvailableSeats(screeningId) {
  return createSeatMap(screeningId)
    .flatMap((row) => row.seats)
    .filter((seat) => seat.status === "available").length;
}

export function findScreening(screeningId) {
  return screenings.find((screening) => screening.id === screeningId);
}

export function createInitialSeatSelection(draft) {
  const fallback = {
    screeningId: screenings[0].id,
    selectedSeatIds: [],
  };

  if (!draft) {
    return fallback;
  }

  const screeningId = findScreening(draft.screeningId)
    ? draft.screeningId
    : fallback.screeningId;
  const selectedSeatIds = Array.isArray(draft.seatIds) ? draft.seatIds : [];

  return { screeningId, selectedSeatIds };
}

export function toggleSeatSelection(selectedSeatIds, seat) {
  if (seat.status === "reserved") {
    return selectedSeatIds;
  }

  if (selectedSeatIds.includes(seat.id)) {
    return selectedSeatIds.filter((seatId) => seatId !== seat.id);
  }

  return [...selectedSeatIds, seat.id];
}

export function validateSeatSelection(selectedSeatIds) {
  if (selectedSeatIds.length === 0) {
    return {
      ok: false,
      message: "座席を1つ以上選択してください。",
    };
  }

  return { ok: true, message: "" };
}
