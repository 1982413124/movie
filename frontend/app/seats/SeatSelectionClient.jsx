"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { fetchReservedSeats } from "@/lib/reservationApi.mjs";
import {
  countAvailableSeats,
  createInitialSeatSelection,
  createSeatMap,
  findScreening,
  movieDetail,
  screenings,
  toggleSeatSelection,
  validateSeatSelection,
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
  const [selectionOverride, setSelectionOverride] = useState(null);
  const [apiReservedSeatIds, setApiReservedSeatIds] = useState([]);
  const [error, setError] = useState("");
  const screeningId =
    selectionOverride?.screeningId ?? restoredSelection.screeningId;
  const selectedSeatIds =
    selectionOverride?.selectedSeatIds ?? restoredSelection.selectedSeatIds;

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

  function handleProceed() {
    const validation = validateSeatSelection(filteredSelectedSeatIds);

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    const draft = {
      movieId: movieDetail.id,
      screeningId: selectedScreening.id,
      screeningTime: selectedScreening.label,
      screenName: selectedScreening.screenName,
      seatIds: filteredSelectedSeatIds,
      ticketCount: filteredSelectedSeatIds.length,
      ticketTotalPrice: selectedScreening.price * filteredSelectedSeatIds.length,
      foodItems: [],
      foodTotalPrice: 0,
      totalPrice: selectedScreening.price * filteredSelectedSeatIds.length,
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
        selectedScreening={selectedScreening}
        selectedSeatIds={filteredSelectedSeatIds}
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