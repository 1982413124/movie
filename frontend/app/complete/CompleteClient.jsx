"use client";

import { useMemo, useSyncExternalStore } from "react";
import CompletionActions from "./CompletionActions";
import CompletionHeader from "./CompletionHeader";
import EmptyCompletion from "./EmptyCompletion";
import PurchaseSummary from "./PurchaseSummary";

const completedStorageKey = "movieCompletedPurchase";

export default function CompleteClient() {
  const rawDetails = useSessionStorageValue(completedStorageKey);
  const details = useMemo(() => parseJson(rawDetails), [rawDetails]);

  if (!details) {
    return <EmptyCompletion />;
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 text-gray-800 md:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)]">
      <div className="space-y-6">
        <CompletionHeader details={details} />
        <CompletionActions />
      </div>
      <PurchaseSummary details={details} />
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
