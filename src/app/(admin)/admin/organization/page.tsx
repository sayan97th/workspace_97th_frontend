import type { Metadata } from "next";
import OrganizationSettingsView from "@/components/organization/OrganizationSettingsView";

export const metadata: Metadata = {
  title: "Organization",
  description: "Company profile, logo, brand color, contact details, sign in page and announcements",
};

export default function OrganizationPage() {
  return <OrganizationSettingsView />;
}
