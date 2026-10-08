import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SlackRecipeEditor from "@/components/board/automations/slack/SlackRecipeEditor";
import { SLACK_RECIPES, slackRecipeFor } from "@/components/board/automations/slack/slackRecipes";
import type { ColumnDef, PersonDef } from "@/components/board/table/types";
import type { SlackConnectionDto } from "@/types/slack";

vi.mock("@/hooks/useSlackConnectionChannels", () => ({
  useSlackConnectionChannels: () => ({
    channels: [
      { id: "C1", name: "announcements", is_private: false },
      { id: "C2", name: "palomar", is_private: false },
    ],
    is_loading: false,
    is_refreshing: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

const connection: SlackConnectionDto = {
  id: 9,
  team_id: "T200",
  team_name: "97th Floor",
  team_url: null,
  slack_user_id: "U900",
  slack_user_name: "Amanda",
  is_active_workspace: false,
  connected_at: null,
  automations_count: 0,
};

const columns = [
  { id: "11", title: "Status", kind: "status", options: [{ id: "done", label: "Done", color: "#00c875" }] },
  { id: "12", title: "Owner", kind: "people" },
] as unknown as ColumnDef[];
const people = [{ id: "5", name: "Bob Stone" }] as unknown as PersonDef[];

const recipe = (id: string) => SLACK_RECIPES.find((entry) => entry.id === id)!;

describe("Slack recipes", () => {
  it("lists channel recipes first and maps every Slack template to a recipe", () => {
    expect(SLACK_RECIPES[0].title).toBe("When **date** arrives, **notify** in **channel**");
    expect(SLACK_RECIPES.findIndex((entry) => entry.target === "person")).toBeGreaterThan(SLACK_RECIPES.findLastIndex((entry) => entry.target === "channel"));
    expect(slackRecipeFor("item_created", "slack_channel")?.id).toBe("slack:item_created:channel");
    expect(slackRecipeFor("status_changed", "slack_person")?.target).toBe("person");
    expect(slackRecipeFor("item_created", "email")).toBeNull();
  });

  it("forwards the update text when an update is sent to a channel", () => {
    expect(recipe("slack:update_posted:channel").title).toBe("When an **update is posted**, **send it** to **channel**");
    expect(recipe("slack:update_posted:channel").default_message).toBe("{update_text}");
  });
});

describe("SlackRecipeEditor", () => {
  it("only creates once a channel is chosen and posts through the chosen account", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <SlackRecipeEditor
        recipe={recipe("slack:item_created:channel")}
        columns={columns}
        people={people}
        connection={connection}
        active_workspace_name="Acme"
        is_saving={false}
        save_error={null}
        onCreate={onCreate}
      />
    );

    const create = screen.getByRole("button", { name: "Create automation" });
    expect(create).toBeDisabled();
    expect(screen.getByText("Choose a channel to finish.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Slack channel: channel" }));
    await user.click(screen.getByRole("button", { name: /palomar/ }));
    expect(create).toBeEnabled();

    await user.click(create);
    expect(onCreate).toHaveBeenCalledWith({
      trigger_type: "item_created",
      trigger_column_id: null,
      trigger_value: null,
      action_type: "slack_notify_channel",
      action_params: { slack_channel_id: "C2", slack_channel_name: "palomar", slack_team_id: "T200", slack_connection_id: 9 },
    });
  });

  it("asks for the status column and value before a status recipe can be created, then saves the message", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <SlackRecipeEditor
        recipe={recipe("slack:status_changed:person")}
        columns={columns}
        people={people}
        connection={null}
        active_workspace_name="Acme"
        is_saving={false}
        save_error={null}
        onCreate={onCreate}
      />
    );

    expect(screen.getByText("Choose a status column, who to notify to finish.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Column: status" }));
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.click(screen.getByRole("button", { name: "Status value: something" }));
    await user.click(screen.getByRole("button", { name: /Done/ }));
    await user.click(screen.getByRole("button", { name: "Who to notify: someone" }));
    await user.click(screen.getByRole("button", { name: "Owner" }));
    await user.click(screen.getByRole("button", { name: "Message: notify" }));
    await user.type(screen.getByRole("textbox", { name: "Slack message" }), "Ready to ship");
    await user.click(screen.getByRole("button", { name: "Done" }));

    await user.click(screen.getByRole("button", { name: "Create automation" }));
    expect(onCreate).toHaveBeenCalledWith({
      trigger_type: "status_changed",
      trigger_column_id: 11,
      trigger_value: "done",
      action_type: "slack_notify_person",
      action_params: { notify_from_people_column_id: 12, message: "Ready to ship" },
    });
  });
});
