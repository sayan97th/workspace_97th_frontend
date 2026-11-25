import { describe, expect, it } from "vitest";
import {
  PALETTE,
  PALETTE_COLORS,
  PALETTE_CYCLE,
  PALETTE_SWATCHES,
  SOFT_COLORS,
  WORKSPACE_SWATCHES,
  findPaletteSwatch,
  glyphColorOn,
  hexToHsv,
  hsvToHex,
  parseHexInput,
  paletteColorAt,
} from "@/lib/color-palette";

describe("color palette", () => {
  it("holds the original 18 status colors in picker order", () => {
    expect(PALETTE_COLORS).toEqual([
      "#2074d4", "#1071c4", "#3a8fc9", "#7b3f98", "#7b52c9", "#12c46b",
      "#12724a", "#2f9e78", "#f2a53c", "#f2662a", "#e04455", "#f453b0",
      "#8a6248", "#3a3a3a", "#9dd6f2", "#6b7189", "#e2b203", "#c9ccd4",
    ]);
  });

  it("names every swatch, and every named color is in the palette", () => {
    expect(PALETTE_SWATCHES.every((swatch) => swatch.name.length > 0)).toBe(true);
    expect(Object.values(PALETTE).sort()).toEqual([...PALETTE_COLORS].sort());
  });

  it("never names two swatches with the same hex", () => {
    const all_hexes = [...PALETTE_COLORS, ...SOFT_COLORS, ...WORKSPACE_SWATCHES.map((swatch) => swatch.hex)];
    expect(new Set(all_hexes).size).toBe(all_hexes.length);
  });

  it("cycles through every palette color exactly once", () => {
    expect([...PALETTE_CYCLE].sort()).toEqual([...PALETTE_COLORS].sort());
    expect(paletteColorAt(0)).toBe(PALETTE.green);
    expect(paletteColorAt(PALETTE_CYCLE.length)).toBe(PALETTE.green);
    expect(paletteColorAt(-1)).toBe(PALETTE_CYCLE[PALETTE_CYCLE.length - 1]);
  });

  it("finds swatches case insensitively, null for custom colors", () => {
    expect(findPaletteSwatch("#E04455")?.name).toBe("Red");
    expect(findPaletteSwatch(SOFT_COLORS[0])?.name).toBe("Sea green");
    expect(findPaletteSwatch("#e53e2e")?.name).toBe("97th red");
    expect(findPaletteSwatch("#00c875")).toBeNull();
    expect(findPaletteSwatch(null)).toBeNull();
  });

  it("puts a dark check on light swatches and a white one on dark swatches", () => {
    expect(glyphColorOn(PALETTE.light_blue)).not.toBe("#ffffff");
    expect(glyphColorOn(PALETTE.silver)).not.toBe("#ffffff");
    expect(glyphColorOn(PALETTE.charcoal)).toBe("#ffffff");
    expect(glyphColorOn(PALETTE.plum)).toBe("#ffffff");
  });
});

describe("custom color helpers", () => {
  it("round trips hex through HSV", () => {
    for (const hex of ["#fdab3d", "#2b3c40", "#ffffff", "#000000", PALETTE.sky]) {
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
