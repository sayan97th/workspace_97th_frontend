import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

// Self-contained typography for the /test/task-board sandbox — deliberately
// separate from the production board's font loader so this view has zero
// dependency on the rest of the site.
const ibm_plex_sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--task-board-font-sans",
});

const ibm_plex_mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--task-board-font-mono",
});

export const taskBoardFontClassName = `${ibm_plex_sans.variable} ${ibm_plex_mono.variable}`;
