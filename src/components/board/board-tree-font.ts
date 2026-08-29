import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

/**
 * The board table's own typeface — IBM Plex Sans/Mono, matching the
 * client-approved design (`design/desing_3/Table_board_tree_subitems.dc.html`).
 * Scoped to `BoardTable`'s root wrapper via `boardTreeFontClassName` rather
 * than the app-wide layout, so the rest of the app keeps its current
 * Manrope/Roboto Mono typeface (see `src/app/layout.tsx`).
 */
const ibm_plex_sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-boardtree-sans-family",
  display: "swap",
});

const ibm_plex_mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-boardtree-mono-family",
  display: "swap",
});

export const boardTreeFontClassName = `${ibm_plex_sans.variable} ${ibm_plex_mono.variable} font-boardtree-sans`;
