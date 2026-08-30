import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

/**
 * The Table Board's own typeface (IBM Plex Sans/Mono), matching the
 * `design/desing_3/Table_board_tree_subitems.dc.html` mockup. Shared between
 * the standalone `/test/table-board` preview and the real board's own
 * "table" view so both stay visually identical — scoped via this className
 * to whichever root wraps the table, not the app-wide layout, so the rest of
 * the app keeps its own Manrope/Roboto Mono typeface.
 */
const ibm_plex_sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-table-board-sans",
  display: "swap",
});

const ibm_plex_mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-table-board-mono",
  display: "swap",
});

export const tableBoardFontClassName = `${ibm_plex_sans.variable} ${ibm_plex_mono.variable} font-[family-name:var(--font-table-board-sans)]`;
