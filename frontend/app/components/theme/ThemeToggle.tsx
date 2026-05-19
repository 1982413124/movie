"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === "light" ? "ダーク" : "ライト";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`${nextThemeLabel}モードに切り替え`}
      suppressHydrationWarning
      className="flex min-w-[120px] cursor-pointer flex-col items-center justify-center gap-2 px-6 py-4 text-sm font-semibold transition-colors hover:bg-[var(--nav-hover)]"
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        {theme === "light" ? "☾" : "☀"}
      </span>
      <span>{nextThemeLabel}</span>
    </button>
  );
}
