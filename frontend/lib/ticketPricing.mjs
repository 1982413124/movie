export const TICKET_CATEGORIES = [
  { id: "general", label: "一般", price: 1800 },
  { id: "student", label: "大学生等", price: 1600 },
  { id: "juniorHigh", label: "中学・高校生", price: 1400 },
  { id: "child", label: "小学生・幼児", price: 1000 },
];

export function createEmptyTicketCounts() {
  return Object.fromEntries(TICKET_CATEGORIES.map((category) => [category.id, 0]));
}

export function totalTicketCount(ticketCounts) {
  return TICKET_CATEGORIES.reduce(
    (sum, category) => sum + (ticketCounts?.[category.id] || 0),
    0,
  );
}

export function totalTicketPrice(ticketCounts) {
  return TICKET_CATEGORIES.reduce(
    (sum, category) => sum + category.price * (ticketCounts?.[category.id] || 0),
    0,
  );
}

export function buildTicketBreakdown(ticketCounts) {
  return TICKET_CATEGORIES.filter((category) => (ticketCounts?.[category.id] || 0) > 0).map(
    (category) => ({
      id: category.id,
      label: category.label,
      price: category.price,
      quantity: ticketCounts[category.id],
    }),
  );
}

export function formatTicketBreakdown(breakdown) {
  if (!breakdown || breakdown.length === 0) {
    return "-";
  }

  return breakdown.map((item) => `${item.label}${item.quantity}枚`).join(" / ");
}
