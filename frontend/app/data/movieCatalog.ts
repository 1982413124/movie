export type MovieCardData = {
  id: string;
  bookingHref?: string;
  detailHref: string;
  title: string;
  genre: string;
  runtime: string;
  rating: string;
  schedule: string;
  screen: string;
  imageSrc: string;
  imageAlt: string;
  accent: string;
  ageRating: string;
  format: "字幕" | "吹替" | null;
  releaseStatus: "showing" | "upcoming" | "ended" | "unscheduled";
  timeBand: "morning" | "afternoon" | "evening" | "late" | null;
  timeBands: ("morning" | "afternoon" | "evening" | "late")[];
  foodPreorder: boolean;
  isToday: boolean;
};

export const bookingSteps = [
  {
    label: "01",
    title: "映画・上映時間を選ぶ",
  },
  {
    label: "02",
    title: "座席を選ぶ",
  },
  {
    label: "03",
    title: "フードを注文する",
  },
  {
    label: "04",
    title: "当日カウンターで受け取る",
  },
];
