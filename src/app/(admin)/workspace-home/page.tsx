import type { Metadata } from "next";
import WorkspaceHomeRedirect from "./_components/WorkspaceHomeRedirect";

export const metadata: Metadata = {
  title: "Workspace home | Workspace 97th",
  description: "Home for Workspace 97th",
};

export default function WorkspaceHomePage() {
  return <WorkspaceHomeRedirect />;
}
