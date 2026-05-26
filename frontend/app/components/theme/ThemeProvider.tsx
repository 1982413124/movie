"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const storageKey = "hal-cinema-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);
const listeners = new Set<() => void>();

let currentTheme: Theme = "light";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const toggleTheme = useCallback(() => {
    setStoredTheme(theme === "light" ? "dark" : "light");
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
    }),
    [theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

function subscribeToTheme(listener: () => void) {
  listeners.add(listener);
  syncThemeFromStorage();

  return () => {
    listeners.delete(listener);
  };
}

function getThemeSnapshot() {
  return currentTheme;
}

function getServerThemeSnapshot() {
  return "light" as Theme;
}

function syncThemeFromStorage() {
  if (typeof window === "undefined") {
    return;
  }

  const storedTheme = window.localStorage.getItem(storageKey);
  const nextTheme =
    storedTheme === "dark" || storedTheme === "light" ? storedTheme : "light";

  applyTheme(nextTheme, false);
}

function setStoredTheme(theme: Theme) {
  applyTheme(theme, true);
}

function applyTheme(theme: Theme, shouldStore: boolean) {
  const didChange = currentTheme !== theme;
  currentTheme = theme;

  if (typeof window !== "undefined") {
    document.documentElement.dataset.theme = theme;

    if (shouldStore) {
      window.localStorage.setItem(storageKey, theme);
    }
  }

  if (didChange) {
    listeners.forEach((listener) => listener());
  }
}
