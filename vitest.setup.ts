import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom has no layout engine, so the observers the board menus and tables rely on are stubbed as no-ops.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver;
Element.prototype.scrollIntoView ??= () => {};

// `next/font/google` only works inside the Next.js compiler, so each font the app loads becomes a
// stub that returns empty class names. Add a font here when a component starts importing a new one.
const fontStub = () => ({ className: "", variable: "", style: { fontFamily: "" } });

vi.mock("next/font/google", () => ({
  IBM_Plex_Mono: fontStub,
  IBM_Plex_Sans: fontStub,
}));

// Node 25 ships its own `localStorage` global that shadows jsdom's and has no methods without a
// backing file, so both storages are replaced by plain in-memory ones (emptied after every test).
const createMemoryStorage = (): Storage => {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => Array.from(entries.keys())[index] ?? null,
    removeItem: (key) => void entries.delete(key),
    setItem: (key, value) => void entries.set(key, String(value)),
  };
};

// Stubbed before every test (not once) so a test calling `vi.unstubAllGlobals()` cannot leave the next one without storage.
beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage());
  vi.stubGlobal("sessionStorage", createMemoryStorage());
});

// jsdom has no `matchMedia`, the theme provider reads the system color scheme through it.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;
