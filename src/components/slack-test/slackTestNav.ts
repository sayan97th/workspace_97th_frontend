import { Activity, BellRing, type LucideIcon } from "lucide-react";

/** Matches the `role:super_admin,admin` gate on every Slack diagnostics endpoint of the API. */
export const SLACK_TEST_ROLES = ["super_admin", "admin"];

export const SLACK_DIAGNOSTICS_PATH = "/admin/test/slack";

export const SLACK_NOTIFICATION_TESTS_PATH = "/admin/test/slack/notifications";

export type SlackTestPage = {
  path: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

/** The pages of the Slack testing area, in rail order. The shell reads the page heading from here. */
export const SLACK_TEST_PAGES: SlackTestPage[] = [
  {
    path: SLACK_DIAGNOSTICS_PATH,
    label: "Diagnostics",
    title: "Slack diagnostics",
    description: "Check the Slack app in use, the connected workspace and your own accounts, then send real messages to confirm delivery.",
    icon: Activity,
  },
  {
    path: SLACK_NOTIFICATION_TESTS_PATH,
    label: "Notification tests",
    title: "Notification tests",
    description: "Send every kind of Slack notification to a member or a channel and follow each step of its delivery.",
    icon: BellRing,
  },
];

/** The page whose path matches `pathname`, the diagnostics page for anything else under the area. */
export const findSlackTestPage = (pathname: string | null): SlackTestPage =>
  SLACK_TEST_PAGES.find((page) => page.path === pathname?.replace(/\/$/, "")) ?? SLACK_TEST_PAGES[0];
