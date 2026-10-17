import React from "react";
import {
  Archive,
  ArrowRight,
  Bell,
  CalendarDays,
  Columns2,
  Copy,
  FilePlus2,
  ListOrdered,
  MessageSquarePlus,
  PanelTop,
  Rows3,
  SquareStack,
  SquareX,
  Timer,
  TimerOff,
  Trash2,
  User,
  UserRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { BoardAutomationActionParams } from "@/types/board-automation";
import { actionFromPicker, type ActionDraft, type ConditionDraft } from "./builderDraft";
import ExternalAppLogo from "@/components/integrations/ExternalAppLogo";
import SlackLogo from "@/components/slack/SlackLogo";
import { ActionOutlineIcon } from "./actionIcons";
import { ACTIONS, CONDITION_KIND_BY_COLUMN, INTEGRATION_ACTION_TYPES, conditionOperatorOptions, type ActionPickerId, type AutomationBuilderContext } from "./automationCatalog";
import type { PickerEntry } from "./builderUi";

/**
 * The menus of the Button column's automation builder, laid out like monday's: the "Then do this"
 * action menu grouped as Most used, Assign, Date and time, Featured and Item, then every other
 * action, and the "and only if..." condition menu. Entries are presets of the regular actions and
 * conditions, so whatever is picked is edited with the same sentence tokens afterwards. No AI entries.
 */

export type ButtonActionEntry = {
  id: string;
  label: string;
  section: string;
  picker_id: ActionPickerId;
  /** Applied over the action's defaults, e.g. replace instead of add an assignee. */
  params?: BoardAutomationActionParams;
  icon: React.ReactNode;
};

const lucide = (Icon: LucideIcon) => <Icon size={16} strokeWidth={1.7} className="flex-none text-boardtree-text-secondary" aria-hidden="true" />;

const CURATED_ACTIONS: ButtonActionEntry[] = [
  { id: "set_column_value", label: "Change column value", section: "Most used", picker_id: "set_column_value", icon: lucide(Columns2) },
  { id: "notify_person", label: "Notify someone", section: "Most used", picker_id: "notify_person", icon: lucide(Bell) },
  { id: "set_date", label: "Set date", section: "Most used", picker_id: "set_date", icon: lucide(CalendarDays) },
  { id: "change_status", label: "Change status", section: "Most used", picker_id: "change_status", icon: lucide(Rows3) },
  { id: "move_to_group", label: "Move item to group", section: "Most used", picker_id: "move_to_group", icon: lucide(ArrowRight) },
  { id: "create_subitem", label: "Create Subitem", section: "Most used", picker_id: "create_subitem", icon: lucide(Workflow) },

  { id: "replace_assignee", label: "Replace assignee", section: "Assign", picker_id: "assign_person", params: { assign_mode: "user", replace: true }, icon: lucide(UserRound) },
  { id: "add_assignee", label: "Add assignee", section: "Assign", picker_id: "assign_person", params: { assign_mode: "user", replace: false }, icon: lucide(UserRound) },
  { id: "assign_creator", label: "Assign item creator", section: "Assign", picker_id: "assign_person", params: { assign_mode: "creator", user_id: null }, icon: lucide(UserRound) },
  { id: "unassign_people", label: "Clear assignees", section: "Assign", picker_id: "unassign_people", icon: lucide(UserRound) },
  { id: "assign_round_robin", label: "Assign in turn", section: "Assign", picker_id: "assign_round_robin", icon: lucide(User) },

  { id: "start_time_tracking", label: "Start time tracking", section: "Date and time", picker_id: "time_tracking", params: { mode: "start" }, icon: lucide(Timer) },
  { id: "shift_date", label: "Push date", section: "Date and time", picker_id: "shift_date", icon: lucide(CalendarDays) },
  { id: "stop_time_tracking", label: "Stop time tracking", section: "Date and time", picker_id: "time_tracking", params: { mode: "stop" }, icon: lucide(TimerOff) },

  { id: "gmail_send_email", label: "Send email", section: "Featured", picker_id: "send_email", icon: <ExternalAppLogo app="gmail" size={16} /> },
  { id: "outlook_send_email", label: "Send email", section: "Featured", picker_id: "send_email", icon: <ExternalAppLogo app="outlook" size={16} /> },
  { id: "slack_notify_channel", label: "Notify in channel", section: "Featured", picker_id: "slack_notify_channel", icon: <SlackLogo size={16} /> },
  { id: "slack_notify_person", label: "Notify users", section: "Featured", picker_id: "slack_notify_person", icon: <SlackLogo size={16} /> },

  { id: "create_item", label: "Create item in board", section: "Item", picker_id: "create_item", icon: lucide(FilePlus2) },
  { id: "post_update", label: "Create update", section: "Item", picker_id: "post_update", icon: lucide(MessageSquarePlus) },
  { id: "move_to_board", label: "Move item to board", section: "Item", picker_id: "move_to_board", icon: lucide(ArrowRight) },
  { id: "clear_column", label: "Clear column value", section: "Item", picker_id: "clear_column", icon: lucide(SquareX) },
  { id: "archive_item", label: "Archive item", section: "Item", picker_id: "archive_item", icon: lucide(Archive) },
  { id: "delete_item", label: "Delete item", section: "Item", picker_id: "delete_item", icon: lucide(Trash2) },
  { id: "duplicate_item", label: "Duplicate item", section: "Item", picker_id: "duplicate_item", icon: lucide(Copy) },
  { id: "rename_item", label: "Rename item", section: "Item", picker_id: "rename_item", icon: lucide(PanelTop) },
  { id: "move_item_position", label: "Move item to top or bottom", section: "Item", picker_id: "move_item_position", icon: lucide(ListOrdered) },
];

/** Sections the remaining actions keep from the regular catalog, renamed to read like monday's. */
const REMAINING_SECTION_TITLES: Record<string, string> = {
  Subitems: "Subitems",
  Columns: "Columns",
  Dates: "Date and time",
  Groups: "Groups",
  People: "Assign",
  Notifications: "Notifications",
  "Email and Slack": "Featured",
  "Other boards": "Other boards",
  Flow: "Flow",
  Webhooks: "Webhooks",
  Integrations: "Integrations",
  Items: "Item",
};

const SECTION_ORDER = ["Most used", "Assign", "Date and time", "Featured", "Item", "Subitems", "Columns", "Groups", "Notifications", "Other boards", "Flow", "Webhooks", "Integrations"];

const SLACK_PICKER_IDS: ActionPickerId[] = ["slack_notify_channel", "slack_notify_person"];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const isIntegrationPicker = (picker_id: ActionPickerId): boolean => {
  const type = ACTIONS.find((action) => action.id === picker_id)?.type;
  return type !== undefined && INTEGRATION_ACTION_TYPES.includes(type);
};

/**
 * Every entry of the "Then do this" menu, grouped and ordered like monday's. Slack entries need a
 * connected workspace, and the Automations dialog (`allow_integrations` false) leaves out every
 * email, Slack and Google Calendar entry.
 */
export function buttonActionEntries(is_slack_connected: boolean, allow_integrations = true): ButtonActionEntry[] {
  const curated_ids = new Set(CURATED_ACTIONS.map((entry) => entry.picker_id));
  const remaining = ACTIONS.filter((action) => !curated_ids.has(action.id) && action.section !== "Most used").map(
    (action): ButtonActionEntry => ({
      id: action.id,
      label: capitalize(action.label),
      section: REMAINING_SECTION_TITLES[action.section] ?? action.section,
      picker_id: action.id,
      icon: <ActionOutlineIcon id={action.id} />,
    })
  );
  return [...CURATED_ACTIONS, ...remaining]
    .filter((entry) => is_slack_connected || !SLACK_PICKER_IDS.includes(entry.picker_id))
    .filter((entry) => allow_integrations || !isIntegrationPicker(entry.picker_id))
    .sort((a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section));
}

/** The same entries as picker sections. */
export function buttonActionSections(is_slack_connected: boolean, allow_integrations = true): { title: string; entries: PickerEntry<string>[] }[] {
  const sections: { title: string; entries: PickerEntry<string>[] }[] = [];
  for (const entry of buttonActionEntries(is_slack_connected, allow_integrations)) {
    let section = sections.find((candidate) => candidate.title === entry.section);
    if (!section) {
      section = { title: entry.section, entries: [] };
      sections.push(section);
    }
    section.entries.push({ id: entry.id, label: entry.label, leading: entry.icon });
  }
  return sections;
}

/** The action a menu entry starts, its preset applied over the action's defaults. */
export function actionFromButtonEntry(entry_id: string, context: AutomationBuilderContext, key?: string): ActionDraft | null {
  const entry = buttonActionEntries(true).find((candidate) => candidate.id === entry_id);
  if (!entry) return null;
  const action = actionFromPicker(entry.picker_id, context, key);
  return entry.params ? { ...action, params: { ...action.params, ...entry.params } } : action;
}

/** The menu entry an action was made from, for the menu's highlight. */
export function buttonEntryIdOf(action: ActionDraft): string | null {
  if (!action.picker_id) return null;
  const candidates = buttonActionEntries(true).filter((entry) => entry.picker_id === action.picker_id);
  const exact = candidates.find((entry) => entry.params && Object.entries(entry.params).every(([key, value]) => action.params[key as keyof BoardAutomationActionParams] === value));
  return (exact ?? candidates[0])?.id ?? null;
}

// ── Conditions ────────────────────────────────────────────────────────────────

export type ButtonConditionEntry = {
  id: "group" | "person" | "number" | "dropdown" | "status" | "empty";
  label: string;
  icon: React.ReactNode;
};

export const BUTTON_CONDITION_ENTRIES: ButtonConditionEntry[] = [
  { id: "group", label: "If item is in group", icon: lucide(PanelTop) },
  { id: "person", label: "If person is someone", icon: lucide(User) },
  { id: "number", label: "If number meets condition", icon: lucide(ListOrdered) },
  { id: "dropdown", label: "If dropdown meets condition", icon: lucide(SquareStack) },
  { id: "status", label: "If status is something", icon: lucide(Rows3) },
  { id: "empty", label: "If column is empty", icon: lucide(Columns2) },
];

/**
 * The condition a menu entry starts, pointed at the first fitting column of the board, or null when
 * the board has none (the entry then says which column to add). The sentence tokens can change the
 * column afterwards.
 */
export function conditionFromEntry(entry_id: ButtonConditionEntry["id"], context: AutomationBuilderContext): Pick<ConditionDraft, "column_id" | "condition"> | null {
  const item_columns = context.columns.filter((column) => column.scope === "item");
  const first = (kinds: string[]) => item_columns.find((column) => kinds.includes(column.kind));
  const withDefault = (column_id: string | undefined, kind: Parameters<typeof conditionOperatorOptions>[0]) =>
    column_id ? { column_id, condition: conditionOperatorOptions(kind)[0].id } : null;

  switch (entry_id) {
    case "group":
      return withDefault("__group__", "group");
    case "person":
      return withDefault(first(["people"])?.id ?? "__actor__", "people");
    case "number":
      return withDefault(first(["number"])?.id, "number");
    case "dropdown":
      return withDefault(first(["dropdown"])?.id, "option");
    case "status":
      return withDefault(first(["status", "label"])?.id, "option");
    case "empty": {
      const column = item_columns.find((candidate) => {
        const kind = CONDITION_KIND_BY_COLUMN[candidate.kind];
        return kind ? conditionOperatorOptions(kind).some((operator) => operator.id === "is_empty") : false;
      });
      return column ? { column_id: column.id, condition: "is_empty" } : null;
    }
  }
}

/** Why a condition entry is unavailable on this board. */
export const CONDITION_ENTRY_NEEDS: Partial<Record<ButtonConditionEntry["id"], string>> = {
  number: "Add a Numbers column first",
  dropdown: "Add a Dropdown column first",
  status: "Add a Status column first",
  empty: "Add a column first",
};
