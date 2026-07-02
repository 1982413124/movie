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
    visual: {
      label: "Set",
      surface: "#F2EFE8",
      accent: "#3E332A",
    },
  },
  {
    id: "popcorn-salt",
    name: "塩ポップコーン",
    price: 520,
    categoryIds: ["recommended", "popcorn"],
    description: "映画館らしい軽い塩味",
    badge: "定番",
    imageSrc: "/images/food/popcorn-salt.jpg",
    visual: {
      label: "Popcorn",
      surface: "#F6F1E8",
      accent: "#5A4B3D",
    },
  },
  {
    id: "drink-cola",
    name: "コーラ",
    price: 380,
    categoryIds: ["recommended", "drinks"],
    description: "氷入りのすっきり炭酸",
    badge: "冷たい",
    imageSrc: "/images/food/drink-cola.jpg",
    visual: {
      label: "Drink",
      surface: "#E9EEF0",
      accent: "#233947",
    },
  },
  {
    id: "churros",
    name: "チュロス",
    price: 420,
    categoryIds: ["recommended", "hot-snacks", "sweets"],
    description: "シナモン香るサクサク食感",
    badge: "甘い",
    imageSrc: "/images/food/churros.jpg",
    visual: {
      label: "Sweets",
      surface: "#F1E9E1",
      accent: "#563C32",
    },
  },
  {
    id: "popcorn-caramel",
    name: "キャラメルポップコーン",
    price: 580,
    categoryIds: ["popcorn"],
    description: "香ばしいキャラメルコート",
    badge: "甘口",
    imageSrc: "/images/food/popcorn-caramel.jpg",
    visual: {
      label: "Caramel",
      surface: "#EFE8DC",
      accent: "#604B32",
    },
  },
  {
    id: "popcorn-butter-soy",
    name: "バター醤油ポップコーン",
    price: 600,
    categoryIds: ["popcorn"],
    description: "濃いめの香りで満足感あり",
    badge: "限定",
    imageSrc: "/images/food/popcorn-butter-soy.jpg",
    visual: {
      label: "Butter Soy",
      surface: "#ECE8DD",
      accent: "#514733",
    },
  },
  {
    id: "drink-melon-soda",
    name: "メロンソーダ",
    price: 390,
    categoryIds: ["drinks"],
    description: "鮮やかなグリーンの炭酸",
    badge: "爽快",
    imageSrc: "/images/food/drink-melon-soda.jpg",
    visual: {
      label: "Soda",
      surface: "#E7EFE8",
      accent: "#1F4C3E",
    },
  },
  {
    id: "drink-iced-tea",
    name: "アイスティー",
    price: 360,
    categoryIds: ["drinks"],
    description: "すっきり飲める無糖ティー",
    badge: "無糖",
    imageSrc: "/images/food/drink-iced-tea.jpg",
    visual: {
      label: "Tea",
      surface: "#E8ECE7",
      accent: "#2F4635",
    },
  },
  {
    id: "hot-dog",
    name: "ホットドッグ",
    price: 620,
    categoryIds: ["hot-snacks"],
    description: "片手で食べやすい軽食",
    badge: "軽食",
    imageSrc: "/images/food/hot-dog.jpg",
    visual: {
      label: "Hot Snack",
      surface: "#EEE9E0",
      accent: "#4E3D35",
    },
  },
  {
    id: "fries",
    name: "ポテト",
    price: 460,
    categoryIds: ["hot-snacks"],
    description: "シェアしやすい細切りポテト",
    badge: "シェア",
    imageSrc: "/images/food/fries.jpg",
    visual: {
      label: "Fries",
      surface: "#EFECE3",
      accent: "#464032",
    },
  },
  {
    id: "ice-cream",
    name: "アイスクリーム",
    price: 420,
    categoryIds: ["sweets"],
    description: "上映前に楽しむカップアイス",
    badge: "ひんやり",
    imageSrc: "/images/food/ice-cream.jpg",
    visual: {
      label: "Ice Cream",
      surface: "#ECEAF1",
      accent: "#3F3B57",
    },
  },
  {
    id: "chocolate",
    name: "チョコレート",
    price: 360,
    categoryIds: ["sweets"],
    description: "バッグに入れやすいミニサイズ",
    badge: "ミニ",
    imageSrc: "/images/food/chocolate.jpg",
    visual: {
      label: "Chocolate",
      surface: "#EAE4DE",
      accent: "#3C2D2A",
    },
  },
];

const popcornAdvertisementImageSrc = "/images/advertisement/Popcorn-b3ad4ecb.png";

export const foodHeroSlides = [
  {
    id: "popcorn-party",
    title: "上映前の定番",
    promoLabel: "Food Pre-Order",
    productName: "シネマセットA",
    priceLabel: "980円",
    offer: "座席予約と一緒に",
    visualLabel: "01",
    subtitle: "受け取りは劇場カウンターで。",
    imageSrc: popcornAdvertisementImageSrc,
  },
  {
    id: "drink-refresh",
    title: "静かなドリンク時間",
    promoLabel: "Drink",
    productName: "メロンソーダ",
    priceLabel: "390円",
    offer: "上映前に受け取り",
    visualLabel: "02",
    subtitle: "氷入りドリンクも事前に選べます。",
    imageSrc: popcornAdvertisementImageSrc,
  },
  {
    id: "snack-night",
    title: "長編にも合う軽食",
    promoLabel: "Snack",
    productName: "ホットドッグセット",
    priceLabel: "620円",
    offer: "軽く食べたい時に",
    visualLabel: "03",
    subtitle: "席に入る前に、手早く受け取れます。",
    imageSrc: popcornAdvertisementImageSrc,
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


