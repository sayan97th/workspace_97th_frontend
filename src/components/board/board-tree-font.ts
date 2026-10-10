import { Figtree, IBM_Plex_Mono } from "next/font/google";

/**
 * The board table's own typeface. Figtree carries every cell, header and
 * group title, the same face monday.com uses for its tables, and IBM Plex
 * Mono stays for the few code like readouts. Scoped to `BoardTable`'s root
 * wrapper via `boardTreeFontClassName` rather than the app-wide layout.
 */
const figtree_sans = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-boardtree-sans-family",
  display: "swap",
});

const ibm_plex_mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-boardtree-mono-family",
  display: "swap",
});

export const boardTreeFontClassName = `${figtree_sans.variable} ${ibm_plex_mono.variable} font-boardtree-sans`;
