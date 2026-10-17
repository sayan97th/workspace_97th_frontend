import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IntegrationsSection from "@/components/profile/sections/IntegrationsSection";
import type { SlackConnectionDto, SlackStatusDto } from "@/types/slack";

const slack_api = {
  status: null as SlackStatusDto | null,
  is_loading: false,
  is_working: false,
  awaiting_purpose: null,
  error: null,
  notice: null,
  dismissMessages: vi.fn(),
  cancelAwaitingSlack: vi.fn(),
  reloadStatus: vi.fn(),
  connectMyAccount: vi.fn(),
  disconnectMyAccount: vi.fn(),
  sendTestMessage: vi.fn(),
};

const connections_api = {
  connections: [] as SlackConnectionDto[],
  is_configured: true,
  can_connect: true,
  is_loading: false,
  is_awaiting_slack: false,
  is_working: false,
  error: null,
  notice: null,
  dismissMessages: vi.fn(),
  connect: vi.fn(),
  cancelAwaitingSlack: vi.fn(),
  disconnect: vi.fn(),
  reload: vi.fn(),
};

vi.mock("@/hooks/useSlackIntegration", () => ({ useSlackIntegration: () => slack_api }));
vi.mock("@/hooks/useSlackConnections", () => ({ useSlackConnections: () => connections_api }));

const baseStatus = (overrides: Partial<SlackStatusDto> = {}): SlackStatusDto => ({
  is_configured: true,
  is_connected: false,
  needs_setup: true,
  needs_app_setup: false,
  can_connect_account: true,
  can_manage: false,
  can_configure_app: false,
  credentials_source: "environment",
  app_name: "97th Floor",
  workspaces_count: 0,
  workspace: null,
  current_user_link: null,
  ...overrides,
});

const workspace = { id: 1, team_id: "T100", team_name: "Acme", team_url: "https://acme.slack.com/", connected_at: null, connected_by: null, linked_members_count: 0 };

describe("My Profile > Integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connections_api.connections = [];
  });

  it("lets a member set up Slack for their own account while no workspace is connected", async () => {
    slack_api.status = baseStatus();
    render(<IntegrationsSection onOpenNotifications={vi.fn()} />);

    expect(screen.getByText(/Only they can change the app or its Client ID/)).toBeTruthy();
    expect(screen.queryByText(/Client ID$/)).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Set up Slack" }));
    expect(connections_api.connect).toHaveBeenCalledWith("/profile?section=integrations");
  });

  it("signs in to the active workspace, or connects another one", async () => {
    slack_api.status = baseStatus({ is_connected: true, needs_setup: false, workspace });
    render(<IntegrationsSection onOpenNotifications={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Connect my Slack" }));
    expect(slack_api.connectMyAccount).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "My Slack is in another workspace" }));
    expect(connections_api.connect).toHaveBeenCalled();
  });

  it("tells a member to ask an administrator when the Slack app is missing", () => {
    slack_api.status = baseStatus({ is_configured: false, needs_app_setup: true, can_connect_account: false });
    render(<IntegrationsSection onOpenNotifications={vi.fn()} />);

    expect(screen.getByText(/Available once an administrator adds the Slack app/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Set up Slack" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Add the Slack app" })).toBeNull();
  });

  it("lists the member's own Slack accounts and tags the one that gets notifications", async () => {
    slack_api.status = baseStatus({
      is_connected: true,
      needs_setup: false,
      workspace,
      current_user_link: { slack_user_id: "U900", slack_display_name: "Amanda", linked_at: null, team_id: "T200", team_name: "97th Floor", is_active_workspace: false },
    });
    connections_api.connections = [
      { id: 9, team_id: "T200", team_name: "97th Floor", team_url: null, slack_user_id: "U900", slack_user_name: "Amanda", is_active_workspace: false, connected_at: null, automations_count: 2 },
    ];
    const onOpenNotifications = vi.fn();
    render(<IntegrationsSection onOpenNotifications={onOpenNotifications} />);

    expect(screen.getByText("Gets your notifications")).toBeTruthy();
    expect(screen.getByText(/Used by 2 automations/)).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Notification settings" }));
    expect(onOpenNotifications).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(connections_api.disconnect).toHaveBeenCalledWith(9);
  });
});
