import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Table Board Preview | Workspace 97th",
  description: "Standalone preview of the Table board's dynamic add-column feature — isolated from the main application shell.",
};

export default function TableBoardPreviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
