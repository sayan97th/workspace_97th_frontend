import { afterEach, describe, expect, it } from "vitest";
import {
  BRAND_PALETTE_STORAGE_KEY,
  DEFAULT_BRAND_COLOR,
  applyBrandColor,
  buildBrandPalette,
  contrastWithWhite,
  isHexColor,
} from "@/lib/brand-theme";

describe("brand theme", () => {
  afterEach(() => {
    applyBrandColor(null);
  });

  it("builds every brand step with the picked color as 500", () => {
    const palette = buildBrandPalette("#0073ea");
    expect(Object.keys(palette)).toHaveLength(12);
    expect(palette["--color-brand-500"]).toBe("#0073ea");
    expect(palette["--color-brand-25"]).not.toBe(palette["--color-brand-950"]);
  });

  it("validates hex colors", () => {
    expect(isHexColor("#E53E2E")).toBe(true);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("#fff")).toBe(false);
  });

  it("flags light colors as unreadable under white text", () => {
    expect(contrastWithWhite("#ffcb00")).toBeLessThan(3);
    expect(contrastWithWhite("#1f3a8a")).toBeGreaterThan(4.5);
  });

  it("applies the scale on html, remembers it and clears it again", () => {
    applyBrandColor("#00854d");
    expect(document.documentElement.style.getPropertyValue("--color-brand-500")).toBe("#00854d");
    expect(localStorage.getItem(BRAND_PALETTE_STORAGE_KEY)).toContain("#00854d");

    applyBrandColor(DEFAULT_BRAND_COLOR);
    expect(document.documentElement.style.getPropertyValue("--color-brand-500")).toBe("");
    expect(localStorage.getItem(BRAND_PALETTE_STORAGE_KEY)).toBeNull();
  });
});
