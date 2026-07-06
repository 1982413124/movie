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

  async function handleConfirm() {
    const validation = validatePaymentMethod(paymentMethodId);

    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    const paymentMethod = findPaymentMethod(paymentMethodId) ?? paymentMethods[0];
    const currentUserEmail = window.localStorage.getItem("movieCurrentUserEmail") ?? "";

    if (!currentUserEmail) {
      setError("ログイン中のアカウント情報が見つかりません。ログインしてください。");
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000"}/api/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...draft,
          userEmail: currentUserEmail,
          paymentMethod: paymentMethod?.id ?? paymentMethodId,
          foodItems: draft.foodItems ?? [],
          seatPrice: draft.totalPrice ? Math.max(1, Math.round(draft.totalPrice / Math.max(1, draft.ticketCount || 1))) : 1800,
        }),
      });

      const payload = await response.json();

      if (!response.ok || payload?.status !== "ok") {
        setError(payload?.message ?? "予約の保存に失敗しました。もう一度お試しください。");
        return;
      }

      const details = buildPurchaseCompletion(draft, {
        payMethod: paymentMethod?.label,
      });

      window.sessionStorage.setItem(completedStorageKey, JSON.stringify(details));
      window.sessionStorage.removeItem(draftStorageKey);
      router.push("/complete");
    } catch {
      setError("予約の保存に失敗しました。通信状態を確認してください。");
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
