import type { Metadata } from "next";
import { Suspense } from "react";
import SlackAuthorizationComplete from "@/components/slack/SlackAuthorizationComplete";

export const metadata: Metadata = {
  title: "Slack",
  description: "Finishing the Slack connection",
  robots: { index: false, follow: false },
};

/**
 * Where the API's Slack OAuth callback sends a tab that was opened for a Slack authorization.
 * Public, so it renders even before the app restored the session in the new tab.
 */
export default function SlackAuthorizationCompletePage() {
  // The view reads `?slack=connected` from the URL, which needs a Suspense boundary.
  return (
    <Suspense>
      <SlackAuthorizationComplete />
    </Suspense>
  );
}
