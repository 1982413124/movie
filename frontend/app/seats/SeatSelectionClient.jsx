"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { fetchReservedSeats } from "@/lib/reservationApi.mjs";
import {
  buildTicketSelection,
  countAvailableSeats,
  createInitialSeatSelection,
  createInitialTicketCounts,
  createSeatMap,
  findScreening,
  movieDetail,
  screenings,
  toggleSeatSelection,
  validateTicketSelection,
} from "@/lib/seatSelection.mjs";
import MovieSummary from "./MovieSummary";
import OrderPanel from "./OrderPanel";
import SeatMap from "./SeatMap";

const draftStorageKey = "movieReservationDraft";

export default function SeatSelectionClient() {
  const router = useRouter();
  const rawDraft = useSessionStorageValue(draftStorageKey);
  const draft = useMemo(() => parseJson(rawDraft), [rawDraft]);
  const restoredSelection = useMemo(
    () => createInitialSeatSelection(draft),
    [draft],
  );
  const restoredTicketCounts = useMemo(
    () => createInitialTicketCounts(draft),
    [draft],
  );
  const [selectionOverride, setSelectionOverride] = useState(null);
  const [ticketCountsOverride, setTicketCountsOverride] = useState(null);
  const [apiReservedSeatIds, setApiReservedSeatIds] = useState([]);
  const [error, setError] = useState("");
  const [validationAttempt, setValidationAttempt] = useState(0);
  const screeningId =
    selectionOverride?.screeningId ?? restoredSelection.screeningId;
  const selectedSeatIds =
    selectionOverride?.selectedSeatIds ?? restoredSelection.selectedSeatIds;
  const ticketCounts = ticketCountsOverride ?? restoredTicketCounts;

  useEffect(() => {
    let isActive = true;

    fetchReservedSeats(screeningId)
      .then((reservedSeats) => {
        if (isActive) {
          setApiReservedSeatIds(reservedSeats);
        }
      })
      .catch(() => {
        if (isActive) {
          setApiReservedSeatIds([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [screeningId]);

  const filteredSelectedSeatIds = useMemo(
    () =>
      selectedSeatIds.filter(
        (seatId) => !apiReservedSeatIds.includes(seatId),
      ),
    [apiReservedSeatIds, selectedSeatIds],
  );
  const seatRows = useMemo(
    () => createSeatMap(screeningId, apiReservedSeatIds),
    [apiReservedSeatIds, screeningId],
  );
  const selectedScreening = findScreening(screeningId) ?? screenings[0];
  const ticketSelection = useMemo(
    () => buildTicketSelection(ticketCounts),
    [ticketCounts],
  );
  const availableSeats = useMemo(
    () => countAvailableSeats(screeningId, apiReservedSeatIds),
    [apiReservedSeatIds, screeningId],
  );

  function handleScreeningChange(nextScreeningId) {
    setSelectionOverride({
      screeningId: nextScreeningId,
      selectedSeatIds: [],
    });
    setError("");
  }

  function handleSeatClick(seat) {
    const nextSeatIds = toggleSeatSelection(filteredSelectedSeatIds, seat);
    setSelectionOverride({
      screeningId,
      selectedSeatIds: nextSeatIds,
    });
    if (nextSeatIds.length > 0) {
      setError("");
    }
  }

  function handleTicketQuantityChange(ticketTypeId, delta) {
    setTicketCountsOverride((currentCounts) => {
      const baseCounts = currentCounts ?? ticketCounts;
      const currentQuantity = Number(baseCounts[ticketTypeId] ?? 0);

      return {
        ...baseCounts,
        [ticketTypeId]: Math.max(0, currentQuantity + delta),
      };
    });
    setError("");
  }

  function handleProceed() {
    const validation = validateTicketSelection(filteredSelectedSeatIds, ticketCounts);

    if (!validation.ok) {
      setValidationAttempt((attempt) => attempt + 1);
      setError(validation.message);
      return;
    }

    const draft = {
      movieId: movieDetail.id,
      movieTitle: movieDetail.title,
      movieDurationMinutes: movieDetail.durationMinutes,
      screeningId: selectedScreening.id,
      screeningTime: selectedScreening.label,
      screeningDate: selectedScreening.dateId,
      screenId: selectedScreening.screenId,
      screenName: selectedScreening.screenName,
      screenCapacity: selectedScreening.capacity,
      theaterName: selectedScreening.theaterName,
      seatIds: filteredSelectedSeatIds,
      ticketTypes: ticketSelection.ticketTypes,
      ticketCount: ticketSelection.totalQuantity,
      ticketTotalPrice: ticketSelection.totalPrice,
      foodItems: [],
      foodTotalPrice: 0,
      totalPrice: ticketSelection.totalPrice,
    };

    window.sessionStorage.setItem("movieReservationDraft", JSON.stringify(draft));
    router.push("/food");
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 text-[#1C0800] md:grid-cols-[minmax(0,1fr)_340px]">
      <section className="overflow-hidden border border-[#1C0800]/14 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.08)]">
        <MovieSummary
          availableSeats={availableSeats}
          selectedScreening={selectedScreening}
        />
        <SeatMap
          onSeatClick={handleSeatClick}
          seatRows={seatRows}
          selectedSeatIds={filteredSelectedSeatIds}
          selectedScreening={selectedScreening}
        />
      </section>

      <OrderPanel
        error={error}
        onProceed={handleProceed}
        onScreeningChange={handleScreeningChange}
        screeningId={screeningId}
        onTicketQuantityChange={handleTicketQuantityChange}
        selectedScreening={selectedScreening}
        selectedSeatIds={filteredSelectedSeatIds}
        ticketCounts={ticketCounts}
        ticketSelection={ticketSelection}
        validationAttempt={validationAttempt}
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
