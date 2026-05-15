import Header from "../components/Header";
import HistoryListHeader from "../components/HistoryListHeader";
import HistoryListItem from "../components/HistoryListItem";
import type { TicketHistory } from "./types";

const mockData: TicketHistory[] = [
  {
    id: "1",
    purchasedAt: "2025/03/11 10:25",
    movieTitle: "ダミー映画タイトル A",
    showtime: "2025/03/11（火）13:45 ～ 15:58",
    screen: "スクリーン5",
    seats: ["C10", "C11", "C12"],
    ticketCount: 3,
    totalPrice: 10500,
    status: "-",
    posterUrl: "",
  },
  {
    id: "2",
    purchasedAt: "2025/02/28 18:40",
    movieTitle: "ダミー映画タイトル B",
    showtime: "2025/02/28（金）16:30 ～ 18:45",
    screen: "スクリーン3",
    seats: ["D5", "D6"],
    ticketCount: 2,
    totalPrice: 4800,
    status: "-",
    posterUrl: "",
  },
  {
    id: "3",
    purchasedAt: "2025/02/14 12:15",
    movieTitle: "ダミー映画タイトル C",
    showtime: "2025/02/14（金）10:00 ～ 12:10",
    screen: "スクリーン1",
    seats: ["A8", "A9", "A10", "A11"],
    ticketCount: 4,
    totalPrice: 6800,
    status: "-",
    posterUrl: "",
  },
  {
    id: "4",
    purchasedAt: "2025/01/30 09:05",
    movieTitle: "ダミー映画タイトル D",
    showtime: "2025/01/30（木）20:00 ～ 22:15",
    screen: "スクリーン7",
    seats: ["E12", "E13"],
    ticketCount: 2,
    totalPrice: 4600,
    status: "-",
    posterUrl: "",
  },
];

export default function PurchaseHistoryPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">購入履歴</h1>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <HistoryListHeader />
          <ul>
            {mockData.map((item) => (
              <li key={item.id}>
                <HistoryListItem history={item} />
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
