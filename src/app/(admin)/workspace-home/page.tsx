import type { Metadata } from "next";
import WorkspaceHomeRedirect from "./_components/WorkspaceHomeRedirect";

export const metadata: Metadata = {
  title: "Workspace home",
  description: "Home for Workspace 97th",
};

export default function WorkspaceHomePage() {
  return <WorkspaceHomeRedirect />;
}
