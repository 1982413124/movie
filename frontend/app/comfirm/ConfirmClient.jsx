"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
import { toast } from "@/lib/toast-store.mjs";
import { useToastError } from "@/lib/use-toast-error";
import EmptyConfirm from "./EmptyConfirm";
import PaymentPanel from "./PaymentPanel";
import ReservationPanel from "./ReservationPanel";
import DiscountPanel from "./DiscountPanel";

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
  const [quote, setQuote] = useState(null);
  const [contactEmail, setContactEmail] = useState("");
  const submitLock = useRef(false);
  const receiveQuote = useCallback(value => {
    setQuote(value);
    if (value) setError("");
  }, []);
  useToastError(error);

  async function handleConfirm() {
    if (!quote || submitLock.current) return;
    const validation = quote.total_price === 0 ? { ok: true } : validatePaymentMethod(paymentMethodId);

    if (!validation.ok) {
      setError(validation.message);
      toast.error(validation.message);
      return;
    }

    if (isSubmitting) {
      return;
    }

    if (!quote.member && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail.trim())) {
      const message = "予約確認メールの送信先を入力してください。";
      setError(message); toast.error(message); return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const account = getCurrentAccount(window.localStorage);
      const response = await createReservation(draft, {
        paymentMethod: quote.total_price === 0 ? "discount" : paymentMethodId,
        userEmail: quote.member ? account?.email ?? "" : "",
        couponCode: quote.coupon_code ?? "", pointsToUse: quote.points_used,
        expectedTotal: quote.total_price, contactEmail: contactEmail.trim(),
      });

      if (!response.ok) {
        if (response.conflict) {
          const seats = response.conflictSeats.length > 0
            ? `: ${response.conflictSeats.join(", ")}`
            : "";
          setError(`選択した座席はすでに予約されています${seats}`);
          return;
        }

        setError(response.message || "予約の確定に失敗しました。時間をおいて再度お試しください。");
        if (response.code) setQuote(null);
        return;
      }

      const paymentMethod = findPaymentMethod(paymentMethodId);
      const details = buildPurchaseCompletion(draft, {
        payMethod: quote.total_price === 0 ? "クーポン・ポイント" : paymentMethod?.label,
        pricing: response.pricing,
        orderNum: response.pricing?.order_num ?? (response.reservationId
          ? `RES-${response.reservationId}`
          : undefined),
      });

      window.sessionStorage.setItem(completedStorageKey, JSON.stringify(details));
      toast.event("reservation.completed");
      router.push("/complete");
    } catch {
      setError("予約の確定に失敗しました。時間をおいて再度お試しください。");
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  if (!summary || !draft) {
    return <EmptyConfirm />;
  }

  return (
    <main className="cinema-container cinema-page text-[var(--text-primary)]">
      <header className="cinema-page-heading"><h1>予約内容の確認・お支払い</h1><p>上映日時・座席・金額を確認して、お支払い方法を選んでください。</p></header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <ReservationPanel summary={quote ? { ...summary, ticketTotalPrice: quote.ticket_total_price, foodTotalPrice: quote.food_total_price, totalPrice: quote.subtotal_amount } : summary} />
        <DiscountPanel draft={draft} onQuote={receiveQuote} disabled={isSubmitting} />
        {quote && <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-6">
          <h2 className="text-lg font-bold">予約確認メール</h2>
          {quote.member ? <p className="mt-2 text-sm text-[var(--text-secondary)]">登録済みのメールアドレスへ、予約内容をお送りします。</p> : <label className="mt-3 block text-sm font-bold" htmlFor="contact-email">送信先メールアドレス
            <input id="contact-email" type="email" autoComplete="email" required maxLength={255} disabled={isSubmitting} value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="mt-2 min-h-11 w-full rounded border border-[var(--border-subtle)] bg-[var(--surface-bg)] px-3" />
          </label>}
        </section>}
      </div>
      <PaymentPanel
        error={error}
        isSubmitting={isSubmitting}
        methods={paymentMethods.filter(method => method.id !== "points")}
        onConfirm={handleConfirm}
        onSelect={(methodId) => {
          setPaymentMethodId(methodId);
          setError("");
        }}
        selectedMethodId={paymentMethodId}
        totalPrice={quote?.total_price ?? summary.totalPrice}
        ready={Boolean(quote)}
      />
      </div>
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
