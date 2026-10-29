import { IBM_Plex_Mono } from "next/font/google";

/**
 * The board table's own mono typeface, IBM Plex Mono, for the few code like
 * readouts. Cells, headers and group titles use the app wide brand face
 * (Manrope, see `src/styles/typography.css`), so no second sans font is
 * loaded here. Scoped to `BoardTable`'s root wrapper via
 * `boardTreeFontClassName` rather than the app wide layout.
 */
const ibm_plex_mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-boardtree-mono-family",
  display: "swap",
});

export const boardTreeFontClassName = `${ibm_plex_mono.variable} font-boardtree-sans`;
