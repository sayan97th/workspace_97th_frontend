import type { Metadata } from "next";
import { Suspense } from "react";
import SlackSettingsView from "@/components/administration/slack/SlackSettingsView";

export const metadata: Metadata = {
  title: "Slack settings",
  description: "Set up the Slack app, connect Slack workspaces and link members, for administrators and the account owner",
};

export default function SlackSettingsPage() {
  // The view reads `?reason=connect` and `?slack=connected` after an OAuth round trip, which needs a Suspense boundary.
  return (
    <Suspense>
      <SlackSettingsView />
    </Suspense>
  );
}
