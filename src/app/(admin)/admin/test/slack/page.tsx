import type { Metadata } from "next";
import { Suspense } from "react";
import SlackTestView from "@/components/slack-test/SlackTestView";

export const metadata: Metadata = {
  title: "Slack Test",
  description: "Diagnostic screen for verifying the Slack app credentials, workspace connection and message delivery",
};

export default function SlackTestPage() {
  // The view reads `?slack=connected` after an OAuth round trip, which needs a Suspense boundary.
  return (
    <Suspense>
      <SlackTestView />
    </Suspense>
  );
}
