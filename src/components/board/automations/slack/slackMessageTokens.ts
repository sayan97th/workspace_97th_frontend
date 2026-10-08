import type { ColumnDef } from "../../table/types";
import type { CommunicationTrigger } from "../communicationTemplates";

/**
 * One field a Slack message can be personalized with. `token` is what the API stores and fills in
 * (see `BoardAutomationMessageRenderer`), `label` is what the message box shows between braces,
 * like monday.com's `{board.name}`.
 */
export type SlackMessageField = { token: string; label: string };

export type SlackMessageFields = {
  /** Item, board, person and trigger fields. */
  general: SlackMessageField[];
  /** The value each column of the table holds on the item, as `{column:<id>}`. */
  columns: SlackMessageField[];
};

/** Triggers that run without anyone making a change, so "User Name" would always read "Someone". */
const ACTORLESS_TRIGGERS: CommunicationTrigger[] = ["date_arrived"];
const COLUMN_TRIGGERS: CommunicationTrigger[] = ["status_changed", "date_arrived", "person_assigned", "column_changed"];
const OLD_VALUE_TRIGGERS: CommunicationTrigger[] = ["status_changed", "person_assigned", "column_changed"];

const GENERAL_FIELDS: (SlackMessageField & { isAvailable?: (trigger: CommunicationTrigger) => boolean })[] = [
  { token: "{item_name}", label: "Item Name" },
  { token: "{board_name}", label: "Board Name" },
  { token: "{group_name}", label: "Group Name" },
  { token: "{actor_name}", label: "User Name", isAvailable: (trigger) => !ACTORLESS_TRIGGERS.includes(trigger) },
  { token: "{column_name}", label: "Column Name", isAvailable: (trigger) => COLUMN_TRIGGERS.includes(trigger) },
  { token: "{new_value}", label: "New Value", isAvailable: (trigger) => COLUMN_TRIGGERS.includes(trigger) },
  { token: "{old_value}", label: "Previous Value", isAvailable: (trigger) => OLD_VALUE_TRIGGERS.includes(trigger) },
  { token: "{update_text}", label: "Update Text", isAvailable: (trigger) => trigger === "update_posted" },
];

/** Columns without a stored value of their own, a token for them would always be empty. */
const VALUELESS_KINDS: ColumnDef["kind"][] = ["formula", "mirror", "button"];

/**
 * Every field a message of `trigger` can use. Column labels are made unique (a column called
 * "Item Name" becomes "Item name (column)"), so each label maps back to exactly one token.
 */
export function slackMessageFieldsFor(trigger: CommunicationTrigger, columns: ColumnDef[]): SlackMessageFields {
  const general = GENERAL_FIELDS.filter((field) => !field.isAvailable || field.isAvailable(trigger)).map(({ token, label }) => ({ token, label }));
  const used_labels = new Set(GENERAL_FIELDS.map((field) => field.label.toLowerCase()));

  const column_fields = columns
    .filter((column) => /^\d+$/.test(column.id) && !VALUELESS_KINDS.includes(column.kind))
    .map((column) => {
      const title = column.title.replace(/[{}]/g, "").trim() || "Untitled column";
      let label = used_labels.has(title.toLowerCase()) ? `${title} (column)` : title;
      for (let copy = 2; used_labels.has(label.toLowerCase()); copy += 1) label = `${title} (${copy})`;
      used_labels.add(label.toLowerCase());
      return { token: `{column:${column.id}}`, label };
    });

  return { general, columns: column_fields };
}

const allFields = (fields: SlackMessageFields) => [...fields.general, ...fields.columns];

/** A stored message as the message box shows it, `{item_name}` becomes `{Item Name}`. Unknown tokens stay as typed. */
export function toDisplayMessage(message: string, fields: SlackMessageFields): string {
  const labels = new Map(allFields(fields).map((field) => [field.token, field.label]));
  return message.replace(/\{[^{}]+\}/g, (token) => {
    const label = labels.get(token);
    return label ? `{${label}}` : token;
  });
}

/** The message box text as the API stores it, `{Item Name}` becomes `{item_name}`. Labels are matched ignoring case. */
export function toStoredMessage(display: string, fields: SlackMessageFields): string {
  const tokens = new Map(allFields(fields).map((field) => [field.label.toLowerCase(), field.token]));
  return display.replace(/\{([^{}]+)\}/g, (match, label: string) => tokens.get(label.trim().toLowerCase()) ?? match);
}
