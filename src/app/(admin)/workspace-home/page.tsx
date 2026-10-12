import type { Metadata } from "next";
import HomeView from "@/components/home/HomeView";

export const metadata: Metadata = {
  title: "Home",
  description: "Your day at a glance: recent boards, work due soon, inbox and workspaces",
};

export default function WorkspaceHomePage() {
  return <HomeView />;
}
