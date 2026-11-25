import { describe, expect, it } from "vitest";
import {
  PALETTE,
  PALETTE_COLORS,
  PALETTE_CYCLE,
  PALETTE_SWATCHES,
  PALETTE_TINT_COLORS,
  findPaletteSwatch,
  glyphColorOn,
  hexToHsv,
  hsvToHex,
  parseHexInput,
  paletteColorAt,
  tintColor,
} from "@/lib/color-palette";

describe("color palette", () => {
  it("holds Tonk's 18 colors in picker order", () => {
    expect(PALETTE_COLORS).toEqual([
      "#e53e2e", "#800f12", "#ab350d", "#d55b08", "#e29703", "#567460",
      "#60943f", "#8fac87", "#8cd1cb", "#0499b1", "#2c6776", "#2783c5",
      "#e697b2", "#9a7ab6", "#7f2b81", "#c9b893", "#7e8889", "#2b3c40",
    ]);
  });

  it("names every swatch, and every named color is in the palette", () => {
    expect(PALETTE_SWATCHES.every((swatch) => swatch.name.length > 0)).toBe(true);
    expect(Object.values(PALETTE).sort()).toEqual([...PALETTE_COLORS].sort());
  });

  it("cycles through every palette color exactly once", () => {
    expect([...PALETTE_CYCLE].sort()).toEqual([...PALETTE_COLORS].sort());
    expect(paletteColorAt(0)).toBe(PALETTE.green);
    expect(paletteColorAt(PALETTE_CYCLE.length)).toBe(PALETTE.green);
    expect(paletteColorAt(-1)).toBe(PALETTE_CYCLE[PALETTE_CYCLE.length - 1]);
  });

  it("finds swatches case insensitively, null for custom colors", () => {
    expect(findPaletteSwatch("#E53E2E")?.name).toBe("Red");
    expect(findPaletteSwatch(PALETTE_TINT_COLORS[0])?.name).toBe("Light red");
    expect(findPaletteSwatch("#00c875")).toBeNull();
    expect(findPaletteSwatch(null)).toBeNull();
  });

  it("tints toward white", () => {
    expect(tintColor("#000000", 0.5)).toBe("#808080");
    expect(tintColor(PALETTE.red, 0)).toBe(PALETTE.red);
  });

  it("puts a dark check on light swatches and a white one on dark swatches", () => {
    expect(glyphColorOn(PALETTE.aqua)).not.toBe("#ffffff");
    expect(glyphColorOn(PALETTE.sand)).not.toBe("#ffffff");
    expect(glyphColorOn(PALETTE.charcoal)).toBe("#ffffff");
    expect(glyphColorOn(PALETTE.crimson)).toBe("#ffffff");
  });
});

describe("custom color helpers", () => {
  it("round trips hex through HSV", () => {
    for (const hex of ["#fdab3d", "#2b3c40", "#ffffff", "#000000", PALETTE.teal]) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
    expect(hexToHsv("#ff0000")).toEqual({ hue: 0, saturation: 1, value: 1 });
  });

  it("reads typed hex in its usual spellings", () => {
    expect(parseHexInput("FDAB3D")).toBe("#fdab3d");
    expect(parseHexInput(" #fa3 ")).toBe("#ffaa33");
    expect(parseHexInput("#12345")).toBeNull();
    expect(parseHexInput("orange")).toBeNull();
  });
});
