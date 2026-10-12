/** Every page reachable from the Administration view's left rail. */
export type AdminSectionId =
  | "account"
  | "user_defaults"
  | "organization"
  | "profile_fields"
  | "users"
  | "teams"
  | "invitations"
  | "departments"
  | "board_ownership"
  | "authentication"
  | "sessions"
  | "audit"
  | "advanced"
  | "integrations"
  | "slack"
  | "usage"
  | "tidy_up"
  | "content_directory"
  | "permissions";

/** Which collapsible group of the left rail a given section lives under, if any. */
export type AdminNavGroupId = "general" | "customization" | "directory" | "security" | "connections";
