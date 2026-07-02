"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getCurrentAccount } from "@/lib/authStorage.mjs";
import { buildPurchaseCompletion } from "@/lib/purchaseCompletion.mjs";
import {
  buildPurchaseConfirmation,
  findPaymentMethod,
  paymentMethods,
  validatePaymentMethod,
} from "@/lib/purchaseConfirmation.mjs";
import { createReservation } from "@/lib/reservationApi.mjs";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    const validation = validatePaymentMethod(paymentMethodId);

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const account = getCurrentAccount(window.localStorage);
      const response = await createReservation(draft, {
        userEmail: account?.email ?? "",
      });

      if (!response.ok) {
        if (response.conflict) {
          const seats = response.conflictSeats.length > 0
            ? `: ${response.conflictSeats.join(", ")}`
            : "";
          setError(`選択した座席はすでに予約されています${seats}`);
          return;
        }

        setError("予約の確定に失敗しました。時間をおいて再度お試しください。");
        return;
      }

      const paymentMethod = findPaymentMethod(paymentMethodId);
      const details = buildPurchaseCompletion(draft, {
        payMethod: paymentMethod?.label,
      });

      window.sessionStorage.setItem(completedStorageKey, JSON.stringify(details));
      router.push("/complete");
    } catch {
      setError("予約の確定に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!summary || !draft) {
    return <EmptyConfirm />;
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 text-[#1C0800] md:grid-cols-[minmax(0,1fr)_380px]">
      <ReservationPanel summary={summary} />
      <PaymentPanel
        error={error}
        isSubmitting={isSubmitting}
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