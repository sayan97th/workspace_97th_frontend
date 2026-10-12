import type { Metadata } from "next";
import { Suspense } from "react";
import TeamsView from "@/components/teams/TeamsView";

export const metadata: Metadata = {
  title: "Teams",
  description: "Browse your account's teams, manage rosters, owners, sub-teams and the boards each team works on",
};

export default function TeamsPage() {
  // The view keeps the open team and tab in `?team=` and `?tab=`, which needs a Suspense boundary.
  return (
    <Suspense>
      <TeamsView />
    </Suspense>
  );
}
