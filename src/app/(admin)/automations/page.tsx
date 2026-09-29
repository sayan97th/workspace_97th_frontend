import type { Metadata } from "next";
import AccountAutomationsView from "@/components/automations-center/AccountAutomationsView";

export const metadata: Metadata = {
  title: "Automations",
  description: "Every automation on the boards you can open",
};

export default function AutomationsPage() {
  return <AccountAutomationsView />;
}
