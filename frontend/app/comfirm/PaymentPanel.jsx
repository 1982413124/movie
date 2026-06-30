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
    <aside className="border border-[#1C0800]/14 bg-white p-6 shadow-[0_18px_60px_rgba(28,8,0,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#8C5D2A]">
            支払い
          </p>
          <h1 className="mt-2 text-2xl font-black uppercase text-[#1C0800]">
            お支払い方法を選択
          </h1>
        </div>
        <p className="font-mono text-lg font-semibold text-[#1C0800]">
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
            error ? "text-[#C01818]" : "text-[#8C5D2A]"
        }`}
      >
        {error || "決済前に購入内容と支払い方法を確認してください。"}
      </p>

      <button
        type="button"
        onClick={onConfirm}
        className="mt-4 w-full bg-[#1C0800] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#2b2b2b]"
      >
        確認
      </button>

      <Link
        href="/food"
        className="mt-3 block w-full border border-[#1C0800]/18 px-5 py-4 text-center text-sm font-semibold text-[#5C3010] transition-colors hover:bg-[#FFF8E1]"
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
          ? "border-[#1C0800] bg-[#1C0800] text-white"
          : "border-[#1C0800]/14 bg-white hover:bg-[#FFF8E1]",
      ].join(" ")}
    >
      <span
        className={`block text-sm font-semibold ${
          isSelected ? "text-white" : "text-[#1C0800]"
        }`}
      >
        {method.label}
      </span>
      <span
        className={`mt-2 block text-xs leading-5 ${
          isSelected ? "text-white" : "text-[#8C5D2A]"
        }`}
      >
        {method.description}
      </span>
    </button>
  );
}
