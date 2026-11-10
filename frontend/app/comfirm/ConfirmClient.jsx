"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { buildPurchaseCompletion } from "@/lib/purchaseCompletion.mjs";
import {
  buildPurchaseConfirmation,
  findPaymentMethod,
  paymentMethods,
  validatePaymentMethod,
} from "@/lib/purchaseConfirmation.mjs";
import EmptyConfirm from "./EmptyConfirm";
import PaymentPanel from "./PaymentPanel";
import ReservationPanel from "./ReservationPanel";

const draftStorageKey = "movieReservationDraft";
const completedStorageKey = "movieCompletedPurchase";

export default function ConfirmClient() {
  const router = useRouter();
  const rawDraft = useSessionStorageValue(draftStorageKey);
  const draft = useMemo(() => parseJson(rawDraft), [rawDraft]);
  const summary = useMemo(
    () => (draft ? buildPurchaseConfirmation(draft) : null),
    [draft],
  );
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [error, setError] = useState("");

  function handleConfirm() {
    const validation = validatePaymentMethod(paymentMethodId);

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    const paymentMethod = findPaymentMethod(paymentMethodId);
    const details = buildPurchaseCompletion(draft, {
      payMethod: paymentMethod?.label,
    });

    window.sessionStorage.setItem(completedStorageKey, JSON.stringify(details));
    router.push("/complete");
  }

  if (!summary || !draft) {
    return <EmptyConfirm />;
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 text-[#1C0800] md:grid-cols-[minmax(0,1fr)_380px]">
      <ReservationPanel summary={summary} />
      <PaymentPanel
        error={error}
        methods={paymentMethods}
        onConfirm={handleConfirm}
        onSelect={(methodId) => {
          setPaymentMethodId(methodId);
          setError("");
        }}
        selectedMethodId={paymentMethodId}
        totalPrice={summary.totalPrice}
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
