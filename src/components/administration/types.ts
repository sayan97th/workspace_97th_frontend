/** Every page reachable from the Administration view's left rail. */
export type AdminSectionId =
  | "profile"
  | "account"
  | "integrations"
  | "customization"
  | "branding"
  | "users"
  | "departments"
  | "board_ownership"
  | "authentication"
  | "audit"
  | "advanced"
  | "sessions";

/** Which collapsible group of the left rail a given section lives under, if any. */
export type AdminNavGroupId = "customization" | "directory" | "security";
