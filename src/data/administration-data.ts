import type {
  AdminAuditLogEntry,
  AdminDepartment,
  AdminSession,
  AdminUserRole,
  AdminUserRow,
} from "@/components/administration/types";
import { TEAMS_ROSTER } from "./teams-data";

/** Role assigned to each seed user, keyed by the shared roster's person id. Everyone else defaults to "Member". */
const ROLE_BY_MEMBER_ID: Partial<Record<string, AdminUserRole>> = {
  josh: "Admin",
  blake: "Admin",
  sam: "Admin",
  jon: "Guest",
  danny: "Viewer",
};

/** Department assigned to each seed user, keyed by the shared roster's person id. Unlisted ids stay unassigned. */
const DEPARTMENT_BY_MEMBER_ID: Record<string, string> = {
  blake: "sales",
  brandon: "dev-product",
  rachel: "hr",
  sam: "it",
  haley: "finance",
  danny: "seo",
  mike: "design",
  jasmin: "marketing",
  nora: "design",
  owen: "marketing",
};

/**
 * Administration > User management seed rows. Reuses the app's one canonical people
 * roster ({@link TEAMS_ROSTER}) so a person's name, initials and avatar colour match
 * everywhere they appear (Teams, Trash "deleted by", and here).
 */
export const ADMIN_USERS: AdminUserRow[] = TEAMS_ROSTER.map((member) => ({
  person: member,
  email: member.email,
  role: ROLE_BY_MEMBER_ID[member.id] ?? "Member",
  department_id: DEPARTMENT_BY_MEMBER_ID[member.id] ?? null,
}));

export const ADMIN_ROLE_OPTIONS: AdminUserRole[] = ["Admin", "Member", "Guest", "Viewer"];

/** Administration > Departments seed rows. `reserved` is this department's slice of the account's license pool. */
export const ADMIN_DEPARTMENTS: AdminDepartment[] = [
  { id: "sales", name: "Sales", reserved: 8, assigned: 1, available: 7 },
  { id: "dev-product", name: "Dev/Product", reserved: 12, assigned: 1, available: 11 },
  { id: "hr", name: "HR", reserved: 3, assigned: 1, available: 2 },
  { id: "it", name: "IT", reserved: 4, assigned: 1, available: 3 },
  { id: "finance", name: "Finance", reserved: 3, assigned: 1, available: 2 },
  { id: "seo", name: "SEO", reserved: 6, assigned: 1, available: 5 },
  { id: "design", name: "Design", reserved: 5, assigned: 2, available: 3 },
  { id: "marketing", name: "Marketing", reserved: 7, assigned: 2, available: 5 },
];

/** Administration > Audit log seed rows. */
export const ADMIN_AUDIT_LOG: AdminAuditLogEntry[] = [
  { id: "audit-1", timestamp: "Jul 14, 9:12 AM", user_id: "josh", event: "Login", description: "Signed in successfully", ip: "204.14.87.2", browser: "Chrome", os: "macOS" },
  { id: "audit-2", timestamp: "Jul 14, 8:47 AM", user_id: "sam", event: "Settings", description: "Enabled two-factor authentication", ip: "204.14.87.9", browser: "Chrome", os: "Windows" },
  { id: "audit-3", timestamp: "Jul 13, 6:20 PM", user_id: "blake", event: "Login", description: "Signed in successfully", ip: "88.201.4.16", browser: "Safari", os: "macOS" },
  { id: "audit-4", timestamp: "Jul 13, 3:05 PM", user_id: "rachel", event: "User", description: "Deactivated Jon Mattingly", ip: "204.14.87.2", browser: "Chrome", os: "macOS" },
  { id: "audit-5", timestamp: "Jul 12, 11:40 AM", user_id: "josh", event: "Settings", description: "Updated the account logo", ip: "204.14.87.2", browser: "Chrome", os: "macOS" },
  { id: "audit-6", timestamp: "Jul 11, 4:58 PM", user_id: "sam", event: "Login failed", description: "Incorrect password, 2nd attempt", ip: "91.204.12.44", browser: "Edge", os: "Windows" },
];

export const ADMIN_AUDIT_EVENT_OPTIONS = ["All events", "Login", "Login failed", "Settings", "User"];

/** Administration > Active user sessions seed rows. */
export const ADMIN_SESSIONS: AdminSession[] = [
  { id: "session-1", user_id: "josh", device: "MacBook Pro — Chrome", location: "Provo, UT", ip: "204.14.87.2", last_usage: "Now", duration: "2h 10m" },
  { id: "session-2", user_id: "blake", device: "iPhone 15 — Safari", location: "Salt Lake City, UT", ip: "88.201.4.16", last_usage: "5 min ago", duration: "44m" },
  { id: "session-3", user_id: "sam", device: "Windows PC — Edge", location: "Provo, UT", ip: "204.14.87.9", last_usage: "1 hr ago", duration: "3h 02m" },
  { id: "session-4", user_id: "rachel", device: "MacBook Air — Chrome", location: "Provo, UT", ip: "204.14.87.4", last_usage: "3 hr ago", duration: "58m" },
];

/** Boards left ownerless (e.g. their owner was deactivated) shown in Administration > Board ownership. */
export const ADMIN_ORPHAN_BOARDS = [
  { id: "orphan-q4-renewals", name: "Q4 Renewals Tracker" },
  { id: "orphan-partner-rollout", name: "Partner Program Rollout" },
];

export const ADMIN_SESSION_INACTIVITY_OPTIONS = ["30 minutes", "1 hour", "4 hours", "1 day"];
export const ADMIN_SESSION_MAX_OPTIONS = ["8 hours", "1 day", "1 week", "30 days"];
export const ADMIN_DEFAULT_PRODUCT_OPTIONS = ["Work Management", "CRM", "Dev", "Service"];
