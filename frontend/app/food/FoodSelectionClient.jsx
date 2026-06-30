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
    <main className="w-full pb-8 text-[#1C0800]">
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
      className="promo-banner-shell relative mb-8 min-h-[270px] w-full overflow-hidden bg-[#D58A14] text-white shadow-[0_24px_80px_rgba(28,8,0,0.16)] sm:min-h-[310px]"
      aria-label="映画館フード広告"
      onMouseEnter={() => setIsPromoPaused(true)}
      onMouseLeave={() => setIsPromoPaused(false)}
    >
      {foodHeroSlides.map((slide, index) => {
        const isActive = index === activePromoIndex;
        const slideStyle = {
          backgroundColor: "#D58A14",
          backgroundImage: "linear-gradient(90deg, #7A3B06 0%, #C87910 28%, #F2B51E 56%, #B85A09 100%)",
        };

        return (
          <article
            key={slide.id}
            className={[
              "absolute inset-0 overflow-hidden transition-[opacity,transform] duration-700 ease-out",
              isActive
                ? "opacity-100 translate-y-0"
                : "pointer-events-none opacity-0 translate-y-4",
            ].join(" ")}
            style={slideStyle}
            aria-hidden={!isActive}
          >
            <div className="promo-banner-fill absolute inset-0 grid place-items-center bg-[#D58A14]">
              <Image
                src={slide.imageSrc}
                alt=""
                aria-hidden="true"
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-contain object-center opacity-95"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#1C0800]/70 via-[#1C0800]/32 to-[#1C0800]/8" />
            <div className="promo-banner-inner relative z-10 mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
              <div className="grid min-h-[270px] gap-5 sm:min-h-[310px] lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="bg-[#1C0800] px-3 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-white">
                      {slide.promoLabel}
                    </span>
                    <span className="border border-white/55 bg-white/18 px-3 py-2 text-[10px] font-black uppercase tracking-[0.26em] text-white backdrop-blur">
                      {slide.offer}
                    </span>
                  </div>
                  <p className="mt-6 text-sm font-black uppercase tracking-[0.34em] text-white/82">
                    Cinema Food Banner
                  </p>
                  <h1 className="mt-3 text-5xl font-black leading-none text-white sm:text-7xl lg:text-8xl">
                    {slide.productName}
                  </h1>
                  <p className="mt-4 inline-flex bg-white px-5 py-3 font-mono text-2xl font-black text-[#1C0800] shadow-[8px_8px_0_rgba(28,8,0,0.22)]">
                    {slide.priceLabel}
                  </p>
                  <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-white/92 sm:text-base">
                    {slide.subtitle}
                  </p>
                </div>

                <div className="relative hidden h-[230px] items-center justify-center lg:flex">
                  <div className="relative grid h-full w-full place-items-center overflow-hidden border border-white/35 bg-white/18 backdrop-blur">
                    <div className="absolute h-56 w-56 rounded-full bg-white/16" />
                    <div className="absolute bottom-5 h-20 w-72 rounded-[50%] bg-[#1C0800]/18 blur-sm" />
                    <div className="relative grid h-44 w-44 place-items-center rounded-full border-8 border-white/45 bg-white/25 shadow-[0_26px_60px_rgba(0,0,0,0.20)]">
                      <div className="h-28 w-24 rounded-b-[36px] rounded-t-[18px] border-4 border-white/75 bg-white/28" />
                    </div>
                    <span className="absolute right-5 top-5 border border-white/50 bg-[#1C0800]/35 px-3 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                      {slide.visualLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}

      <div className="absolute inset-x-0 bottom-5 z-20">
        <div className="mx-auto flex w-full max-w-[1500px] gap-2 px-4 sm:px-6 lg:px-10">
          {foodHeroSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`${slide.productName}の広告を表示`}
              aria-pressed={index === activePromoIndex}
              onClick={() => onPromoSelect(index)}
              className={[
                "promo-dot h-2.5 rounded-full transition-all duration-300",
                index === activePromoIndex
                  ? "w-10 bg-white"
                  : "w-2.5 bg-white/45 hover:bg-white/75",
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
                : "border-[#1C0800]/18 bg-white text-[#5C3010] hover:bg-[#FFF0C0]",
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
                Category
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#1C0800]">
                {category.label}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onShowAll(category.id)}
              className="shrink-0 border border-[#1C0800]/18 bg-white px-4 py-2 text-xs font-black text-[#5C3010] transition-colors hover:bg-[#FFF0C0]"
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
  const previewStyle = {
    backgroundImage: `linear-gradient(135deg, #FFE9A0 0%, #FF7A2F 48%, #E82020 100%), url("${item.imageSrc}")`,
  };

  return (
    <article
      className={[
        "relative grid min-h-[320px] snap-start grid-rows-[132px_1fr] overflow-hidden border border-[#1C0800]/14 bg-white shadow-[0_14px_36px_rgba(28,8,0,0.08)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(28,8,0,0.14)]",
        isBumping ? "is-bumping" : "",
      ].join(" ")}
    >
      {quantity > 0 ? (
        <span className="selected-badge absolute right-3 top-3 z-20 grid h-8 min-w-8 place-items-center rounded-full bg-[#1C0800] px-2 font-mono text-sm font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
          {quantity}
        </span>
      ) : null}

      <div className="relative bg-cover bg-center" style={previewStyle}>
        <div className="absolute left-3 top-3 bg-[#1C0800] px-3 py-1 text-[10px] font-black text-white">
          {item.badge}
        </div>
        <div className="absolute bottom-3 right-3 rounded-full border border-white/55 bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
          Snack
        </div>
      </div>

      <div className="flex flex-col p-4">
        <h3 className="text-lg font-black leading-tight text-[#1C0800]">
          {item.name}
        </h3>
        <p className="mt-2 min-h-10 text-xs leading-5 text-[#8C5D2A]">
          {item.description}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="font-mono text-xl font-black text-[#1C0800]">
            {formatPrice(item.price)}
          </p>
          <div className="grid grid-cols-[36px_34px_36px] items-center border border-[#1C0800]/16">
            <button
              type="button"
              aria-label={`${item.name}を減らす`}
              onClick={() => onQuantityChange(item.id, -1)}
              className="grid h-9 place-items-center bg-white text-lg font-black text-[#5C3010] transition-colors hover:bg-[#FFF0C0]"
            >
              -
            </button>
            <span className="grid h-9 place-items-center bg-[#FFF8E1] font-mono text-sm font-black text-[#1C0800]">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={`${item.name}を増やす`}
              onClick={() => onQuantityChange(item.id, 1)}
              className={[
                "grid h-9 place-items-center bg-[#E82020] text-lg font-black text-white transition-[transform,background-color] hover:bg-[#C01818]",
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
      <div className="border border-[#1C0800]/14 bg-white p-6 shadow-[0_18px_60px_rgba(28,8,0,0.08)]">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#8C5D2A]">
          Optional
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#1C0800]">
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
          className="mt-6 w-full bg-[#E82020] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#C01818]"
        >
          支払いへ進む
        </button>

        <button
          type="button"
          onClick={onSkip}
          className="mt-3 w-full border border-[#1C0800]/18 px-5 py-4 text-sm font-semibold text-[#5C3010] transition-colors hover:bg-[#FFF8E1]"
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






