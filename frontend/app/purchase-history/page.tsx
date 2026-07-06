"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CampaignHeader from "../components/CampaignHeader";
import HistoryListHeader from "../components/HistoryListHeader";
import HistoryListItem from "../components/HistoryListItem";
import type { FoodOrderItem, TicketHistory } from "./types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

const statusLabels: Record<string, string> = {
  paid: "支払い済み",
  pending: "未払い",
  cancelled: "キャンセル",
};

type OrderResponse = {
  id: string;
  purchasedAt: string | null;
  movieTitle: string;
  posterUrl: string;
  screeningDate: string | null;
  startTime: string | null;
  endTime: string | null;
  screen: string;
  seats: string[];
  ticketCount: number;
  totalPrice: number;
  status: string;
  foodItems: FoodOrderItem[];
};

function formatDatetime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatShowtime(
  screeningDate: string | null,
  startTime: string | null,
  endTime: string | null,
): string {
  if (!screeningDate) {
    return "-";
  }

  const date = new Date(screeningDate);
  const dateLabel = Number.isNaN(date.getTime())
    ? screeningDate
    : new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      }).format(date);

  const startLabel = startTime ? startTime.slice(0, 5) : "";
  const endLabel = endTime ? endTime.slice(0, 5) : "";
  const timeRange = startLabel ? `${startLabel}${endLabel ? ` ～ ${endLabel}` : ""}` : "";

  return timeRange ? `${dateLabel} ${timeRange}` : dateLabel;
}

function toTicketHistory(order: OrderResponse): TicketHistory {
  return {
    id: order.id,
    purchasedAt: formatDatetime(order.purchasedAt),
    movieTitle: order.movieTitle,
    showtime: formatShowtime(order.screeningDate, order.startTime, order.endTime),
    screen: order.screen,
    seats: order.seats,
    ticketCount: order.ticketCount,
    totalPrice: order.totalPrice,
    status: statusLabels[order.status] ?? order.status ?? "-",
    posterUrl: order.posterUrl,
    foodItems: order.foodItems ?? [],
  };
}

export default function PurchaseHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<TicketHistory[] | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const currentUserEmail = window.localStorage.getItem("movieCurrentUserEmail");

    if (!currentUserEmail) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/orders?email=${encodeURIComponent(currentUserEmail)}`,
        );
        const payload = (await response.json()) as {
          status?: string;
          message?: string;
          orders?: OrderResponse[];
        };

        if (cancelled) {
          return;
        }

        if (!response.ok || payload.status !== "ok") {
          setErrorMessage(payload.message ?? "購入履歴の取得に失敗しました。");
          setHistory([]);
          return;
        }

        setHistory((payload.orders ?? []).map(toTicketHistory));
      } catch {
        if (!cancelled) {
          setErrorMessage("通信エラーが発生しました。通信状態を確認してください。");
          setHistory([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FFF8E1]">
      <CampaignHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-black uppercase tracking-[0.08em] text-[#1C0800]">購入履歴</h1>
        <div className="overflow-hidden border border-[#1C0800]/14">
          <HistoryListHeader />
          {history === null ? (
            <p className="px-6 py-8 text-sm text-[#8C5D2A]">読み込み中...</p>
          ) : history.length === 0 ? (
            <p className="px-6 py-8 text-sm text-[#8C5D2A]">
              {errorMessage || "購入履歴はまだありません。"}
            </p>
          ) : (
            <ul>
              {history.map((item) => (
                <li key={item.id}>
                  <HistoryListItem history={item} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
