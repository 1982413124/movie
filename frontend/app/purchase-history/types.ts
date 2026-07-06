export type FoodOrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type TicketHistory = {
  id: string;
  purchasedAt: string;
  movieTitle: string;
  showtime: string;
  screen: string;
  seats: string[];
  ticketCount: number;
  totalPrice: number;
  status: string;
  posterUrl: string;
  foodItems: FoodOrderItem[];
};