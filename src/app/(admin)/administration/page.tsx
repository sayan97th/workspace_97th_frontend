import type { Metadata } from "next";
import AdministrationView from "@/components/administration/AdministrationView";

export const metadata: Metadata = {
  title: "Administration | Workspace 97th",
  description: "Manage account settings, branding, users, departments, and security",
};

export default function AdministrationPage() {
  return <AdministrationView />;
}
