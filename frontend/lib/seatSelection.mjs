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

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

export function createScreeningDates(now = new Date()) {
  const startDate = createLocalDate(now);

  return Array.from({ length: 6 }, (_, dateIndex) => {
    const date = addDays(startDate, dateIndex);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayLabel = weekdayLabels[date.getDay()];
    const shortLabel = `${month}/${day}`;

    return {
      id: formatDateId(date),
      label: `${shortLabel}(${dayLabel})`,
      shortLabel,
      dayLabel,
      caption: createScreeningDateCaption(dateIndex, date),
    };
  });
}

export const screeningDates = createScreeningDates();

function createLocalDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const source = Number.isNaN(date.getTime()) ? new Date() : date;

  return new Date(source.getFullYear(), source.getMonth(), source.getDate());
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);

  return nextDate;
}

function formatDateId(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createScreeningDateCaption(dateIndex, date) {
  if (dateIndex === 0) {
    return "本日";
  }

  if (dateIndex === 1) {
    return "明日";
  }

  const day = date.getDay();
  return day === 0 || day === 6 ? "週末" : "通常上映";
}

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

function normalizeQuantity(value) {
  const quantity = Number(value ?? 0);

  if (!Number.isFinite(quantity)) {
    return 0;
  }

  return Math.max(0, Math.floor(quantity));
}

export function normalizeTicketTypes(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((ticketType) => {
      const ticketTypeId = String(
        ticketType?.ticketTypeId ?? ticketType?.ticket_type_id ?? ticketType?.id ?? "",
      ).trim();
      const knownTicketType = ticketTypes.find((item) => item.id === ticketTypeId);
      const label = String(ticketType?.label ?? knownTicketType?.label ?? "").trim();
      const unitPrice = Number(
        ticketType?.unitPrice ?? ticketType?.unit_price ?? knownTicketType?.price ?? 0,
      );
      const quantity = normalizeQuantity(ticketType?.quantity);

      return {
        ticketTypeId,
        label,
        unitPrice: Number.isFinite(unitPrice) ? Math.max(0, Math.floor(unitPrice)) : 0,
        quantity,
      };
    })
    .filter((ticketType) => ticketType.ticketTypeId && ticketType.label && ticketType.quantity > 0);
}

export function normalizeTicketCounts(ticketCounts) {
  const counts = Object.fromEntries(ticketTypes.map((ticketType) => [ticketType.id, 0]));

  if (Array.isArray(ticketCounts)) {
    for (const ticketType of normalizeTicketTypes(ticketCounts)) {
      counts[ticketType.ticketTypeId] = ticketType.quantity;
    }
    return counts;
  }

  if (!ticketCounts || typeof ticketCounts !== "object") {
    return counts;
  }

  for (const ticketType of ticketTypes) {
    counts[ticketType.id] = normalizeQuantity(ticketCounts[ticketType.id]);
  }

  return counts;
}

export function createInitialTicketCounts(draft) {
  if (Array.isArray(draft?.ticketTypes) && draft.ticketTypes.length > 0) {
    return normalizeTicketCounts(draft.ticketTypes);
  }

  const counts = normalizeTicketCounts(null);
  const fallbackQuantity = normalizeQuantity(
    draft?.ticketCount ?? (Array.isArray(draft?.seatIds) ? draft.seatIds.length : 0),
  );

  if (fallbackQuantity > 0) {
    counts.general = fallbackQuantity;
  }

  return counts;
}

export function buildTicketSelection(ticketCounts) {
  const counts = normalizeTicketCounts(ticketCounts);
  const selectedTicketTypes = ticketTypes
    .map((ticketType) => {
      const quantity = counts[ticketType.id] ?? 0;

      return {
        ticketTypeId: ticketType.id,
        label: ticketType.label,
        unitPrice: ticketType.price,
        quantity,
        lineTotal: ticketType.price * quantity,
      };
    })
    .filter((ticketType) => ticketType.quantity > 0);

  return {
    ticketTypes: selectedTicketTypes,
    totalQuantity: selectedTicketTypes.reduce((total, ticketType) => total + ticketType.quantity, 0),
    totalPrice: selectedTicketTypes.reduce((total, ticketType) => total + ticketType.lineTotal, 0),
  };
}

export function formatTicketTypeSummary(ticketTypesValue, fallbackTicketCount = 0) {
  const normalizedTicketTypes = normalizeTicketTypes(ticketTypesValue);

  if (normalizedTicketTypes.length > 0) {
    return normalizedTicketTypes
      .map((ticketType) => `${ticketType.label} ${ticketType.quantity}枚`)
      .join("、");
  }

  const count = normalizeQuantity(fallbackTicketCount);
  return count > 0 ? `一般 ${count}枚` : "--";
}

export function validateTicketSelection(selectedSeatIds, ticketCounts) {
  const seatValidation = validateSeatSelection(selectedSeatIds);

  if (!seatValidation.ok) {
    return seatValidation;
  }

  const ticketSelection = buildTicketSelection(ticketCounts);

  if (selectedSeatIds.length !== ticketSelection.totalQuantity) {
    return {
      ok: false,
      message: "選択した座席数と券種の合計枚数を一致させてください。",
    };
  }

  return { ok: true, message: "" };
}
