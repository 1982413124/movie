"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  createInitialSeatSelection,
  createSeatMap,
  findScreening,
  movieDetail,
  screenings,
  todayIso,
  toggleSeatSelection,
  validateSeatSelection,
} from "@/lib/seatSelection.mjs";
import {
  buildTicketBreakdown,
  createEmptyTicketCounts,
  totalTicketCount,
  totalTicketPrice,
} from "@/lib/ticketPricing.mjs";
import MovieSummary from "./MovieSummary";
import OrderPanel from "./OrderPanel";
import SeatMap from "./SeatMap";

const draftStorageKey = "movieReservationDraft";
const pickedScreeningStorageKey = "movieSelectedScreening";

export default function SeatSelectionClient() {
  const router = useRouter();
  const rawDraft = useSessionStorageValue(draftStorageKey);
  const draft = useMemo(() => parseJson(rawDraft), [rawDraft]);
  const rawPickedScreening = useSessionStorageValue(pickedScreeningStorageKey);
  const pickedScreening = useMemo(() => parseJson(rawPickedScreening), [rawPickedScreening]);

  const restoredSelection = useMemo(() => {
    const initial = createInitialSeatSelection(draft);
    // 前回未完了の予約で選んだ座席が残らないよう、座席選択は常に空から始める
    const screeningDate =
      draft?.screeningDate || pickedScreening?.date || todayIso();
    const screeningId =
      !draft?.screeningId && pickedScreening?.screeningId && findScreening(pickedScreening.screeningId)
        ? pickedScreening.screeningId
        : initial.screeningId;

    return { screeningId, screeningDate, selectedSeatIds: [] };
  }, [draft, pickedScreening]);

  const [selectionOverride, setSelectionOverride] = useState(null);
  const [ticketCounts, setTicketCounts] = useState(createEmptyTicketCounts);
  const [error, setError] = useState("");
  const [seatRows, setSeatRows] = useState(() => createSeatMap(restoredSelection.screeningId));
  const screeningId =
    selectionOverride?.screeningId ?? restoredSelection.screeningId;
  const screeningDate =
    selectionOverride?.screeningDate ?? restoredSelection.screeningDate;
  const selectedSeatIds =
    selectionOverride?.selectedSeatIds ?? restoredSelection.selectedSeatIds;
  const selectedScreening = findScreening(screeningId) ?? screenings[0];
  const availableSeats = useMemo(
    () => seatRows.flatMap((row) => row.seats).filter((seat) => seat.status !== "reserved").length,
    [seatRows],
  );
  const ticketTotal = totalTicketCount(ticketCounts);
  const totalPrice = totalTicketPrice(ticketCounts);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    async function loadSeats() {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/screenings/${screeningId}/seats?date=${screeningDate}`,
          { signal: controller.signal },
        );
        const payload = await response.json();

        if (!isActive || !response.ok || payload?.status !== "ok") {
          throw new Error(payload?.message ?? "座席情報の取得に失敗しました");
        }

        if (Array.isArray(payload.seats)) {
          setSeatRows(payload.seats);
        }
      } catch {
        if (isActive) {
          setSeatRows(createSeatMap(screeningId));
        }
      }
    }

    loadSeats();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [apiBaseUrl, screeningId, screeningDate]);

  function handleScreeningChange(nextScreeningId) {
    setSelectionOverride({
      screeningId: nextScreeningId,
      screeningDate,
      selectedSeatIds: [],
    });
    setError("");
  }

  function handleTicketCountChange(categoryId, delta) {
    setTicketCounts((current) => {
      const nextValue = Math.max(0, (current[categoryId] || 0) + delta);
      return { ...current, [categoryId]: nextValue };
    });
    setError("");
  }

  function handleSeatClick(seat) {
    if (seat.status === "reserved") {
      return;
    }

    const nextSeatIds = toggleSeatSelection(selectedSeatIds, seat);
    setSelectionOverride({
      screeningId,
      screeningDate,
      selectedSeatIds: nextSeatIds,
    });
    if (nextSeatIds.length > 0) {
      setError("");
    }
  }

  function handleProceed() {
    const validation = validateSeatSelection(selectedSeatIds, ticketTotal);

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    const draft = {
      movieId: movieDetail.id,
      screeningId: selectedScreening.id,
      screeningDate,
      screeningTime: selectedScreening.label,
      screenName: selectedScreening.screenName,
      seatIds: selectedSeatIds,
      ticketCount: selectedSeatIds.length,
      ticketBreakdown: buildTicketBreakdown(ticketCounts),
      totalPrice,
      foodItems: [],
      foodTotalPrice: 0,
    };

    window.sessionStorage.setItem("movieReservationDraft", JSON.stringify(draft));
    router.push("/food");
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 text-[#1C0800] md:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden border border-[#1C0800]/14 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.08)]">
          <MovieSummary
            availableSeats={availableSeats}
            screeningDate={screeningDate}
            selectedScreening={selectedScreening}
          />
          <SeatMap
            onSeatClick={handleSeatClick}
            seatRows={seatRows}
            selectedSeatIds={selectedSeatIds}
            selectedScreening={selectedScreening}
          />
        </section>

        <OrderPanel
          error={error}
          onProceed={handleProceed}
          onScreeningChange={handleScreeningChange}
          onTicketCountChange={handleTicketCountChange}
          screeningDate={screeningDate}
          screeningId={screeningId}
          selectedScreening={selectedScreening}
          selectedSeatIds={selectedSeatIds}
          ticketCounts={ticketCounts}
          ticketTotal={ticketTotal}
          totalPrice={totalPrice}
        />
    </main>
  );
}

function useSessionStorageValue(key) {
  return useSyncExternalStore(
    () => () => {},
    () => window.sessionStorage.getItem(key),
    () => null,
  );
}

function parseJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
