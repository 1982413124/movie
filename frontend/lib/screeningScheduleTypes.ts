export type ScreeningStatus = "available" | "few" | "sold-out" | "not-on-sale" | "closed";
export type Screening = {
  id: string; movieId: string; label: string; startTime: string; endTime: string; endDayOffset: number;
  dateId: string; dateLabel: string; screenId: string; screenName: string; theaterName: string;
  capacity: number; price?: number; remainingSeats: number; status: ScreeningStatus;
  bookable: boolean; availabilityLabel: string; availabilitySymbol: string; salesStartAt?: string;
};
export type CalendarDay = { dateId: string; screeningCount: number; selectable: boolean };
export type ScheduleResponse = {
  movie?: import("./cinema-types").Movie;
  today: string; selectedDate: string; bookingWindow: { from: string; to: string };
  dates: CalendarDay[]; screenings: Screening[];
};
export type BookingSelection = { dateId: string; screeningId: string | null };
export type ReservationDraft = {
  moviePoster?: string | null; seatLabels?: string[];
  movieId?: string; movieTitle?: string; movieDurationMinutes?: number;
  screeningId?: string; screeningDate?: string; selectedDate?: string; screeningTime?: string;
  startTime?: string; endTime?: string; endDayOffset?: number; screenId?: string;
  screenName?: string; screenCapacity?: number; theaterName?: string;
  seatIds?: string[]; ticketTypes?: unknown[]; ticketCount?: number; ticketTotalPrice?: number;
  foodItems?: unknown[]; foodTotalPrice?: number; totalPrice?: number;
};
