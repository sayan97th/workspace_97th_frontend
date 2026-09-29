import { format, formatDistanceToNowStrict } from "date-fns";
import type { BoardAutomationActionType, BoardAutomationDto, BoardAutomationRunStatus } from "@/types/board-automation";
import { COMMUNICATION_ACTION_TYPES } from "../../automations/communicationTemplates";
import { IMPORTANCE_LABELS } from "../../automations/builder/automationCatalog";

export { ACTION_LABELS, TRIGGER_LABELS } from "../../automations/builder/automationCatalog";

/** The three groups the Manage tab filters and labels automations by. */
export type AutomationKind = "email" | "slack" | "board";

export const AUTOMATION_KIND_LABELS: Record<AutomationKind, string> = {
  email: "Email",
  slack: "Slack",
  board: "Board action",
};

export const RUN_STATUS_LABELS: Record<BoardAutomationRunStatus, string> = {
  success: "Success",
  skipped: "Skipped",
  failed: "Failed",
};

/** Every action type of an automation, older rows only have `action_type`. */
export function automationActionTypes(automation: BoardAutomationDto): BoardAutomationActionType[] {
  return automation.actions?.length ? automation.actions.map((action) => action.type) : [automation.action_type];
}

/** Email when any action sends an email, Slack when any posts to Slack, otherwise a board action. */
export function automationKind(automation: BoardAutomationDto): AutomationKind {
  const types = automationActionTypes(automation);
  if (types.includes("send_email")) return "email";
  if (types.some((type) => COMMUNICATION_ACTION_TYPES.includes(type))) return "slack";
  return "board";
}

/** `Jan 5, 2026 3:04 PM`, or a dash when there is no date. */
export function formatDateTime(iso: string | null | undefined): string {
  return iso ? format(new Date(iso), "MMM d, yyyy h:mm a") : "-";
}

/** `3 hours ago`, or `Never` when it has not happened yet. */
export function formatRelativeTime(iso: string | null | undefined): string {
  return iso ? `${formatDistanceToNowStrict(new Date(iso))} ago` : "Never";
}

/** The list search and the CSV export both read an automation the same way, as its name, description and sentence. */
export function automationSearchText(automation: BoardAutomationDto, sentence: string): string {
  return [
    automation.name ?? "",
    automation.description ?? "",
    sentence,
    AUTOMATION_KIND_LABELS[automationKind(automation)],
    IMPORTANCE_LABELS[automation.importance ?? "minor"],
    automation.owner?.name ?? automation.created_by?.name ?? "",
  ]
    .join(" ")
    .toLowerCase();
}
