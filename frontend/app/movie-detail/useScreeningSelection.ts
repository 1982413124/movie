"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToastError } from "@/lib/use-toast-error";
import { buildCatalogScreeningDraft } from "@/lib/public-movie-catalog.mjs";
import type { BookingSelection, ReservationDraft, ScheduleResponse, Screening } from "@/lib/screeningScheduleTypes";

const draftKey = "movieReservationDraft";

function readStored<T>(key: string): T | null {
  try { return JSON.parse(window.sessionStorage.getItem(key) || "null") as T | null; }
  catch { return null; }
}

async function fetchSchedule(movieId: string, dateId: string | undefined, signal: AbortSignal): Promise<ScheduleResponse> {
  const query = new URLSearchParams({ movieId });
  if (dateId) query.set("date", dateId);
  const response = await fetch("/api/screenings?" + query, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("上映スケジュールを取得できませんでした。");
  const data = await response.json() as ScheduleResponse;
  if (!Array.isArray(data.dates) || !Array.isArray(data.screenings) || !data.today || !data.bookingWindow) {
    throw new Error("上映スケジュールを取得できませんでした。");
  }
  return data;
}

export function useScreeningSelection(movieId: string) {
  const selectionKey = `movieScreeningSelection:${movieId}`;
  const router = useRouter();
  const [request, setRequest] = useState<{ dateId?: string; attempt: number }>({ attempt: 0 });
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [selection, setSelection] = useState<BookingSelection | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  useToastError(error || storageError);
  const [isProceeding, setIsProceeding] = useState(false);
  const proceedController = useRef<AbortController | null>(null);
  const proceeding = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
    async function load() {
      try {
        const draft = readStored<ReservationDraft>(draftKey);
        const restored = readStored<BookingSelection>(selectionKey) ?? (draft?.movieId === movieId && draft.screeningDate ? { dateId: draft.screeningDate, screeningId: draft.screeningId } : null);
        const requestedDate = request.dateId ?? restored?.dateId;
        let data = await fetchSchedule(movieId, requestedDate, signal);
        // A previous visit may be outside today's published booking window.
        if (requestedDate && !data.dates.some((date) => date.dateId === requestedDate && date.selectable)) {
          data = await fetchSchedule(movieId, undefined, signal);
        }
        if (controller.signal.aborted) return;
        const selectedId = restored?.dateId === data.selectedDate
          ? data.screenings.find((screening) => screening.id === restored.screeningId && screening.bookable)?.id ?? null
          : null;
        const nextSelection = { dateId: data.selectedDate, screeningId: selectedId };
        setSchedule(data);
        setSelection(nextSelection);
        setLoadState("ready");
        setError("");
        try { window.sessionStorage.setItem(selectionKey, JSON.stringify(nextSelection)); }
        catch { setStorageError("予約内容を保存できません。ブラウザのストレージ設定を確認してください。"); }
      } catch {
        if (!controller.signal.aborted) {
          setLoadState("error");
          setError("上映スケジュールを取得できませんでした。");
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [request, movieId, selectionKey]);

  useEffect(() => () => proceedController.current?.abort(), []);

  function refresh() {
    if (proceeding.current) return;
    setLoadState("loading");
    setError("");
    setRequest((current) => ({ dateId: selection?.dateId, attempt: current.attempt + 1 }));
  }

  function chooseDate(dateId: string) {
    if (proceeding.current || dateId === selection?.dateId) return;
    const next = { dateId, screeningId: null };
    setSelection(next);
    setLoadState("loading");
    setError("");
    try { window.sessionStorage.setItem(selectionKey, JSON.stringify(next)); setStorageError(""); }
    catch { setStorageError("予約内容を保存できません。ブラウザのストレージ設定を確認してください。"); }
    setRequest((current) => ({ dateId, attempt: current.attempt + 1 }));
  }

  function chooseScreening(screening: Screening) {
    if (!schedule?.movie || !screening.bookable || loadState !== "ready" || proceeding.current) return;
    const next = { dateId: screening.dateId, screeningId: screening.id };
    setSelection(next);
    setError("");
    try {
      const draft = buildCatalogScreeningDraft(screening, schedule.movie, readStored<ReservationDraft>(draftKey));
      window.sessionStorage.setItem(draftKey, JSON.stringify(draft));
      window.sessionStorage.setItem(selectionKey, JSON.stringify(next));
      setStorageError("");
    } catch { setStorageError("予約内容を保存できません。ブラウザのストレージ設定を確認してください。"); }
  }

  async function proceed() {
    if (!selection?.screeningId || proceeding.current || loadState !== "ready" || storageError) return;
    proceeding.current = true;
    setIsProceeding(true);
    setError("");
    const controller = new AbortController();
    proceedController.current = controller;
    try {
      const data = await fetchSchedule(movieId, selection.dateId, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]));
      if (controller.signal.aborted) return;
      setSchedule(data);
      const screening = data.screenings.find((item) => item.id === selection.screeningId && item.bookable);
      if (!screening || !data.movie) {
        const next = { dateId: selection.dateId, screeningId: null };
        setSelection(next);
        window.sessionStorage.setItem(selectionKey, JSON.stringify(next));
        setError("選択した上映回は現在予約できません。別の上映回を選択してください。");
        return;
      }
      window.sessionStorage.setItem(draftKey, JSON.stringify(buildCatalogScreeningDraft(screening, data.movie, readStored<ReservationDraft>(draftKey))));
      router.push(`/seats?showingId=${encodeURIComponent(screening.id)}`);
    } catch {
      if (!controller.signal.aborted) {
        setError("最新の空席情報を確認できませんでした。「座席を選択する」からもう一度お試しください。");
      }
    } finally {
      proceeding.current = false;
      if (!controller.signal.aborted) setIsProceeding(false);
    }
  }

  const selectedScreening = schedule?.screenings.find((screening) =>
    screening.id === selection?.screeningId && screening.dateId === selection.dateId && screening.bookable) ?? null;

  return { schedule, selectedDate: selection?.dateId ?? schedule?.selectedDate, selectedScreening, loadState,
    error: error || storageError, isProceeding, canProceed: Boolean(selectedScreening) && loadState === "ready" && !storageError && !isProceeding,
    chooseDate, chooseScreening, refresh, proceed };
}
