import type { Metadata } from "next";
import { tableBoardFontClassName } from "@/components/board/table-board/table-board-font";

export const metadata: Metadata = {
  title: "Table Board Preview | Workspace 97th",
  description: "Standalone preview of the Table board tree/subitems design, isolated from the main application shell.",
};

export default function TableBoardLayout({ children }: { children: React.ReactNode }) {
  return <div className={tableBoardFontClassName}>{children}</div>;
}
