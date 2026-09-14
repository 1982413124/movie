"use client";

import panelStyles from "../components/BookingSidePanel.module.css";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  applyFoodSelectionToDraft,
  buildFoodOrder,
  foodCategories,
  foodHeroSlides,
  getFoodItemsByCategory,
  updateFoodQuantity,
} from "@/lib/foodSelection.mjs";
import { getFoodPickupWindow } from "@/lib/reservationExperience.mjs";
import { formatPrice } from "../seats/formatters";
import { useReducedMotion } from "../components/useReducedMotion";

const draftStorageKey = "movieReservationDraft";

export default function FoodSelectionClient() {
  const router = useRouter();
  const rawDraft = useSessionStorageValue(draftStorageKey);
  const draft = useMemo(() => parseJson(rawDraft), [rawDraft]);
  const restoredSelection = useMemo(() => {
    const items = Array.isArray(draft?.foodItems) ? draft.foodItems : [];
    return Object.fromEntries(items.filter((item) => item?.id).map((item) => [
      item.id, Math.max(0, Math.floor(Number(item.quantity) || 0)),
    ]));
  }, [draft]);
  const [selectionOverride, setSelection] = useState(null);
  const selection = selectionOverride ?? restoredSelection;
  const [activeCategoryId, setActiveCategoryId] = useState(foodCategories[0].id);
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [isPromoPaused, setIsPromoPaused] = useState(true);
  const reducedMotion = useReducedMotion();
  const bumpTimer = useRef(null);
  const [bumpingFoodId, setBumpingFoodId] = useState("");
  const [summaryPulseKey, setSummaryPulseKey] = useState(0);
  const order = useMemo(() => buildFoodOrder(selection), [selection]);

  useEffect(() => {
    if (isPromoPaused || reducedMotion || foodHeroSlides.length < 2) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActivePromoIndex((currentIndex) => (
        currentIndex + 1
      ) % foodHeroSlides.length);
    }, 7000);

    return () => window.clearInterval(timer);
  }, [isPromoPaused, reducedMotion]);

  useEffect(() => () => window.clearTimeout(bumpTimer.current), []);

  function handleCategoryClick(categoryId) {
    setActiveCategoryId(categoryId);
    document.getElementById(`food-row-${categoryId}`)?.scrollIntoView({
      behavior: reducedMotion ? "instant" : "smooth",
      block: "start",
    });
  }

  function handleQuantityChange(foodId, delta) {
    setSelection((currentSelection) => (
      updateFoodQuantity(currentSelection ?? restoredSelection, foodId, delta)
    ));
    setSummaryPulseKey((currentKey) => currentKey + 1);

    if (delta > 0) {
      setBumpingFoodId(foodId);
      window.clearTimeout(bumpTimer.current);
      bumpTimer.current = window.setTimeout(() => setBumpingFoodId(""), 260);
    }
  }

  function handleProceed(nextSelection = selection) {
    if (!draft) {
      router.push("/seats");
      return;
    }

    const nextDraft = applyFoodSelectionToDraft(draft, nextSelection);
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(nextDraft));
    router.push("/confirm");
  }

  if (!draft) {
    return <EmptyFoodSelection />;
  }

  return (
    <main className="cinema-container cinema-page text-[var(--text-primary)]">
      <header className="cinema-page-heading"><h1>フードを選ぶ</h1><p>商品を選んで数量を指定してください。チケットのみの予約もできます。</p></header>
      <FoodPromoCarousel
        activePromoIndex={activePromoIndex}
        onPromoSelect={setActivePromoIndex}
        setIsPromoPaused={setIsPromoPaused}
        isPromoPaused={isPromoPaused}
        reducedMotion={reducedMotion}
      />
      <div className="w-full">
        <FoodContentGrid
          activeCategoryId={activeCategoryId}
          bumpingFoodId={bumpingFoodId}
          draft={draft}
          onCategoryClick={handleCategoryClick}
          onProceed={() => handleProceed(selection)}
          onQuantityChange={handleQuantityChange}
          onSkip={() => handleProceed({})}
          order={order}
          selection={selection}
          summaryPulseKey={summaryPulseKey}
        />
      </div>
    </main>
  );
}

function FoodPromoCarousel({ activePromoIndex, onPromoSelect, isPromoPaused, setIsPromoPaused, reducedMotion }) {
  return (
    <section className="promo-banner-shell relative mb-8 min-h-[250px] overflow-hidden rounded-lg bg-[var(--surface-inverse)] text-white"
      aria-label="おすすめのフード">
      {foodHeroSlides.map((slide, index) => {
        const isActive = index === activePromoIndex;
        return (
          <article key={slide.id} aria-hidden={!isActive}
            className={`absolute inset-0 overflow-hidden transition-opacity duration-300 ${isActive ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            <div className="promo-banner-fill absolute inset-y-0 right-0 w-[64%]">
              <Image loading="eager" src={slide.imageSrc} alt="" aria-hidden="true" fill sizes="(min-width: 1024px) 800px, 100vw" className="object-cover object-center" />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#202326_0%,#202326_30%,rgba(32,35,38,0.7)_52%,transparent_100%)]" />
            <div className="promo-banner-inner relative z-10 max-w-[56%] px-7 pb-20 pt-7">
              <p className="text-xs font-bold text-white/80">{slide.promoLabel}</p>
              <h2 className="mt-2 text-2xl font-bold leading-snug">{slide.title}</h2>
              <p className="mt-3 text-sm">{slide.productName}<span className="ml-4 font-mono font-bold">{slide.priceLabel}</span></p>
              <p className="mt-2 text-sm text-white/80">{slide.offer}</p>
            </div>
          </article>
        );
      })}
      {foodHeroSlides.length > 1 ? <div className="absolute bottom-3 left-6 right-6 z-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="前のフード広告" className="grid h-11 w-11 place-items-center rounded border border-white/40 bg-black/25 text-xl hover:bg-black/50"
            onClick={() => onPromoSelect((activePromoIndex - 1 + foodHeroSlides.length) % foodHeroSlides.length)}>‹</button>
          {foodHeroSlides.map((slide, index) => (
            <button key={slide.id} type="button" aria-label={slide.productName + "の広告を表示"} aria-pressed={index === activePromoIndex}
              onClick={() => onPromoSelect(index)} className="grid h-11 w-11 place-items-center rounded hover:bg-white/15">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full transition-colors ${index === activePromoIndex ? "bg-white" : "bg-white/40"}`} />
            </button>
          ))}
          <button type="button" aria-label="次のフード広告" className="grid h-11 w-11 place-items-center rounded border border-white/40 bg-black/25 text-xl hover:bg-black/50"
            onClick={() => onPromoSelect((activePromoIndex + 1) % foodHeroSlides.length)}>›</button>
        </div>
        {!reducedMotion && <button type="button" aria-pressed={!isPromoPaused} onClick={() => setIsPromoPaused((paused) => !paused)}
          className="min-h-11 rounded border border-white/40 bg-black/25 px-4 text-xs font-bold hover:bg-black/50">{isPromoPaused ? "自動切替を開始" : "自動切替を停止"}</button>}
      </div> : null}
    </section>
  );
}
function FoodContentGrid({
  activeCategoryId,
  bumpingFoodId,
  draft,
  onCategoryClick,
  onProceed,
  onQuantityChange,
  onSkip,
  order,
  selection,
  summaryPulseKey,
}) {
  return (
    <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-8">
        <CategoryTabs
          activeCategoryId={activeCategoryId}
          onCategoryClick={onCategoryClick}
        />
        <FoodRows
          bumpingFoodId={bumpingFoodId}
          onQuantityChange={onQuantityChange}
          selection={selection}
        />
      </div>

      <OrderSummary
          draft={draft}
          onProceed={onProceed}
          onSkip={onSkip}
          order={order}
          summaryPulseKey={summaryPulseKey}
      />
    </div>
  );
}

function CategoryTabs({ activeCategoryId, onCategoryClick }) {
  return (
    <nav
      className="flex gap-2 overflow-x-auto border-y border-[var(--border-subtle)] py-4"
      aria-label="フードカテゴリ"
    >
      {foodCategories.map((category) => {
        const isActive = category.id === activeCategoryId;

        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onCategoryClick(category.id)}
            className={[
              "shrink-0 border px-4 py-3 text-sm font-black transition-colors",
              isActive
                ? "border-[var(--border-strong)] bg-[var(--button-bg)] text-white"
                : "border-[var(--border-subtle)] bg-[var(--surface-bg)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
            ].join(" ")}
          >
            {category.label}
          </button>
        );
      })}
    </nav>
  );
}

function FoodRows({ bumpingFoodId, onQuantityChange, selection }) {
  return (
    <div className="space-y-8">
      {foodCategories.map((category) => (
        <section
          key={category.id}
          id={`food-row-${category.id}`}
          className="scroll-mt-28"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
                Menu
              </p>
              <h2 className="mt-1 text-2xl font-black text-[var(--text-primary)]">
                {category.label}
              </h2>
            </div>

          </div>

          <div
            id={`food-rail-${category.id}`}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {getFoodItemsByCategory(category.id).map((item) => (
              <FoodCard
                key={`${category.id}-${item.id}`}
                isBumping={bumpingFoodId === item.id}
                item={item}
                onQuantityChange={onQuantityChange}
                quantity={selection[item.id] ?? 0}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FoodCard({ isBumping, item, onQuantityChange, quantity }) {
  const isAvailable = item.isAvailable !== false;

  return (
    <article
      className={[
        `relative grid min-h-[330px] snap-start ${item.imageSrc ? "grid-rows-[150px_1fr]" : "grid-rows-1"} overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-bg)] shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:border-[var(--border-subtle)] hover:shadow-sm`,
        isBumping ? "is-bumping" : "",
      ].join(" ")}
    >
      {quantity > 0 ? (
        <span className="selected-badge absolute right-3 top-3 z-20 grid h-8 min-w-8 place-items-center rounded-full bg-[var(--button-bg)] px-2 font-mono text-sm font-black text-white shadow-sm">
          {quantity}
        </span>
      ) : null}

      {item.imageSrc ? (
        <div className="relative overflow-hidden bg-[var(--surface-bg)]">
          <Image
            src={item.imageSrc}
            alt={`${item.name}の商品イメージ`}
            fill
            sizes="260px"
            className="object-cover object-[70%_50%]"
          />
          <span className="rounded-lg absolute left-3 top-3 z-10 w-fit border border-[var(--border-subtle)] bg-[var(--surface-bg)]/90 px-3 py-1 text-[10px] font-semibold text-[var(--text-primary)]">
            {item.badge}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col p-4">
        {!item.imageSrc ? (
          <span className="mb-5 w-fit border border-[var(--border-subtle)] px-3 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
            {item.badge}
          </span>
        ) : null}
        <h3 className="text-lg font-semibold leading-tight text-[var(--text-primary)]">
          {item.name}
        </h3>
        <p className="mt-2 min-h-10 text-xs leading-5 text-[var(--text-secondary)]">
          {item.description}
        </p>
        <dl className="mt-3 space-y-1 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-secondary)]">
          <div className="flex justify-between gap-3">
            <dt>サイズ</dt>
            <dd className="font-semibold text-[var(--text-primary)]">{item.sizeLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>アレルギー</dt>
            <dd className="text-right font-semibold text-[var(--text-primary)]">{item.allergenNote}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>販売状況</dt>
            <dd className={isAvailable ? "font-semibold text-[var(--success)]" : "font-semibold text-[var(--danger)]"}>
              {isAvailable ? "注文受付中" : "売り切れ"}
            </dd>
          </div>
        </dl>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="font-mono text-xl font-semibold text-[var(--text-primary)]">
            {formatPrice(item.price)}
          </p>
          <div className="rounded-lg grid grid-cols-[44px_28px_44px] items-center border border-[var(--border-subtle)] bg-[var(--surface-bg)]">
            <button
              type="button"
              aria-label={item.name + "を減らす"}
              onClick={() => onQuantityChange(item.id, -1)}
              disabled={quantity === 0}
              className="grid h-11 place-items-center bg-[var(--surface-bg)] text-lg font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              -
            </button>
            <span className="grid h-11 place-items-center bg-[var(--surface-muted)] font-mono text-sm font-semibold text-[var(--text-primary)]">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={item.name + "を増やす"}
              onClick={() => onQuantityChange(item.id, 1)}
              disabled={!isAvailable}
              className={[
                "grid h-11 place-items-center bg-[var(--button-bg)] text-lg font-semibold text-white transition-[transform,background-color] hover:bg-[var(--button-hover)] disabled:cursor-not-allowed disabled:bg-[var(--disabled-bg)]",
                isBumping ? "is-bumping" : "",
              ].join(" ")}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
function OrderSummary({ draft, onProceed, onSkip, order, summaryPulseKey }) {
  const ticketTotalPrice = draft.ticketTotalPrice ?? draft.totalPrice ?? 0;
  const totalPrice = ticketTotalPrice + order.totalPrice;
  const showStartAt = draft.screeningDate && draft.screeningTime
    ? `${draft.screeningDate}T${draft.screeningTime}:00+09:00`
    : "";
  const pickup = getFoodPickupWindow(showStartAt);

  return (
    <aside className={"lg:sticky lg:top-28 lg:h-fit" + " " + panelStyles.panel}>
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
          注文内容
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
          ご注文の合計
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          選ばなくても支払いへ進めます。選んだ商品は購入内容に追加されます。
        </p>

        <dl className="mt-5 space-y-3 border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 text-sm">
          <ReservationRow label="作品" value={draft.movieTitle ?? "作品名未設定"} />
          <ReservationRow label="日時" value={`${draft.screeningDate ?? "--"} ${draft.screeningTime ?? "--"}`} />
          <ReservationRow label="スクリーン" value={draft.screenName ?? "--"} />
          <ReservationRow label="座席" value={(draft.seatLabels ?? draft.seatIds)?.join(", ") || "--"} />
        </dl>

        <div className="mt-4 border-l-4 border-[var(--danger)] bg-[var(--selection-soft)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
          <p className="font-bold text-[var(--text-primary)]">受取時間 {pickup.timeLabel}</p>
          <p>受取場所 {pickup.locationLabel}</p>
        </div>

        <div className="mt-6 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          <SummaryRow label="チケット" value={formatPrice(ticketTotalPrice)} />
          <SummaryRow label={`フード ${order.totalQuantity}点`} value={formatPrice(order.totalPrice)} />
          <SummaryRow
            key={`total-${summaryPulseKey}`}
            label="合計"
            value={formatPrice(totalPrice)}
            large
            pulse
          />
        </div>

        <div aria-live="polite" aria-atomic="true" className="mt-5 min-h-20 space-y-2">
          {order.items.length > 0 ? (
            order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 text-[var(--text-secondary)]">
                  {item.name} x {item.quantity}
                </span>
                <span className="font-mono font-semibold text-[var(--text-primary)]">
                  {formatPrice(item.lineTotal)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              フードはまだ選択されていません。
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onProceed}
          className="mt-6 w-full bg-[var(--button-bg)] px-5 py-4 text-sm font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[var(--button-hover)]"
        >
          支払いへ進む
        </button>

        <button
          type="button"
          onClick={onSkip}
          className="mt-3 w-full border border-[var(--border-subtle)] px-5 py-4 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)]"
        >
          今回は注文しない
        </button>
      </div>
    </aside>
  );
}

function ReservationRow({ label, value }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="text-right font-semibold text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

function SummaryRow({ label, value, large = false, pulse = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span
        className={[
          "text-right font-mono font-semibold text-[var(--text-primary)]",
          large ? "text-xl font-black" : "text-lg",
          pulse ? "food-summary-pulse" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyFoodSelection() {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-4 py-12 text-[var(--text-primary)]">
      <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-8 text-center shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">
          Food Selection
        </p>
        <h1 className="cinema-page-title mt-3">座席選択から始めてください</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          フードは予約内容に追加するため、先に座席を選択する必要があります。
        </p>
        <Link
          href="/seats"
          className="mt-6 inline-flex bg-[var(--button-bg)] px-5 py-4 text-sm font-black text-white transition-colors hover:bg-[var(--button-hover)]"
        >
          座席選択へ
        </Link>
      </section>
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






