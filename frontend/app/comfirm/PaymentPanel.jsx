import Link from "next/link";
import { formatPrice } from "../seats/formatters";

export default function PaymentPanel({
  error,
  methods,
  onConfirm,
  onSelect,
  selectedMethodId,
  totalPrice,
}) {
  return (
    <aside className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">
            支払い
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-800">
            お支払い方法を選択
          </h1>
        </div>
        <p className="font-mono text-lg font-semibold text-gray-800">
          {formatPrice(totalPrice)}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {methods.map((method) => (
          <PaymentMethodButton
            key={method.id}
            isSelected={method.id === selectedMethodId}
            method={method}
            onSelect={onSelect}
          />
        ))}
      </div>

      <p
        aria-live="polite"
        className={`mt-4 min-h-5 text-sm ${
            error ? "text-red-600" : "text-gray-500"
        }`}
      >
        {error || "決済前に購入内容と支払い方法を確認してください。"}
      </p>

      <button
        type="button"
        onClick={onConfirm}
        className="mt-4 w-full rounded-lg bg-gray-700 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-gray-800"
      >
        確認
      </button>

      <Link
        href="/seats"
        className="mt-3 block w-full rounded-lg border border-gray-300 px-5 py-4 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        座席選択へ戻る
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
        "min-h-24 rounded-lg border p-4 text-left transition-colors",
        isSelected
          ? "border-[var(--selection-border)] bg-[var(--selection-bg)]"
          : "border-gray-200 bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      <span
        className={`block text-sm font-semibold ${
          isSelected ? "text-[var(--selection-text)]" : "text-gray-800"
        }`}
      >
        {method.label}
      </span>
      <span
        className={`mt-2 block text-xs leading-5 ${
          isSelected ? "text-[var(--selection-text)]" : "text-gray-500"
        }`}
      >
        {method.description}
      </span>
    </button>
  );
}
