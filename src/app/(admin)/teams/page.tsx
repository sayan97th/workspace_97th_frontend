import type { Metadata } from "next";
import TeamsView from "@/components/teams/TeamsView";

export const metadata: Metadata = {
  title: "Teams",
  description: "Browse your account's teams, manage rosters, and organize collaborators",
};

export default function TeamsPage() {
  return <TeamsView />;
}
