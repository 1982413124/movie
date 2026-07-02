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

export const ticketTypes = [
  { id: "general", label: "一般", price: 1800 },
  { id: "student", label: "大学生等", price: 1600 },
  { id: "junior", label: "中学・高校", price: 1400 },
  { id: "child", label: "小学生・幼児", price: 1000 },
];

export const theaterScreens = [
  {
    id: "screen-1",
    name: "スクリーン 1",
    size: "large",
    sizeLabel: "大",
    capacity: 200,
    layout: { rows: 10, columns: 20 },
  },
  {
    id: "screen-2",
    name: "スクリーン 2",
    size: "large",
    sizeLabel: "大",
    capacity: 200,
    layout: { rows: 10, columns: 20 },
  },
  {
    id: "screen-3",
    name: "スクリーン 3",
    size: "large",
    sizeLabel: "大",
    capacity: 200,
    layout: { rows: 10, columns: 20 },
  },
  {
    id: "screen-4",
    name: "スクリーン 4",
    size: "medium",
    sizeLabel: "中",
    capacity: 120,
    layout: { rows: 8, columns: 15 },
  },
  {
    id: "screen-5",
    name: "スクリーン 5",
    size: "medium",
    sizeLabel: "中",
    capacity: 120,
    layout: { rows: 8, columns: 15 },
  },
  {
    id: "screen-6",
    name: "スクリーン 6",
    size: "small",
    sizeLabel: "小",
    capacity: 70,
    layout: { rows: 7, columns: 10 },
  },
  {
    id: "screen-7",
    name: "スクリーン 7",
    size: "small",
    sizeLabel: "小",
    capacity: 70,
    layout: { rows: 7, columns: 10 },
  },
  {
    id: "screen-8",
    name: "スクリーン 8",
    size: "small",
    sizeLabel: "小",
    capacity: 70,
    layout: { rows: 7, columns: 10 },
  },
];

export const screeningDates = [
  { id: "2026-06-30", label: "6/30(火)", shortLabel: "6/30", dayLabel: "火", caption: "本日" },
  { id: "2026-07-01", label: "7/1(水)", shortLabel: "7/1", dayLabel: "水", caption: "明日" },
  { id: "2026-07-02", label: "7/2(木)", shortLabel: "7/2", dayLabel: "木", caption: "通常上映" },
  { id: "2026-07-03", label: "7/3(金)", shortLabel: "7/3", dayLabel: "金", caption: "レイト追加" },
  { id: "2026-07-04", label: "7/4(土)", shortLabel: "7/4", dayLabel: "土", caption: "週末" },
  { id: "2026-07-05", label: "7/5(日)", shortLabel: "7/5", dayLabel: "日", caption: "週末" },
];

const baseTimesBySize = {
  large: ["10:10", "13:40", "18:20", "20:50"],
  medium: ["11:00", "15:10", "19:30", "23:15"],
  small: ["09:30", "14:20", "18:00"],
};

export const screenings = screeningDates.flatMap((date, dateIndex) =>
  theaterScreens.flatMap((screen, screenIndex) =>
    baseTimesBySize[screen.size].map((time, timeIndex) => ({
      id: createScreeningId(dateIndex, screen.id, time),
      label: time,
      dateId: date.id,
      dateLabel: dateIndex === 0 ? "本日" : date.label,
      screenId: screen.id,
      screenName: screen.name,
      screenSize: screen.sizeLabel,
      theaterName: "HAL CINEMA 名古屋栄",
      capacity: screen.capacity,
      price: ticketTypes[0].price,
      bookingLevel: createBookingLevel(dateIndex, screenIndex, timeIndex),
    })),
  ),
);

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

function createScreeningId(dateIndex, screenId, time) {
  if (dateIndex === 0 && screenId === "screen-3" && time === "18:20") {
    return "scr-1820";
  }

  if (dateIndex === 0 && screenId === "screen-1" && time === "20:50") {
    return "scr-2050";
  }

  if (dateIndex === 0 && screenId === "screen-5" && time === "23:15") {
    return "scr-2315";
  }

  return `scr-${dateIndex + 1}-${screenId.replace("screen-", "s")}-${time.replace(":", "")}`;
}

function createBookingLevel(dateIndex, screenIndex, timeIndex) {
  return (dateIndex * 13 + screenIndex * 7 + timeIndex * 11) % 42;
}

function getRowLabels(count) {
  return Array.from({ length: count }, (_, index) =>
    String.fromCharCode("A".charCodeAt(0) + index),
  );
}

function getColumns(count) {
  return Array.from({ length: count }, (_, index) => index + 1);
}

export function getTheaterCapacityTotal() {
  return theaterScreens.reduce((total, screen) => total + screen.capacity, 0);
}

export function findScreen(screenId) {
  return theaterScreens.find((screen) => screen.id === screenId);
}

export function findScreening(screeningId) {
  return screenings.find((screening) => screening.id === screeningId);
}

export function getScreeningsForDate(dateId) {
  return screenings.filter((screening) => screening.dateId === dateId);
}

export function getScreeningsForDateAndScreen(dateId, screenId) {
  return screenings.filter(
    (screening) => screening.dateId === dateId && screening.screenId === screenId,
  );
}

function createReservedSeatSet(screeningId, apiReservedSeatIds = []) {
  return new Set([
    ...(reservedSeatsByScreening[screeningId] ?? []),
    ...apiReservedSeatIds.map((seatId) => String(seatId ?? "").trim()).filter(Boolean),
  ]);
}

export function createSeatMap(screeningId, apiReservedSeatIds = []) {
  const screening = findScreening(screeningId) ?? screenings[0];
  const screen = findScreen(screening.screenId) ?? theaterScreens[0];
  const reservedSeats = createReservedSeatSet(screening.id, apiReservedSeatIds);
  const rowLabels = getRowLabels(screen.layout.rows);
  const columns = getColumns(screen.layout.columns);

  return rowLabels.map((row) => ({
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

export function countAvailableSeats(screeningId, apiReservedSeatIds = []) {
  return createSeatMap(screeningId, apiReservedSeatIds)
    .flatMap((row) => row.seats)
    .filter((seat) => seat.status === "available").length;
}

export function createInitialSeatSelection(draft) {
  const fallbackScreening = findScreening("scr-1820") ?? screenings[0];
  const fallback = {
    screeningId: fallbackScreening.id,
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