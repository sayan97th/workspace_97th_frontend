import type { ColumnDef, PersonDef } from "../table/types";
import type { BoardAutomationDto } from "@/types/board-automation";

export type NamedOption = { id: string; label: string };

function describeTrigger(automation: BoardAutomationDto, columns: ColumnDef[], people: PersonDef[]): string {
  const trigger_column = columns.find((c) => c.id === String(automation.trigger_column_id));
  const trigger_label = trigger_column?.title ?? "a column";

  switch (automation.trigger_type) {
    case "status_changed":
      return `When ${trigger_label} changes to "${trigger_column?.options?.find((o) => o.id === automation.trigger_value)?.label ?? automation.trigger_value}"`;
    case "date_arrived":
      return `When ${trigger_label} arrives`;
    case "item_created":
      return "When an item is created";
    case "subitem_created":
      return "When a subitem is created";
    case "column_changed":
      return `When ${trigger_label} changes`;
    case "update_posted":
      return "When an update is posted";
    default:
      return automation.trigger_value
        ? `When ${people.find((p) => p.id === String(automation.trigger_value))?.name ?? "someone"} is assigned in "${trigger_label}"`
        : `When someone is assigned in "${trigger_label}"`;
  }
}

/** "Amanda", or "whoever is assigned in "Owner"", whichever the action was configured with. */
function describeRecipient(automation: BoardAutomationDto, columns: ColumnDef[], people: PersonDef[]): string {
  if (automation.action_params.notify_user_id) {
    return people.find((p) => p.id === String(automation.action_params.notify_user_id))?.name ?? "a person";
  }
  return `whoever is assigned in "${columns.find((c) => c.id === String(automation.action_params.notify_from_people_column_id))?.title ?? "a column"}"`;
}

function describeAction(automation: BoardAutomationDto, columns: ColumnDef[], groups: NamedOption[], people: PersonDef[]): string {
  const group_label = groups.find((g) => g.id === String(automation.action_params.target_group_id))?.label ?? "a table";

  switch (automation.action_type) {
    case "move_to_group":
      return `move the item to "${group_label}"`;
    case "archive_item":
      return "archive the item";
    case "create_item":
      return `create "${automation.action_params.item_name || "New item"}" in "${group_label}"`;
    case "set_column_value": {
      const target_column = columns.find((c) => c.id === String(automation.action_params.target_column_id));
      const raw_value = automation.action_params.value;
      const resolved_value = target_column?.options?.find((o) => o.id === raw_value)?.label ?? String(raw_value ?? "");
      return `set "${target_column?.title ?? "a column"}" to "${resolved_value}"`;
    }
    case "send_email":
      return `send an email to ${describeRecipient(automation, columns, people)}`;
    case "slack_notify_person":
      return `send a Slack message to ${describeRecipient(automation, columns, people)}`;
    case "slack_notify_channel":
      return `post to Slack channel #${automation.action_params.slack_channel_name || automation.action_params.slack_channel_id}`;
    default:
      return `notify ${describeRecipient(automation, columns, people)}`;
  }
}

/** Describes one automation as a plain-English sentence for the list view. */
export function describeAutomation(automation: BoardAutomationDto, columns: ColumnDef[], groups: NamedOption[], people: PersonDef[]): string {
  return `${describeTrigger(automation, columns, people)}, ${describeAction(automation, columns, groups, people)}.`;
}
