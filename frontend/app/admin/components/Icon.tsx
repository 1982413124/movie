import type { CSSProperties } from "react";

export type IconName = "film" | "grid" | "calendar" | "ticket" | "screen" | "arrow" | "plus" | "search" | "edit" | "trash" | "close" | "upload" | "check" | "logout" | "menu" | "external" | "image" | "clock" | "alert";
const paths: Record<IconName, string> = {
  film: "M4 3h16v18H4z M8 3v18 M16 3v18 M4 8h4 M4 16h4 M16 8h4 M16 16h4 M8 12h8",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  calendar: "M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4 M8 14h2 M14 14h2 M8 17h2",
  ticket: "M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4z M15 5v3 M15 11v2 M15 16v3",
  screen: "M3 4h18v13H3z M8 21h8 M12 17v4",
  arrow: "M5 12h14 M13 6l6 6-6 6", plus: "M12 5v14 M5 12h14",
  search: "M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15 M16 16l5 5",
  edit: "M14 5l5 5 M4 20l5-1L21 7l-5-5L4 14z", trash: "M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7",
  close: "M6 6l12 12 M6 18L18 6", upload: "M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6",
  check: "M4 12l5 5L20 6", logout: "M10 4H4v16h6 M10 12h11 M17 8l4 4-4 4",
  menu: "M4 6h16 M4 12h16 M4 18h16", external: "M14 3h7v7 M21 3L10 14 M10 5H4v16h16v-6",
  image: "M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M16 7h.01", clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2",
  alert: "M12 3L2 21h20z M12 9v5 M12 17h.01",
};

export default function Icon({ name, size = 18, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
