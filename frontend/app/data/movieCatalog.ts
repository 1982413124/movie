export type MovieCardData = {
  id: string;
  title: string;
  genre: string;
  runtime: string;
  rating: string;
  schedule: string;
  screen: string;
  imageSrc: string;
  imageAlt: string;
  accent: string;
};

export const heroImage = {
  imageSrc: "/images/man.jpg",
  imageAlt: "HAL CINEMA hero movie poster",
};

export const bookingSteps = [
  {
    label: "01",
    title: "映画 & フードを選ぶ",
  },
  {
    label: "02",
    title: "座席を選択",
  },
  {
    label: "03",
    title: "予約 & 注文完了",
  },
];

export const featuredMovies: MovieCardData[] = [
  {
    id: "spider-man",
    title: "SPIDER MAN",
    genre: "Action",
    runtime: "120min",
    rating: "9.5",
    schedule: "21:10",
    screen: "Screen 01",
    imageSrc: "/images/man.jpg",
    imageAlt: "Spider Man poster",
    accent: "#d92323",
  },
  {
    id: "godzilla",
    title: "GODZILLA",
    genre: "Monster",
    runtime: "115min",
    rating: "7.2",
    schedule: "18:30",
    screen: "Screen 02",
    imageSrc: "/images/gozira.jpg",
    imageAlt: "Godzilla poster",
    accent: "#1f2937",
  },
  {
    id: "harry-potter",
    title: "HARRY POTTER",
    genre: "Fantasy",
    runtime: "135min",
    rating: "9.5",
    schedule: "20:00",
    screen: "Screen 03",
    imageSrc: "/images/harry.png",
    imageAlt: "Harry Potter poster",
    accent: "#6d5dfc",
  },
];

export const nowShowing: MovieCardData[] = [
  {
    id: "spider-man-now",
    title: "SPIDER MAN",
    genre: "Action",
    runtime: "120min",
    rating: "9.5",
    schedule: "21:10",
    screen: "Screen 01",
    imageSrc: "/images/man.jpg",
    imageAlt: "Spider Man poster",
    accent: "#d92323",
  },
  {
    id: "godzilla-now",
    title: "GODZILLA",
    genre: "Monster",
    runtime: "115min",
    rating: "7.2",
    schedule: "18:30",
    screen: "Screen 02",
    imageSrc: "/images/gozira.jpg",
    imageAlt: "Godzilla poster",
    accent: "#1f2937",
  },
  {
    id: "harry-potter-now",
    title: "HARRY POTTER",
    genre: "Fantasy",
    runtime: "135min",
    rating: "9.5",
    schedule: "20:00",
    screen: "Screen 03",
    imageSrc: "/images/harry.png",
    imageAlt: "Harry Potter poster",
    accent: "#6d5dfc",
  },
  {
    id: "cinema-night",
    title: "CINEMA NIGHT",
    genre: "Drama",
    runtime: "105min",
    rating: "8.1",
    schedule: "22:15",
    screen: "Screen 04",
    imageSrc: "/images/man.jpg",
    imageAlt: "Cinema Night poster",
    accent: "#f59e0b",
  },
];