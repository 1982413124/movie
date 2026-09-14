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
  purchasedAtRaw?: string;
  movieId?: string;
  movieTitle: string;
  screeningId?: string;
  showDate?: string;
  showStartAt?: string;
  showtime: string;
  screen: string;
  seats: string[];
  ticketCount: number;
  ticketTypes?: TicketTypeHistory[];
  ticketSummary?: string;
  foodItems?: FoodHistory[];
  totalPrice: number;
  subtotalAmount?: number;
  ticketTotalPrice?: number;
  couponCode?: string;
  couponDiscountAmount?: number;
  pointsUsed?: number;
  pointsEarned?: number;
  orderNum?: string;
  status: string;
  orderStatus?: string;
  paymentStatus?: string;
  canCancel?: boolean;
  cancelDeadline?: string;
  cancelReason?: string;
  refundMode?: string;
  posterUrl: string;
};
