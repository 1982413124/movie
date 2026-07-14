export type TicketTypeHistory = {
  ticketTypeId: string;
  label: string;
  unitPrice: number;
  quantity: number;
};

export type FoodHistory = {
  foodId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type TicketHistory = {
  id: string;
  purchasedAt: string;
  movieTitle: string;
  screeningId?: string;
  showtime: string;
  screen: string;
  seats: string[];
  ticketCount: number;
  ticketTypes?: TicketTypeHistory[];
  ticketSummary?: string;
  foodItems?: FoodHistory[];
  totalPrice: number;
  status: string;
  paymentStatus?: string;
  posterUrl: string;
};