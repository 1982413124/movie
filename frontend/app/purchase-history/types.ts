export type TicketHistory = {
  id: string;
  purchasedAt: string;
  movieTitle: string;
  screeningId?: string;
  showtime: string;
  screen: string;
  seats: string[];
  ticketCount: number;
  totalPrice: number;
  status: string;
  posterUrl: string;
};