import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef, PersonDef } from "@/components/board/table/types";
import SlackRecipeEditor from "@/components/board/automations/slack/SlackRecipeEditor";
import { SLACK_RECIPES } from "@/components/board/automations/slack/slackRecipes";
import { slackMessageFieldsFor, toDisplayMessage, toStoredMessage } from "@/components/board/automations/slack/slackMessageTokens";

vi.mock("@/hooks/useSlackConnectionChannels", () => ({
  useSlackConnectionChannels: () => ({ channels: [], is_loading: false, is_refreshing: false, error: null, refresh: vi.fn() }),
}));

const columns = [
  { id: "11", title: "Status", kind: "status", options: [{ id: "done", label: "Done", color: "#00c875" }] },
  { id: "12", title: "Item name", kind: "text" },
  { id: "13", title: "Total", kind: "formula" },
] as ColumnDef[];

const people = [{ id: "7", name: "Amanda Ruiz" }] as PersonDef[];

describe("Slack recipe messages", () => {
  test("every recipe starts with a predefined message", () => {
    for (const recipe of SLACK_RECIPES) expect(recipe.default_message.trim()).not.toBe("");
  });

  test("tokens round trip between the stored and the displayed message", () => {
    const fields = slackMessageFieldsFor("status_changed", columns);
    const stored = "{item_name} in {group_name} is {column:11}, {column:12} {unknown}";
    const display = toDisplayMessage(stored, fields);

    expect(display).toBe("{Item Name} in {Group Name} is {Status}, {Item name (column)} {unknown}");
    expect(toStoredMessage(display, fields)).toBe(stored);
    // Columns without a value of their own are not offered.
    expect(fields.columns.map((field) => field.token)).toEqual(["{column:11}", "{column:12}"]);
  });

  test("only offers the fields the trigger fills in", () => {
    const labels = slackMessageFieldsFor("date_arrived", []).general.map((field) => field.label);

    expect(labels).toContain("Column Name");
    expect(labels).not.toContain("User Name");
    expect(labels).not.toContain("Update Text");
  });

  test("the template is used as is when the user just presses Done", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const recipe = SLACK_RECIPES.find((entry) => entry.id === "slack:item_created:person")!;
    render(<SlackRecipeEditor recipe={recipe} columns={columns} people={people} connection={null} active_workspace_name="Acme" is_saving={false} save_error={null} onCreate={onCreate} />);

    await user.click(screen.getByRole("button", { name: "Message: notify" }));
    expect(screen.getByRole("textbox", { name: "Slack message" })).toHaveValue("A new item, {Item Name}, was created in {Board Name} board by {User Name}");
    await user.click(screen.getByRole("button", { name: "Done" }));

    await user.click(screen.getByRole("button", { name: "Who to notify: user" }));
    await user.click(screen.getByText("Amanda Ruiz"));
    await user.click(screen.getByRole("button", { name: "Create automation" }));

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      trigger_type: "item_created",
      action_type: "slack_notify_person",
      action_params: { notify_user_id: 7, message: "A new item, {item_name}, was created in {board_name} board by {actor_name}" },
    }));
  });

  test("reopening the message after an outside click shows the saved message again", async () => {
    const user = userEvent.setup();
    const recipe = SLACK_RECIPES.find((entry) => entry.id === "slack:item_created:person")!;
    render(<SlackRecipeEditor recipe={recipe} columns={columns} people={people} connection={null} active_workspace_name="Acme" is_saving={false} save_error={null} onCreate={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Message: notify" }));
    await user.type(screen.getByRole("textbox", { name: "Slack message" }), " unsaved");
    await user.click(document.body);
    await user.click(screen.getByRole("button", { name: "Message: notify" }));

    expect(screen.getByRole("textbox", { name: "Slack message" })).toHaveValue("A new item, {Item Name}, was created in {Board Name} board by {User Name}");
  });

  test("an emptied message can not be saved and the template can be restored", async () => {
    const user = userEvent.setup();
    const recipe = SLACK_RECIPES.find((entry) => entry.id === "slack:status_changed:person")!;
    render(<SlackRecipeEditor recipe={recipe} columns={columns} people={people} connection={null} active_workspace_name="Acme" is_saving={false} save_error={null} onCreate={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Message: notify" }));
    const field = screen.getByRole("textbox", { name: "Slack message" });
    await user.clear(field);
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Restore template" }));
    expect(field).toHaveValue(toDisplayMessage(recipe.default_message, slackMessageFieldsFor("status_changed", columns)));
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
  });
});
