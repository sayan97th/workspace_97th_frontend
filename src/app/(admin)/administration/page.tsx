import type { Metadata } from "next";
import { Suspense } from "react";
import AdministrationView from "@/components/administration/AdministrationView";

export const metadata: Metadata = {
  title: "Administration",
  description: "Manage account settings, organization branding, users, departments, security and integrations",
};

export default function AdministrationPage() {
  // The view reads `?section=` (and Slack's `?slack=connected` after an OAuth round trip), which needs a Suspense boundary.
  return (
    <Suspense>
      <AdministrationView />
    </Suspense>
  );
}
