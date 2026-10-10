import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TemplateGallery from "@/components/board/automations/builder/TemplateGallery";
import ConnectedRecipeEditor from "@/components/board/automations/connected/ConnectedRecipeEditor";
import { AUTOMATION_RECIPES, EMAIL_UPDATE_TEMPLATE } from "@/components/board/automations/builder/automationTemplates";
import type { AutomationBuilderContext } from "@/components/board/automations/builder/automationCatalog";
import { describeDefinition, sentenceText } from "@/components/board/automations/builder/automationSentence";
import { connectedRecipeFor } from "@/components/board/automations/connected/connectedRecipes";
import type { ColumnDef, PersonDef } from "@/components/board/table/types";
import type { ExternalAccountDto } from "@/types/external-account";

vi.mock("@/hooks/useAccountBranding", () => ({ useAccountBranding: () => ({ logo_url: null }) }));

vi.mock("@/hooks/useGoogleCalendars", () => ({
  useGoogleCalendars: () => ({
    calendars: [
      { id: "ada@97thfloor.com", name: "Ada", is_primary: true },
      { id: "team@group.calendar.google.com", name: "Team", is_primary: false },
    ],
    is_loading: false,
    is_refreshing: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

const columns = [
  { id: "11", title: "Status", kind: "status", options: [{ id: "done", label: "Done", color: "#00c875" }] },
  { id: "12", title: "Owner", kind: "people" },
  { id: "13", title: "Due date", kind: "date" },
] as unknown as ColumnDef[];
const people = [{ id: "5", name: "Bob Stone" }] as unknown as PersonDef[];
const groups = [{ id: "21", label: "Inbox" }, { id: "22", label: "Done" }];

const context: AutomationBuilderContext = {
  board_id: 1,
  columns: columns.map((column) => ({ ...column, scope: "item" as const })),
  groups,
  people,
  board_targets: [],
  slack_channels: [],
  is_slack_connected: false,
};

const account = (overrides: Partial<ExternalAccountDto> = {}): ExternalAccountDto => ({
  id: 7,
  provider: "google",
  email: "ada@97thfloor.com",
  name: "Ada",
  services: ["gmail", "google_calendar"],
  last_error: null,
  connected_at: null,
  automations_count: 0,
  ...overrides,
});

const recipe = (id: string) => AUTOMATION_RECIPES.find((entry) => entry.id === id)!;

const galleryProps = {
  context,
  saved_templates: [],
  is_loading_saved: false,
  account_templates: [],
  is_loading_account: false,
  can_manage_account_templates: false,
  onUseSaved: vi.fn(),
  onUseAccount: vi.fn(),
  onDeleteSaved: vi.fn(),
  onDeleteAccount: vi.fn(),
  onUseSlackRecipe: vi.fn(),
};

describe("Recommended category", () => {
  it("lists monday.com's recommended recipes in its order", () => {
    const recommended = AUTOMATION_RECIPES.filter((entry) => entry.categories.includes("recommended")).map((entry) => entry.title.replaceAll("**", ""));
    expect(recommended).toEqual([
      "When status changes to something move item to group",
      "When an item is created or updated, create an event in Google Calendar, and sync future changes from this board",
      "When status changes to something notify someone",
      "When an item is created assign creator as person",
      "When date arrives notify someone",
      "When an email is received, create an item in group",
      "When date arrives and only if status is something notify someone",
      "Every time period create an item",
      "When an email is received, create an item in group",
      "When status changes to something, send an email to someone",
      "Every time period duplicate group",
    ]);
    expect(recipe("gmail_email_create_item").connected_app).toBe("gmail");
    expect(recipe("outlook_email_create_item").connected_app).toBe("outlook");
    expect(recipe("google_calendar_item_sync").connected_app).toBe("google_calendar");
  });

  it("opens the connected flow for integration recipes, the builder for the rest, and ends with the custom card", async () => {
    const user = userEvent.setup();
    const onUseRecipe = vi.fn();
    const onUseConnectedRecipe = vi.fn();
    const onCustom = vi.fn();
    render(<TemplateGallery {...galleryProps} onUseRecipe={onUseRecipe} onUseConnectedRecipe={onUseConnectedRecipe} onCustom={onCustom} />);

    await user.click(screen.getByRole("button", { name: "Recommended" }));
    const buttons = screen.getAllByRole("button", { name: /^Use template:/ });
    expect(buttons).toHaveLength(11);

    await user.click(buttons[1]);
    expect(onUseConnectedRecipe).toHaveBeenCalledWith(expect.objectContaining({ id: "google_calendar_item_sync" }));
    await user.click(buttons[0]);
    expect(onUseRecipe).toHaveBeenCalledWith(expect.objectContaining({ id: "status_move" }));

    await user.click(screen.getByRole("button", { name: /Can't find the right automation/ }));
    expect(onCustom).toHaveBeenCalled();
  });

  it("lists Outlook, Gmail, Slack and Google Calendar in the Integrations box", () => {
    render(<TemplateGallery {...galleryProps} onUseRecipe={vi.fn()} onUseConnectedRecipe={vi.fn()} onCustom={vi.fn()} />);
    const box = screen.getByRole("group", { name: "Integrations" });
    expect(within(box).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual(["Outlook", "Gmail", "Slack", "Google Calendar"]);
  });
});

describe("Connected recipe editor", () => {
  it("turns an email recipe into an email trigger that creates the item and posts the email", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<ConnectedRecipeEditor connected={connectedRecipeFor(recipe("gmail_email_create_item"))!} columns={columns} groups={groups} people={people} account={account()} is_saving={false} save_error={null} onChangeAccount={vi.fn()} onCreate={onCreate} />);

    const create = screen.getByRole("button", { name: "Create automation" });
    expect(create).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Group: group" }));
    await user.click(screen.getByRole("button", { name: "Inbox" }));
    await user.click(screen.getByRole("button", { name: "Which emails: email" }));
    await user.type(screen.getByLabelText("Subject contains"), "lead");
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(create);

    expect(onCreate).toHaveBeenCalledWith({
      trigger_type: "email_received",
      trigger_config: { external_account_id: 7, external_account_email: "ada@97thfloor.com", from_filter: null, subject_filter: "lead" },
      actions: [
        { type: "create_item", params: { target_group_id: 21, item_name: "{payload.subject}" } },
        { type: "post_update", params: { message: EMAIL_UPDATE_TEMPLATE } },
      ],
    });
  });

  it("builds a Google Calendar sync on the chosen date column and calendar", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<ConnectedRecipeEditor connected={connectedRecipeFor(recipe("google_calendar_item_sync"))!} columns={columns} groups={groups} people={people} account={account()} is_saving={false} save_error={null} onChangeAccount={vi.fn()} onCreate={onCreate} />);

    await user.click(screen.getByRole("button", { name: "Google calendar: Google Calendar" }));
    await user.click(screen.getByRole("button", { name: "Team" }));
    await user.click(screen.getByRole("button", { name: "Create automation" }));

    expect(onCreate).toHaveBeenCalledWith({
      trigger_type: "item_created_or_updated",
      actions: [{ type: "google_calendar_sync", params: { external_account_id: 7, external_account_email: "ada@97thfloor.com", calendar_id: "team@group.calendar.google.com", calendar_name: "Team", date_column_id: 13, title_template: "{item_name}" } }],
    });
  });

  it("sends the status email from the connected Gmail account to the chosen people", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<ConnectedRecipeEditor connected={connectedRecipeFor(recipe("gmail_status_send_email"))!} columns={columns} groups={groups} people={people} account={account()} is_saving={false} save_error={null} onChangeAccount={vi.fn()} onCreate={onCreate} />);

    await user.click(screen.getByRole("button", { name: "Status column: status" }));
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.click(screen.getByRole("button", { name: "Status value: something" }));
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(screen.getByRole("button", { name: "Who gets the email: someone" }));
    await user.click(screen.getByRole("button", { name: "Owner" }));
    await user.type(screen.getByLabelText("Email address"), "client@acme.com{Enter}");
    await user.click(screen.getByRole("button", { name: "Create automation" }));

    const payload = onCreate.mock.calls[0][0];
    expect(payload).toMatchObject({ trigger_type: "status_changed", trigger_column_id: 11, trigger_value: "done" });
    expect(payload.actions[0]).toMatchObject({
      type: "send_email",
      params: { external_account_id: 7, notify_from_people_column_id: 12, email_addresses: ["client@acme.com"] },
    });
    expect(payload.actions[0].params.subject).toContain("{item_name}");
  });
});

describe("Sentences", () => {
  it("describes the new trigger and action for the Manage list", () => {
    expect(sentenceText(describeDefinition({
      trigger_type: "email_received",
      trigger_column_id: null,
      trigger_value: null,
      trigger_config: { external_account_id: 7, from_filter: "acme" },
      conditions: [],
      actions: [{ type: "create_item", params: { target_group_id: 21 } }],
    }, context))).toContain('When an email is received from "acme"');

    expect(sentenceText(describeDefinition({
      trigger_type: "item_created_or_updated",
      trigger_column_id: null,
      trigger_value: null,
      trigger_config: null,
      conditions: [],
      actions: [{ type: "google_calendar_sync", params: { external_account_id: 7, calendar_id: "primary", calendar_name: "Ada", date_column_id: 13 } }],
    }, context))).toContain("create an event on Due date in Ada, and sync future changes");
  });
});
