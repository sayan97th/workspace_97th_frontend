import { format, formatDistanceToNowStrict } from "date-fns";
import type { BoardAutomationActionType, BoardAutomationDto, BoardAutomationRunStatus, BoardAutomationTriggerType } from "@/types/board-automation";
import { COMMUNICATION_ACTION_TYPES } from "../../automations/communicationTemplates";

/** The three groups the Manage tab filters and labels automations by. */
export type AutomationKind = "email" | "slack" | "board";

export const AUTOMATION_KIND_LABELS: Record<AutomationKind, string> = {
  email: "Email",
  slack: "Slack",
  board: "Board action",
};

export const ACTION_LABELS: Record<BoardAutomationActionType, string> = {
  move_to_group: "Move item",
  notify_person: "Notify person",
  archive_item: "Archive item",
  set_column_value: "Change column",
  create_item: "Create item",
  send_email: "Send email",
  slack_notify_channel: "Slack channel post",
  slack_notify_person: "Slack message",
};

export const TRIGGER_LABELS: Record<BoardAutomationTriggerType, string> = {
  status_changed: "Status changes",
  date_arrived: "Date arrives",
  item_created: "Item created",
  subitem_created: "Subitem created",
  person_assigned: "Person assigned",
  column_changed: "Column changes",
  update_posted: "Update posted",
};

export const RUN_STATUS_LABELS: Record<BoardAutomationRunStatus, string> = {
  success: "Success",
  skipped: "Skipped",
  failed: "Failed",
};

export function automationKind(action_type: BoardAutomationActionType): AutomationKind {
  if (action_type === "send_email") return "email";
  if (COMMUNICATION_ACTION_TYPES.includes(action_type)) return "slack";
  return "board";
}

/** `Jan 5, 2026 3:04 PM`, or a dash when there is no date. */
export function formatDateTime(iso: string | null): string {
  return iso ? format(new Date(iso), "MMM d, yyyy h:mm a") : "-";
}

/** `3 hours ago`, or `Never` when it has not happened yet. */
export function formatRelativeTime(iso: string | null): string {
  return iso ? `${formatDistanceToNowStrict(new Date(iso))} ago` : "Never";
}

/** The list search and the CSV export both read an automation the same way, as its name plus its sentence. */
export function automationSearchText(automation: BoardAutomationDto, sentence: string): string {
  return `${automation.name ?? ""} ${sentence} ${ACTION_LABELS[automation.action_type]} ${AUTOMATION_KIND_LABELS[automationKind(automation.action_type)]}`.toLowerCase();
}
