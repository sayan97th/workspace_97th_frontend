import type { Metadata } from "next";
import WorkspaceHome from "./_components/WorkspaceHome";

export const metadata: Metadata = {
  title: "Dashboard | Workspace 97th",
  description: "Home for Workspace 97th Dashboard",
};

export default function Dashboard() {
  return <WorkspaceHome />;
}
