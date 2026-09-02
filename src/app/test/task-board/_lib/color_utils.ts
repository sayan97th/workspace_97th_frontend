/** Lightens a hex color toward white by `mix` (0..1). Mirrors the design's tint formula. */
export function tintOf(hex: string, mix = 0.72): string {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return "#c3cef9";
  const channel = (offset: number) => {
    const v = parseInt(h.slice(offset, offset + 2), 16);
    const out = Math.round(v + (255 - v) * mix);
    return (out < 16 ? "0" : "") + out.toString(16);
  };
  return "#" + channel(0) + channel(2) + channel(4);
}

/** Picks a readable foreground (white or near-black) against a background hex. */
export function contrastFg(hex: string): string {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return "#ffffff";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1e2237" : "#ffffff";
}

export function pillColors(color: string) {
  return { fg: color || "#9aa0b6", bd: tintOf(color || "#9aa0b6", 0.66), bg: tintOf(color || "#9aa0b6", 0.93) };
}
