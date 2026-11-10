"use client";

import { useState, type ReactElement, type SVGProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CampaignHeader from "../components/CampaignHeader";

type FoodItem = {
  id: string;
  category: string;
  name: string;
  nameEn: string;
  price: number;
  description: string;
  badge?: string;
};

const foodItems: FoodItem[] = [
  {
    id: "popcorn-salt",
    category: "POPCORN",
    name: "塩バターポップコーン",
    nameEn: "SALT BUTTER",
    price: 600,
    description: "定番の塩バター風味。Mサイズ",
    badge: "人気No.1",
  },
  {
    id: "popcorn-caramel",
    category: "POPCORN",
    name: "キャラメルポップコーン",
    nameEn: "CARAMEL",
    price: 650,
    description: "甘くてサクサクのキャラメル味。Mサイズ",
  },
  {
    id: "popcorn-cheese",
    category: "POPCORN",
    name: "チェダーチーズポップコーン",
    nameEn: "CHEDDAR CHEESE",
    price: 700,
    description: "濃厚なチェダーチーズ風味。Mサイズ",
    badge: "NEW",
  },
  {
    id: "drink-cola",
    category: "DRINK",
    name: "コーラ",
    nameEn: "COLA",
    price: 400,
    description: "冷たく爽やかなコーラ。Mサイズ",
    badge: "人気No.1",
  },
  {
    id: "drink-ginger-ale",
    category: "DRINK",
    name: "ジンジャーエール",
    nameEn: "GINGER ALE",
    price: 400,
    description: "すっきりとしたジンジャーエール。Mサイズ",
  },
  {
    id: "drink-orange-juice",
    category: "DRINK",
    name: "オレンジジュース",
    nameEn: "ORANGE JUICE",
    price: 420,
    description: "フレッシュな柑橘の風味。Mサイズ",
  },
  {
    id: "snack-nachos",
    category: "SNACK",
    name: "ナチョス & チーズソース",
    nameEn: "NACHOS",
    price: 800,
    description: "サクサクのチップスとチーズディップ",
    badge: "おすすめ",
  },
  {
    id: "snack-hotdog",
    category: "SNACK",
    name: "ホットドッグ",
    nameEn: "HOT DOG",
    price: 750,
    description: "ジューシーなソーセージをパンに挟みました",
  },
  {
    id: "combo-a",
    category: "COMBO",
    name: "シネマコンボ A",
    nameEn: "CINEMA COMBO A",
    price: 1200,
    description: "Mポップコーン（塩バター）＋ドリンク（M）のお得なセット",
    badge: "セット割",
  },
  {
    id: "combo-b",
    category: "COMBO",
    name: "シネマコンボ B",
    nameEn: "CINEMA COMBO B",
    price: 1400,
    description: "Mポップコーン（キャラメル）＋ナチョス＋ドリンク（M）",
    badge: "セット割",
  },
];

const categories = ["ALL", "POPCORN", "DRINK", "SNACK", "COMBO"] as const;
type Category = (typeof categories)[number];

function IconAll(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </svg>
  );
}

function IconPopcorn(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 9h10l-1.3 11.3a1 1 0 0 1-1 .9H9.3a1 1 0 0 1-1-.9L7 9Z" />
      <path d="M9.5 9 8.7 21.2M14.5 9l.8 12.2" />
      <path d="M6.7 9c.4-1.7 2-2.9 3.8-2.6.4-1.5 2.1-2.3 3.4-1.4 1.6-.4 3 .8 3 2.4 0 .6-.1 1.1-.4 1.6" />
    </svg>
  );
}

function IconDrink(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7.2 9h9.6l-1 10.4a1 1 0 0 1-1 .9H9.2a1 1 0 0 1-1-.9L7.2 9Z" />
      <path d="M6.4 9h11.2l.3-1.8H6.1l.3 1.8Z" />
      <path d="M13.5 3.5 12.3 7.2" />
    </svg>
  );
}

function IconSnack(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 19 12 5l7 14Z" />
      <path d="M10.3 15.2h.01M13.6 16.6h.01M12 12.4h.01" />
    </svg>
  );
}

function IconCombo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="8.5" width="16" height="10.5" rx="1.4" />
      <path d="M4 13h16M12 8.5v10.5" />
      <path d="M9.2 8.5C8 8.5 7 7.6 7 6.5S8 4.5 9.2 4.5c1.6 0 3.3 1.8 3.3 4M14.8 8.5c1.2 0 2.2-.9 2.2-2s-1-2-2.2-2c-1.6 0-3.3 1.8-3.3 4" />
    </svg>
  );
}

const categoryIcons: Record<Category, (props: SVGProps<SVGSVGElement>) => ReactElement> = {
  ALL: IconAll,
  POPCORN: IconPopcorn,
  DRINK: IconDrink,
  SNACK: IconSnack,
  COMBO: IconCombo,
};

export default function FoodPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<Category>("ALL");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const filteredItems =
    selectedCategory === "ALL"
      ? foodItems
      : foodItems.filter((item) => item.category === selectedCategory);

  const handleProceed = () => {
    const selectedItems = foodItems
      .filter((item) => (quantities[item.id] ?? 0) > 0)
      .map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: quantities[item.id],
      }));
    const foodOrder = { items: selectedItems, totalPrice };
    window.sessionStorage.setItem("foodOrder", JSON.stringify(foodOrder));
    router.push("/seats");
  };

  const updateQuantity = (id: string, delta: number) => {
    setQuantities((prev) => {
      const next = (prev[id] ?? 0) + delta;
      if (next <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalPrice = foodItems.reduce(
    (sum, item) => sum + (quantities[item.id] ?? 0) * item.price,
    0,
  );

  return (
    <div className="min-h-screen bg-[#FFF8E1] text-[#1C0800]">
      <CampaignHeader />

      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
        {/* ページヘッダー */}
        <div className="mb-8 border-b border-[#1C0800]/14 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.38em] text-[#8C5D2A]">
            Movie Reservation
          </p>
          <h1 className="mt-3 flex items-center gap-3 text-5xl font-black uppercase leading-none sm:text-7xl">
            <IconPopcorn className="h-9 w-9 shrink-0 sm:h-12 sm:w-12" aria-hidden="true" />
            FOOD &amp; DRINK
          </h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* 左カラム：商品一覧 */}
          <div>
            {/* カテゴリフィルター */}
            <div className="mb-8 flex flex-wrap gap-2">
              {categories.map((cat) => {
                const Icon = categoryIcons[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex min-h-10 items-center gap-1.5 rounded-full border px-5 text-xs font-black uppercase tracking-[0.18em] transition ${
                      selectedCategory === cat
                        ? "border-[#E82020] bg-[#E82020] text-white"
                        : "border-[#1C0800]/20 bg-white text-[#1C0800] hover:border-[#1C0800]"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* 商品グリッド */}
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredItems.map((item) => (
                <FoodCard
                  key={item.id}
                  item={item}
                  quantity={quantities[item.id] ?? 0}
                  onAdd={() => updateQuantity(item.id, 1)}
                  onRemove={() => updateQuantity(item.id, -1)}
                />
              ))}
            </div>
          </div>

          {/* 右カラム：注文サマリー */}
          <div className="lg:sticky lg:top-[96px] lg:self-start">
            <div className="rounded-3xl border border-[#1C0800]/14 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)]">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[#8C5D2A]">
                Order
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase">
                YOUR SELECTION
              </h2>

              <div className="mt-6 border-t border-[#1C0800]/14">
                {totalItems === 0 ? (
                  <p className="py-6 text-center text-sm font-bold text-[#A0703A]">
                    商品を選択してください
                  </p>
                ) : (
                  <ul className="divide-y divide-[#1C0800]/10">
                    {foodItems
                      .filter((item) => (quantities[item.id] ?? 0) > 0)
                      .map((item) => {
                        const Icon = categoryIcons[item.category as Category];
                        return (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-3 py-4"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <Icon className="h-4 w-4 shrink-0 text-[#8C5D2A]" aria-hidden="true" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold">
                                  {item.name}
                                </p>
                                <p className="text-xs text-[#8C5D2A]">
                                  ¥{item.price.toLocaleString()} × {quantities[item.id]}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 text-sm font-black">
                              ¥{(item.price * (quantities[item.id] ?? 0)).toLocaleString()}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>

              <div className="mt-4 border-t border-[#1C0800]/14 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-black uppercase tracking-[0.22em] text-[#8C5D2A]">
                    Total
                  </span>
                  <span className="text-3xl font-black">
                    ¥{totalPrice.toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-right text-xs text-[#A0703A]">
                  {totalItems} 点
                </p>
              </div>

              <button
                type="button"
                onClick={handleProceed}
                disabled={totalItems === 0}
                className={`mt-6 flex min-h-14 w-full items-center justify-center rounded-full text-sm font-black uppercase tracking-[0.2em] transition ${
                  totalItems > 0
                    ? "bg-[#1C0800] text-white hover:bg-[#2b2b2b]"
                    : "cursor-not-allowed bg-[#1C0800]/20 text-[#1C0800]/40"
                }`}
              >
                座席を選択する
              </button>

              <Link
                href="/seats"
                className="mt-3 flex min-h-12 items-center justify-center rounded-full border border-[#1C0800]/22 text-xs font-bold uppercase tracking-[0.16em] text-[#1C0800] transition hover:border-[#1C0800] hover:bg-white"
              >
                スキップして進む
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FoodCard({
  item,
  quantity,
  onAdd,
  onRemove,
}: {
  item: FoodItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const Icon = categoryIcons[item.category as Category];

  return (
    <div className="group relative rounded-2xl border border-[#1C0800]/14 bg-white p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition hover:border-[#1C0800]/30">
      {item.badge && (
        <span className="absolute right-4 top-4 rounded-full bg-[#E82020] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
          {item.badge}
        </span>
      )}

      <div className="mb-4 flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0C0] text-[#1C0800]"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#A0703A]">
            {item.category}
          </p>
          <h3 className="mt-1 text-xl font-black leading-tight">
            {item.name}
          </h3>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#8C5D2A]">
            {item.nameEn}
          </p>
        </div>
      </div>

      <p className="mb-5 text-xs leading-6 text-[#5C3010]">
        {item.description}
      </p>

      <div className="flex items-center justify-between border-t border-[#1C0800]/12 pt-4">
        <span className="text-2xl font-black">
          ¥{item.price.toLocaleString()}
        </span>

        <div className="flex items-center gap-2">
          {quantity > 0 && (
            <>
              <button
                type="button"
                onClick={onRemove}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1C0800]/20 text-lg font-black transition hover:border-[#1C0800] hover:bg-[#FFF0C0]"
                aria-label={`${item.name}を減らす`}
              >
                −
              </button>
              <span className="w-6 text-center text-lg font-black">
                {quantity}
              </span>
            </>
          )}
          <button
            type="button"
            onClick={onAdd}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C0800] text-lg font-black text-white transition hover:bg-[#E82020]"
            aria-label={`${item.name}を追加`}
          >
            ＋
          </button>
        </div>
      </div>
    </div>
  );
}
