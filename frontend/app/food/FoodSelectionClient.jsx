"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
import { formatPrice } from "../seats/formatters";

const draftStorageKey = "movieReservationDraft";

export default function FoodSelectionClient() {
  const router = useRouter();
  const rawDraft = useSessionStorageValue(draftStorageKey);
  const draft = useMemo(() => parseJson(rawDraft), [rawDraft]);
  const [selection, setSelection] = useState({});
  const [activeCategoryId, setActiveCategoryId] = useState(foodCategories[0].id);
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [isPromoPaused, setIsPromoPaused] = useState(false);
  const [bumpingFoodId, setBumpingFoodId] = useState("");
  const [summaryPulseKey, setSummaryPulseKey] = useState(0);
  const order = useMemo(() => buildFoodOrder(selection), [selection]);

  useEffect(() => {
    if (isPromoPaused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActivePromoIndex((currentIndex) => (
        currentIndex + 1
      ) % foodHeroSlides.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [isPromoPaused]);

  function handleCategoryClick(categoryId) {
    setActiveCategoryId(categoryId);
    document.getElementById(`food-row-${categoryId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleShowAll(categoryId) {
    document.getElementById(`food-rail-${categoryId}`)?.scrollBy({
      left: 560,
      behavior: "smooth",
    });
  }

  function handleQuantityChange(foodId, delta) {
    setSelection((currentSelection) => (
      updateFoodQuantity(currentSelection, foodId, delta)
    ));
    setSummaryPulseKey((currentKey) => currentKey + 1);

    if (delta > 0) {
      setBumpingFoodId(foodId);
      window.setTimeout(() => setBumpingFoodId(""), 260);
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
    <main className="w-full pb-10 text-[#1C0800]">
      <FoodPromoCarousel
        activePromoIndex={activePromoIndex}
        onPromoSelect={setActivePromoIndex}
        setIsPromoPaused={setIsPromoPaused}
      />
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <FoodContentGrid
          activeCategoryId={activeCategoryId}
          bumpingFoodId={bumpingFoodId}
          draft={draft}
          onCategoryClick={handleCategoryClick}
          onProceed={() => handleProceed(selection)}
          onQuantityChange={handleQuantityChange}
          onShowAll={handleShowAll}
          onSkip={() => handleProceed({})}
          order={order}
          selection={selection}
          summaryPulseKey={summaryPulseKey}
        />
      </div>
    </main>
  );
}

function FoodPromoCarousel({ activePromoIndex, onPromoSelect, setIsPromoPaused }) {
  return (
    <section
      className="promo-banner-shell relative mb-10 min-h-[250px] w-full overflow-hidden bg-[#15110D] text-white shadow-[0_24px_80px_rgba(28,8,0,0.16)] sm:min-h-[290px]"
      aria-label="映画館フード広告"
      onMouseEnter={() => setIsPromoPaused(true)}
      onMouseLeave={() => setIsPromoPaused(false)}
    >
      {foodHeroSlides.map((slide, index) => {
        const isActive = index === activePromoIndex;

        return (
          <article
            key={slide.id}
            className={[
              "absolute inset-0 overflow-hidden bg-[#15110D] transition-[opacity,transform] duration-700 ease-out",
              isActive
                ? "opacity-100 translate-y-0"
                : "pointer-events-none opacity-0 translate-y-3",
            ].join(" ")}
            aria-hidden={!isActive}
          >
            <div className="promo-banner-fill absolute inset-y-0 right-0 w-full lg:w-[70%]">
              <Image
                src={slide.imageSrc}
                alt=""
                aria-hidden="true"
                fill
                loading={index === 0 ? "eager" : "lazy"}
                priority={index === 0}
                sizes="100vw"
                className="object-contain object-center opacity-88 saturate-[0.9] lg:object-right"
              />
            </div>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(13,10,7,0.96) 0%, rgba(13,10,7,0.78) 34%, rgba(13,10,7,0.28) 68%, rgba(13,10,7,0.04) 100%)",
              }}
            />
            <div className="promo-banner-inner relative z-10 mx-auto flex min-h-[250px] w-full max-w-[1500px] items-end px-4 py-7 sm:min-h-[290px] sm:px-6 sm:py-9 lg:px-10">
              <div className="max-w-[520px] border-l border-white/24 pl-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-white/64">
                  {slide.promoLabel}
                </p>
                <h1 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-5xl">
                  {slide.title}
                </h1>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/78">
                  <span className="text-base font-semibold text-white">
                    {slide.productName}
                  </span>
                  <span className="font-mono text-white/80">{slide.priceLabel}</span>
                  <span>{slide.offer}</span>
                </div>
                <p className="mt-4 max-w-sm text-sm leading-6 text-white/68">
                  {slide.subtitle}
                </p>
              </div>
            </div>
            <span className="absolute right-5 top-5 z-10 font-mono text-xs tracking-[0.28em] text-white/54">
              {slide.visualLabel}
            </span>
          </article>
        );
      })}

      <div className="absolute inset-x-0 bottom-5 z-20">
        <div className="mx-auto flex w-full max-w-[1500px] gap-2 px-4 sm:px-6 lg:px-10">
          {foodHeroSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={slide.productName + "の広告を表示"}
              aria-pressed={index === activePromoIndex}
              onClick={() => onPromoSelect(index)}
              className={[
                "promo-dot h-1.5 rounded-full transition-all duration-300",
                index === activePromoIndex
                  ? "w-9 bg-white"
                  : "w-1.5 bg-white/38 hover:bg-white/70",
              ].join(" ")}
            />
          ))}
        </div>
      </div>
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
  onShowAll,
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
          onShowAll={onShowAll}
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
      className="flex gap-2 overflow-x-auto border-y border-[#1C0800]/14 py-4"
      aria-label="フードカテゴリ"
    >
      {foodCategories.map((category) => {
        const isActive = category.id === activeCategoryId;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryClick(category.id)}
            className={[
              "shrink-0 border px-4 py-3 text-sm font-black transition-colors",
              isActive
                ? "border-[#1C0800] bg-[#1C0800] text-white"
                : "border-[#1C0800]/16 bg-white text-[#5C3010] hover:bg-[#F4EFE6]",
            ].join(" ")}
          >
            {category.label}
          </button>
        );
      })}
    </nav>
  );
}

function FoodRows({ bumpingFoodId, onQuantityChange, onShowAll, selection }) {
  return (
    <div className="space-y-8">
      {foodCategories.map((category) => (
        <section
          key={category.id}
          id={`food-row-${category.id}`}
          className="scroll-mt-6"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#A0703A]">
                Menu
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#1C0800]">
                {category.label}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onShowAll(category.id)}
              className="shrink-0 border border-[#1C0800]/16 bg-white px-4 py-2 text-xs font-semibold text-[#5C3010] transition-colors hover:bg-[#F4EFE6]"
            >
              一覧を表示
            </button>
          </div>

          <div
            id={`food-rail-${category.id}`}
            className="grid snap-x snap-mandatory auto-cols-[minmax(220px,260px)] grid-flow-col gap-4 overflow-x-auto scroll-px-2 pb-3"
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
  const visual = item.visual ?? {};
  const previewStyle = {
    backgroundImage: 'url("' + item.imageSrc + '")',
    "--food-surface": visual.surface ?? "#F4F0E8",
    "--food-accent": visual.accent ?? "#332D27",
  };

  return (
    <article
      className={[
        "relative grid min-h-[330px] snap-start grid-rows-[150px_1fr] overflow-hidden border border-[#1C0800]/12 bg-[#FFFEF8] shadow-[0_14px_36px_rgba(28,8,0,0.06)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-[#1C0800]/22 hover:shadow-[0_22px_52px_rgba(28,8,0,0.10)]",
        isBumping ? "is-bumping" : "",
      ].join(" ")}
    >
      {quantity > 0 ? (
        <span className="selected-badge absolute right-3 top-3 z-20 grid h-8 min-w-8 place-items-center rounded-full bg-[#1C0800] px-2 font-mono text-sm font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
          {quantity}
        </span>
      ) : null}

      <div className="food-card-media relative overflow-hidden" style={previewStyle}>
        <div className="relative z-10 flex h-full flex-col justify-between p-4">
          <span className="w-fit border border-[#1C0800]/14 bg-white/78 px-3 py-1 text-[10px] font-semibold text-[#1C0800] backdrop-blur">
            {item.badge}
          </span>
          <div className="food-card-mark">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.28em]">
              HAL CINEMA
            </span>
            <span className="mt-2 block text-xl font-semibold leading-none">
              {visual.label ?? item.name}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col p-4">
        <h3 className="text-lg font-semibold leading-tight text-[#1C0800]">
          {item.name}
        </h3>
        <p className="mt-2 min-h-10 text-xs leading-5 text-[#6D5847]">
          {item.description}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="font-mono text-xl font-semibold text-[#1C0800]">
            {formatPrice(item.price)}
          </p>
          <div className="grid grid-cols-[36px_34px_36px] items-center border border-[#1C0800]/14 bg-white">
            <button
              type="button"
              aria-label={item.name + "を減らす"}
              onClick={() => onQuantityChange(item.id, -1)}
              className="grid h-9 place-items-center bg-white text-lg font-semibold text-[#5C3010] transition-colors hover:bg-[#F4EFE6]"
            >
              -
            </button>
            <span className="grid h-9 place-items-center bg-[#F6F1E8] font-mono text-sm font-semibold text-[#1C0800]">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={item.name + "を増やす"}
              onClick={() => onQuantityChange(item.id, 1)}
              className={[
                "grid h-9 place-items-center bg-[#1C0800] text-lg font-semibold text-white transition-[transform,background-color] hover:bg-[#3A2A20]",
                isBumping ? "is-bumping scale-110" : "",
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

  return (
    <aside className="lg:sticky lg:top-8 lg:h-fit">
      <div className="border border-[#1C0800]/12 bg-[#FFFEF8] p-6 shadow-[0_18px_60px_rgba(28,8,0,0.07)]">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#8C5D2A]">
          Optional
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#1C0800]">
          フードを追加
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#8C5D2A]">
          選ばなくても支払いへ進めます。選んだ商品は購入内容に追加されます。
        </p>

        <div className="mt-6 divide-y divide-[#1C0800]/10 border-y border-[#1C0800]/14">
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

        <div className="mt-5 min-h-20 space-y-2">
          {order.items.length > 0 ? (
            order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 text-[#5C3010]">
                  {item.name} x {item.quantity}
                </span>
                <span className="font-mono font-semibold text-[#1C0800]">
                  {formatPrice(item.lineTotal)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#8C5D2A]">
              フードはまだ選択されていません。
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onProceed}
          className="mt-6 w-full bg-[#1C0800] px-5 py-4 text-sm font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[#3A2A20]"
        >
          支払いへ進む
        </button>

        <button
          type="button"
          onClick={onSkip}
          className="mt-3 w-full border border-[#1C0800]/16 px-5 py-4 text-sm font-semibold text-[#5C3010] transition-colors hover:bg-[#F4EFE6]"
        >
          選ばず支払いへ
        </button>
      </div>
    </aside>
  );
}

function SummaryRow({ label, value, large = false, pulse = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-sm text-[#8C5D2A]">{label}</span>
      <span
        className={[
          "text-right font-mono font-semibold text-[#1C0800]",
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
    <main className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-4 py-12 text-[#1C0800]">
      <section className="border border-[#1C0800]/14 bg-white p-8 text-center shadow-[0_18px_60px_rgba(28,8,0,0.08)]">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#8C5D2A]">
          Food Selection
        </p>
        <h1 className="mt-3 text-3xl font-black">座席選択から始めてください</h1>
        <p className="mt-3 text-sm leading-6 text-[#8C5D2A]">
          フードは予約内容に追加するため、先に座席を選択する必要があります。
        </p>
        <Link
          href="/seats"
          className="mt-6 inline-flex bg-[#1C0800] px-5 py-4 text-sm font-black text-white transition-colors hover:bg-[#2b2b2b]"
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






