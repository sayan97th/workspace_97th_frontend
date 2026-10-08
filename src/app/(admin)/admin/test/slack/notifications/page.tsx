import type { Metadata } from "next";
import SlackNotificationTestsView from "@/components/slack-test/SlackNotificationTestsView";

export const metadata: Metadata = {
  title: "Slack Notification Tests",
  description: "Test suite that sends real Slack notifications and checks every step of their delivery",
};

export default function SlackNotificationTestsPage() {
  return <SlackNotificationTestsView />;
}
