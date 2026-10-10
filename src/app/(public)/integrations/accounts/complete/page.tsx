import type { Metadata } from "next";
import { Suspense } from "react";
import ExternalAuthorizationComplete from "@/components/integrations/ExternalAuthorizationComplete";

export const metadata: Metadata = {
  title: "Connecting your account",
  description: "Finishing the Gmail, Outlook or Google Calendar connection",
  robots: { index: false, follow: false },
};

/**
 * Where the API's Google and Microsoft OAuth callback sends a tab that was opened to connect a
 * Gmail, Outlook or Google Calendar account. Public, so it renders before the session is restored.
 */
export default function ExternalAuthorizationCompletePage() {
  // The view reads `?result=connected` from the URL, which needs a Suspense boundary.
  return (
    <Suspense>
      <ExternalAuthorizationComplete />
    </Suspense>
  );
}
