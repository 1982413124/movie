export const foodCategories = [
  { id: "recommended", label: "おすすめ" },
  { id: "popcorn", label: "ポップコーン" },
  { id: "drinks", label: "ドリンク" },
  { id: "hot-snacks", label: "ホットスナック" },
  { id: "sweets", label: "スイーツ" },
];

export const foodItems = [
  {
    id: "set-a",
    name: "シネマセットA",
    price: 980,
    categoryIds: ["recommended"],
    description: "ポップコーンとドリンクの定番セット",
    badge: "人気",
    imageSrc: "/images/food/set-a.jpg",
  },
  {
    id: "popcorn-salt",
    name: "塩ポップコーン",
    price: 520,
    categoryIds: ["recommended", "popcorn"],
    description: "映画館らしい軽い塩味",
    badge: "定番",
    imageSrc: "/images/food/popcorn-salt.jpg",
  },
  {
    id: "drink-cola",
    name: "コーラ",
    price: 380,
    categoryIds: ["recommended", "drinks"],
    description: "氷入りのすっきり炭酸",
    badge: "冷たい",
    imageSrc: "/images/food/drink-cola.jpg",
  },
  {
    id: "churros",
    name: "チュロス",
    price: 420,
    categoryIds: ["recommended", "hot-snacks", "sweets"],
    description: "シナモン香るサクサク食感",
    badge: "甘い",
    imageSrc: "/images/food/churros.jpg",
  },
  {
    id: "popcorn-caramel",
    name: "キャラメルポップコーン",
    price: 580,
    categoryIds: ["popcorn"],
    description: "香ばしいキャラメルコート",
    badge: "甘口",
    imageSrc: "/images/food/popcorn-caramel.jpg",
  },
  {
    id: "popcorn-butter-soy",
    name: "バター醤油ポップコーン",
    price: 600,
    categoryIds: ["popcorn"],
    description: "濃いめの香りで満足感あり",
    badge: "限定",
    imageSrc: "/images/food/popcorn-butter-soy.jpg",
  },
  {
    id: "drink-melon-soda",
    name: "メロンソーダ",
    price: 390,
    categoryIds: ["drinks"],
    description: "鮮やかなグリーンの炭酸",
    badge: "爽快",
    imageSrc: "/images/food/drink-melon-soda.jpg",
  },
  {
    id: "drink-iced-tea",
    name: "アイスティー",
    price: 360,
    categoryIds: ["drinks"],
    description: "すっきり飲める無糖ティー",
    badge: "無糖",
    imageSrc: "/images/food/drink-iced-tea.jpg",
  },
  {
    id: "hot-dog",
    name: "ホットドッグ",
    price: 620,
    categoryIds: ["hot-snacks"],
    description: "片手で食べやすい軽食",
    badge: "軽食",
    imageSrc: "/images/food/hot-dog.jpg",
  },
  {
    id: "fries",
    name: "ポテト",
    price: 460,
    categoryIds: ["hot-snacks"],
    description: "シェアしやすい細切りポテト",
    badge: "シェア",
    imageSrc: "/images/food/fries.jpg",
  },
  {
    id: "ice-cream",
    name: "アイスクリーム",
    price: 420,
    categoryIds: ["sweets"],
    description: "上映前に楽しむカップアイス",
    badge: "ひんやり",
    imageSrc: "/images/food/ice-cream.jpg",
  },
  {
    id: "chocolate",
    name: "チョコレート",
    price: 360,
    categoryIds: ["sweets"],
    description: "バッグに入れやすいミニサイズ",
    badge: "ミニ",
    imageSrc: "/images/food/chocolate.jpg",
  },
];

export const foodHeroSlides = [
  {
    id: "popcorn-party",
    title: "上映前のワクワクを追加",
    promoLabel: "人気No.1",
    productName: "シネマセットA",
    priceLabel: "セットで980円",
    offer: "期間限定 ドリンクM付き",
    visualLabel: "Popcorn + Drink",
    subtitle: "ポップコーンとドリンクを先に選んで、当日は受け取りだけ。",
    imageSrc: "/images/advertisement/Popcorn.png",
    colors: ["#FFCF33", "#FF7A2F 52%", "#F43F5E"],
  },
  {
    id: "drink-refresh",
    title: "ドリンクもまとめて予約",
    promoLabel: "本日おすすめ",
    productName: "メロンソーダ",
    priceLabel: "単品390円",
    offer: "映画前のリフレッシュに",
    visualLabel: "Cold Soda",
    subtitle: "炭酸、ティー、甘いスイーツまで気分で選べます。",
    imageSrc: "/images/advertisement/Popcorn.png",
    colors: ["#54D6C7", "#3B82F6 52%", "#7C3AED"],
  },
  {
    id: "snack-night",
    title: "小腹にちょうどいい軽食",
    promoLabel: "期間限定",
    productName: "ホットドッグセット",
    priceLabel: "軽食620円から",
    offer: "長めの作品にもぴったり",
    visualLabel: "Hot Snack",
    subtitle: "ホットスナックを追加して、長めの作品も快適に。",
    imageSrc: "/images/advertisement/Popcorn.png",
    colors: ["#FB923C", "#EF4444 52%", "#7F1D1D"],
  },
];

export function getFoodItemsByCategory(categoryId) {
  return foodItems.filter((item) => item.categoryIds.includes(categoryId));
}

export function updateFoodQuantity(selection, foodId, delta) {
  const currentQuantity = selection[foodId] ?? 0;
  const nextQuantity = Math.max(0, currentQuantity + delta);
  const nextSelection = { ...selection };

  if (nextQuantity === 0) {
    delete nextSelection[foodId];
  } else {
    nextSelection[foodId] = nextQuantity;
  }

  return nextSelection;
}

export function buildFoodOrder(selection) {
  const items = foodItems
    .map((item) => {
      const quantity = selection[item.id] ?? 0;

      if (quantity <= 0) {
        return null;
      }

      return {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity,
        lineTotal: item.price * quantity,
      };
    })
    .filter(Boolean);

  return {
    items,
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    totalPrice: items.reduce((total, item) => total + item.lineTotal, 0),
  };
}

export function applyFoodSelectionToDraft(draft, selection) {
  const order = buildFoodOrder(selection);
  const ticketTotalPrice = draft?.ticketTotalPrice ?? draft?.totalPrice ?? 0;

  return {
    ...draft,
    ticketTotalPrice,
    foodItems: order.items,
    foodTotalPrice: order.totalPrice,
    totalPrice: ticketTotalPrice + order.totalPrice,
  };
}


