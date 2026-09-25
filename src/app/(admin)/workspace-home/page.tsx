import type { Metadata } from "next";
import HomeView from "@/components/personal/HomeView";

export const metadata: Metadata = {
  title: "Home",
  description: "Recently visited boards, your work and notifications",
};

export default function WorkspaceHomePage() {
  return <HomeView />;
}
