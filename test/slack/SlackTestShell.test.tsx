import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SlackTestShell from "@/components/slack-test/SlackTestShell";
import SlackNotificationTestRow from "@/components/slack-test/SlackNotificationTestRow";
import { isSidebarlessPath } from "@/layout/sidebar-routes";
import type { SlackNotificationTestDto, SlackNotificationTestResultDto } from "@/types/slack";

const auth_state = { roles: [] as string[] };

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ isLoading: false, hasAnyRole: (...roles: string[]) => roles.some((role) => auth_state.roles.includes(role)) }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/test/slack/notifications",
}));

beforeEach(() => {
  auth_state.roles = [];
});

describe("SlackTestShell", () => {
  test("only account owners and administrators get in", () => {
    auth_state.roles = ["staff"];
    const { rerender } = render(
      <SlackTestShell>
        <p>Secret content</p>
      </SlackTestShell>
    );

    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
    expect(screen.getByText("You don't have access to this page")).toBeInTheDocument();

    auth_state.roles = ["admin"];
    rerender(
      <SlackTestShell>
        <p>Secret content</p>
      </SlackTestShell>
    );

    expect(screen.getByText("Secret content")).toBeInTheDocument();
  });

  test("shows the heading of the current page and marks it in the rail", () => {
    auth_state.roles = ["super_admin"];
    render(
      <SlackTestShell>
        <p>Content</p>
      </SlackTestShell>
    );

    expect(screen.getByRole("heading", { level: 2, name: "Notification tests" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Notification tests" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Diagnostics" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Back to Slack settings" })).toHaveAttribute("href", "/administration?section=slack");
  });

  test("the testing pages render without the workspace sidebar", () => {
    expect(isSidebarlessPath("/admin/test/slack")).toBe(true);
    expect(isSidebarlessPath("/admin/test/slack/notifications")).toBe(true);
    expect(isSidebarlessPath("/admin/test/websocket")).toBe(false);
  });
});

const test_definition: SlackNotificationTestDto = {
  key: "channel_post",
  label: "Channel post",
  description: "Posts a message to the channel.",
  category: "channels",
  target: "channel",
  required_scopes: ["chat:write", "reactions:write"],
  missing_scopes: ["reactions:write"],
  sends_message: true,
};

const result: SlackNotificationTestResultDto = {
  key: "channel_post",
  label: "Channel post",
  status: "passed",
  detail: "Posted to #general.",
  steps: [{ name: "chat.postMessage", status: "passed", detail: "ok" }],
  links: [{ label: "Open in Slack", url: "https://acme.slack.com/archives/C1/p1" }],
  duration_ms: 120,
  ran_at: "2026-10-12T12:00:00+00:00",
};

describe("SlackNotificationTestRow", () => {
  test("explains why a test cannot run and disables its button", () => {
    render(
      <ul>
        <SlackNotificationTestRow test={test_definition} result={null} is_running={false} blocker="Choose a channel." is_disabled={false} onRun={() => {}} />
      </ul>
    );

    expect(screen.getByText("Choose a channel.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run: Channel post" })).toBeDisabled();
    expect(screen.getByText("reactions:write")).toHaveAttribute("title", "The workspace was installed without this scope");
  });

  test("shows the result with its link and reveals every Slack call on demand", async () => {
    const on_run = vi.fn();
    render(
      <ul>
        <SlackNotificationTestRow test={test_definition} result={result} is_running={false} blocker={null} is_disabled={false} onRun={on_run} />
      </ul>
    );

    expect(screen.getByText("Posted to #general.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open in Slack/ })).toHaveAttribute("href", result.links[0].url);
    expect(screen.queryByText("chat.postMessage")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Show 1 step/ }));
    expect(screen.getByText("chat.postMessage")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Run again: Channel post" }));
    expect(on_run).toHaveBeenCalledTimes(1);
  });
});
