import type {
  ProfileNotificationSeed,
  ProfileSessionRow,
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

/** My Profile > Session history — seed rows for the signed-in devices list. */
export const PROFILE_SESSIONS_SEED: ProfileSessionRow[] = [
  { id: "1", device: "Generic Linux · Chrome", location: "Lehi, Utah, US", ip: "192.168.1.42", last_usage: "Jul 12, 2026", duration: "5 minutes ago", is_current_device: true, can_logout: false },
  { id: "2", device: "Mac · Chrome", location: "Salt Lake City, Utah, US", ip: "192.184.3.19", last_usage: "Jun 22, 2026", duration: "20 days ago", is_current_device: false, can_logout: true },
  { id: "3", device: "Generic Linux · Chrome", location: "Lehi, Utah, US", ip: "2800:b20:1116:be4::1", last_usage: "Sep 05, 2025", duration: "10 months ago", is_current_device: false, can_logout: true },
  { id: "4", device: "Mac · Chrome", location: "Kissimmee, Florida, US", ip: "2603:9001:8300:115c::2", last_usage: "Feb 25, 2025", duration: "a year ago", is_current_device: false, can_logout: true },
  { id: "5", device: "Windows · Chrome", location: "Salt Lake City, Utah, US", ip: "192.184.3.19", last_usage: "Jan 22, 2025", duration: "a year ago", is_current_device: false, can_logout: true },
  { id: "6", device: "Generic Linux · Chrome", location: "Provo, Utah, US", ip: "2800:b20:1116:10d2::4", last_usage: "Feb 20, 2025", duration: "a year ago", is_current_device: false, can_logout: true },
];
