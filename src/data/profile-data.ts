import type {
  ProfileNotificationSeed,
  ProfileStatusOption,
} from "@/components/profile/types";

/** My Profile > Working status — the status choices shown in the picker grid. */
export const PROFILE_STATUS_OPTIONS: ProfileStatusOption[] = [
  { key: "office", label: "In the office" },
  { key: "wfh", label: "Working from home" },
  { key: "sick", label: "Out sick" },
  { key: "break", label: "On break" },
  { key: "ooo", label: "Out of office" },
  { key: "outside", label: "Working outside" },
  { key: "family", label: "Family time" },
];

/** My Profile > Notifications — every notification preference, grouped by category. */
export const PROFILE_NOTIFICATION_SEED: ProfileNotificationSeed[] = [
  { key: "mentioned", label: "Mentioned me", sub: "in an update or reply", category: "Communication" },
  { key: "wrote_own", label: "Wrote an update", sub: "on an item I own", category: "Communication" },
  { key: "wrote_sub", label: "Wrote an update", sub: "on an item I'm subscribed to", category: "Communication" },
  { key: "replied_thread", label: "Replied", sub: "to a thread I commented on or reacted to", category: "Communication" },
  { key: "replied_update", label: "Replied", sub: "to an update I wrote", category: "Communication" },
  { key: "reactions", label: "Reactions", sub: "to my update", category: "Communication" },
  { key: "assigned", label: "Assigned me", sub: "to an item", category: "Collaboration" },
  { key: "invitations", label: "Invitations", sub: "to workspace, board, doc, item, or team", category: "Collaboration" },
  { key: "template_changes", label: "Template changes", sub: "by the template owner", category: "Collaboration" },
  { key: "agent_failures", label: "Agent failures", sub: "when an agent doesn't run as expected", category: "Agents" },
  { key: "automations_notify", label: 'Automations with a "notify" step', sub: 'this does not include "send an email" automations', category: "Automations" },
  { key: "automation_failures", label: "Automation failures", sub: "when automations don't run as expected", category: "Automations" },
  { key: "platform_api", label: "Platform API", sub: "custom notifications using the GraphQL API", category: "Automations" },
  { key: "requests_access", label: "Requests access", sub: "to boards & dashboards", category: "Requests" },
  { key: "requests_install", label: "Requests installation", sub: "to install & purchase apps", category: "Requests" },
  { key: "signed_up", label: "Signed up", sub: "after I have invited them", category: "Sign-ups" },
  { key: "not_signed_up", label: "Didn't sign up", sub: "after I have invited them", category: "Sign-ups" },
  { key: "violation_summaries", label: "Violation summaries", sub: "for breaching DLP policies", category: "Security" },
  { key: "file_deleted", label: "File has been deleted", sub: "for breaching data policies", category: "Security" },
  { key: "update_deleted", label: "Update has been deleted or redacted", sub: "for breaching data policies", category: "Security" },
];
