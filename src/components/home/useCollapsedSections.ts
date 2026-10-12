import { useEffect, useState } from "react";

const STORAGE_KEY = "home_collapsed_sections";

const readCollapsed = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
};

/**
 * Which Home sections the user folded, remembered per browser like monday's
 * own Home. Read after mount so server and client markup match.
 */
export const useCollapsedSections = () => {
  const [collapsed_keys, setCollapsedKeys] = useState<string[]>([]);

  useEffect(() => {
    setCollapsedKeys(readCollapsed());
  }, []);

  const isCollapsed = (key: string): boolean => collapsed_keys.includes(key);

  const toggleSection = (key: string) => {
    setCollapsedKeys((current) => {
      const next_keys = current.includes(key) ? current.filter((candidate) => candidate !== key) : [...current, key];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next_keys));
      } catch {
        // Storage can be blocked (private mode), the fold still works for this visit.
      }
      return next_keys;
    });
  };

  const expandSection = (key: string) => {
    if (isCollapsed(key)) toggleSection(key);
  };

  return { isCollapsed, toggleSection, expandSection };
};
