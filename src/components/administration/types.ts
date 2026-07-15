import type { BoardPersonOption } from "@/components/board";

/** Every page reachable from the Administration modal's left nav. */
export type AdminSectionId =
  | "profile"
  | "account"
  | "customization"
  | "branding"
  | "users"
  | "departments"
  | "board_ownership"
  | "automations_ownership"
  | "authentication"
  | "audit"
  | "advanced"
  | "sessions";

/** Which collapsible group of the left nav a given section lives under, if any. */
export type AdminNavGroupId = "customization" | "directory" | "security";

export type AdminUserRole = "Admin" | "Member" | "Guest" | "Viewer";

/** One row of the User management table. `person` reuses the app's canonical roster shape. */
export type AdminUserRow = {
  person: BoardPersonOption;
  email: string;
  role: AdminUserRole;
  /** References {@link AdminDepartment.id}, or null when the person hasn't been assigned yet. */
  department_id: string | null;
};

/** One row of the Departments table. */
export type AdminDepartment = {
  id: string;
  name: string;
  /** Seats reserved for this department out of the account's total license count. */
  reserved: number;
  assigned: number;
  available: number;
};

/** One row of the Audit log table. */
export type AdminAuditLogEntry = {
  id: string;
  timestamp: string;
  user_id: string;
  event: string;
  description: string;
  ip: string;
  browser: string;
  os: string;
};

/** One row of the active Sessions table. */
export type AdminSession = {
  id: string;
  user_id: string;
  device: string;
  location: string;
  ip: string;
  last_usage: string;
  duration: string;
};

export type { BoardPersonOption };
