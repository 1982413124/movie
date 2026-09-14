import panelStyles from "../components/BookingSidePanel.module.css";
import Link from "next/link";
import { formatPrice } from "../seats/formatters";

export default function PaymentPanel({
  error,
  isSubmitting = false,
  methods,
  onConfirm,
  onSelect,
  selectedMethodId,
  totalPrice,
  ready = true,
}) {
  return (
    <aside className={"rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-6 shadow-sm md:sticky md:top-28 md:h-fit" + " " + panelStyles.panel}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
            支払い
          </p>
          <h2 className="mt-2 text-xl   uppercase text-[var(--text-primary)]">
            {ready && totalPrice === 0 ? "お支払いはありません" : "お支払い方法を選択"}
          </h2>
        </div>
        <p className="font-mono text-lg font-semibold text-[var(--text-primary)]">
          {formatPrice(totalPrice)}
        </p>
      </div>

      {totalPrice > 0 && <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {methods.map((method) => (
          <PaymentMethodButton
            key={method.id}
            isSelected={method.id === selectedMethodId}
            method={method}
            onSelect={onSelect}
          />
        ))}
      </div>}

      <p
        aria-live="polite"
        className={`mt-4 min-h-5 text-sm ${
            error ? "text-[var(--danger)]" : "text-[var(--text-muted)]"
        }`}
      >
        {error || (!ready ? "割引を適用して料金を確認してください。" : "購入内容と最終支払額を確認してください。")}
      </p>

      <button
        type="button"
        disabled={isSubmitting || !ready}
        aria-busy={isSubmitting}
        onClick={onConfirm}
        className="mt-4 w-full bg-[var(--button-bg)] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-[var(--button-text)] transition-colors hover:bg-[var(--button-hover)] disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "予約処理中..." : totalPrice === 0 ? "予約を確定する" : "予約を確定して支払う"}
      </button>

      <Link
        href="/food"
        className="mt-3 block w-full border border-[var(--border-subtle)] px-5 py-4 text-center text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)]"
      >
        フード選択へ戻る
      </Link>
    </aside>
  );
}

function PaymentMethodButton({ isSelected, method, onSelect }) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(method.id)}
      className={[
        "min-h-24 border p-4 text-left transition-colors",
        isSelected
          ? "border-[var(--selection-border)] bg-[var(--selection-bg)] text-[var(--selection-text)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-bg)] hover:bg-[var(--surface-muted)]",
      ].join(" ")}
    >
      <span
        className={`block text-sm font-semibold ${
          isSelected ? "text-[var(--selection-text)]" : "text-[var(--text-primary)]"
        }`}
      >
        {method.label}
      </span>
      <span
        className={`mt-2 block text-xs leading-5 ${
          isSelected ? "text-[var(--selection-text)]" : "text-[var(--text-muted)]"
        }`}
      >
        {method.description}
      </span>
    </button>
  );
}
