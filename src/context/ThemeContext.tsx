"use client";

import type React from "react";
import { createContext, useState, useContext, useEffect, useCallback, useMemo } from "react";

/** Persisted user choice — "system" tracks the OS-level `prefers-color-scheme`. */
export type ThemeMode = "light" | "dark" | "system";
/** The theme actually painted on screen once "system" has been resolved. */
export type ResolvedTheme = "light" | "dark";

type ThemeContextType = {
  theme_mode: ThemeMode;
  resolved_theme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  /** Flips between light and dark, dropping out of "system" mode. */
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "theme_mode";
const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemTheme = (): ResolvedTheme =>
  typeof window !== "undefined" && window.matchMedia(SYSTEM_DARK_QUERY).matches
    ? "dark"
    : "light";

const resolveTheme = (mode: ThemeMode): ResolvedTheme =>
  mode === "system" ? getSystemTheme() : mode;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Light is the default look for new visitors until they opt into
  // Dark or System themselves.
  const [theme_mode, setThemeModeState] = useState<ThemeMode>("light");
  const [resolved_theme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [is_initialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const saved_mode = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    const initial_mode: ThemeMode =
      saved_mode === "light" || saved_mode === "dark" || saved_mode === "system"
        ? saved_mode
        : "light";

    setThemeModeState(initial_mode);
    setResolvedTheme(resolveTheme(initial_mode));
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!is_initialized) return;

    localStorage.setItem(THEME_STORAGE_KEY, theme_mode);
    const next_resolved = resolveTheme(theme_mode);
    setResolvedTheme(next_resolved);
    document.documentElement.classList.toggle("dark", next_resolved === "dark");
  }, [theme_mode, is_initialized]);

  // Live-update while in "system" mode so switching the OS theme takes effect
  // without requiring a reload.
  useEffect(() => {
    if (!is_initialized || theme_mode !== "system") return;

    const media_query = window.matchMedia(SYSTEM_DARK_QUERY);
    const handleChange = () => {
      const next_resolved = getSystemTheme();
      setResolvedTheme(next_resolved);
      document.documentElement.classList.toggle("dark", next_resolved === "dark");
    };

    media_query.addEventListener("change", handleChange);
    return () => media_query.removeEventListener("change", handleChange);
  }, [theme_mode, is_initialized]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((previous_mode) => {
      const previous_resolved = resolveTheme(previous_mode);
      return previous_resolved === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo(
    () => ({ theme_mode, resolved_theme, setThemeMode, toggleTheme }),
    [theme_mode, resolved_theme, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
