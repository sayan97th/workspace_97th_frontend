import { format, formatDistanceToNowStrict } from "date-fns";
import type { BoardAutomationActionType, BoardAutomationDto, BoardAutomationRunStatus, BoardAutomationSource } from "@/types/board-automation";
import { IMPORTANCE_LABELS, isIntegrationDefinition } from "../../automations/builder/automationCatalog";

export { ACTION_LABELS, TRIGGER_LABELS } from "../../automations/builder/automationCatalog";

/**
 * The groups the Manage tab filters and labels automations by. A board automation stays inside the
 * app and lives in the Automations dialog, every other kind reaches an outside app and lives in the
 * Integrations dialog.
 */
export type AutomationKind = "board" | "email" | "slack" | "calendar";

export const AUTOMATION_KIND_LABELS: Record<AutomationKind, string> = {
  board: "Board automation",
  email: "Email",
  slack: "Slack",
  calendar: "Google Calendar",
};

/** Which dialog lists the automation: Automations (`board`) or Integrations (`integrations`). Mirrors the API's `BoardAutomation::isIntegration()`. */
export const automationSource = (automation: BoardAutomationDto): BoardAutomationSource => (isIntegrationDefinition(automation) ? "integrations" : "board");

export const RUN_STATUS_LABELS: Record<BoardAutomationRunStatus, string> = {
  success: "Success",
  skipped: "Skipped",
  failed: "Failed",
};

/** Every action type of an automation, older rows only have `action_type`. */
export function automationActionTypes(automation: BoardAutomationDto): BoardAutomationActionType[] {
  return automation.actions?.length ? automation.actions.map((action) => action.type) : [automation.action_type];
}

/**
 * Email when it reads an inbox or any action emails someone, Slack when any action posts to Slack,
 * Google Calendar when it syncs events, otherwise a board automation.
 */
export function automationKind(automation: BoardAutomationDto): AutomationKind {
  const types = [...automationActionTypes(automation), ...(automation.else_actions ?? []).map((action) => action.type)];
  if (automation.trigger_type === "email_received" || types.includes("send_email") || types.includes("send_digest")) return "email";
  if (types.some((type) => type === "slack_notify_channel" || type === "slack_notify_person")) return "slack";
  if (types.includes("google_calendar_sync")) return "calendar";
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
