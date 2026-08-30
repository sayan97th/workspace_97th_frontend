import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

const ibm_plex_sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-table-board-sans",
});

const ibm_plex_mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-table-board-mono",
});

export const metadata: Metadata = {
  title: "Table Board Preview | Workspace 97th",
  description: "Standalone preview of the Table board tree/subitems design, isolated from the main application shell.",
};

export default function TableBoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${ibm_plex_sans.variable} ${ibm_plex_mono.variable} font-[family-name:var(--font-table-board-sans)]`}>
      {children}
    </div>
  );
}
