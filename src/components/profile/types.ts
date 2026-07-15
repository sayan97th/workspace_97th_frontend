/** Every page reachable from the My Profile modal's left nav. */
export type ProfileSectionId =
  | "personal"
  | "working"
  | "notifications"
  | "language"
  | "password"
  | "sessions";

/** One working-status choice (e.g. "In the office", "Out sick"). */
export type ProfileStatusOption = {
  key: string;
  label: string;
};

export type ProfileNotificationCategory =
  | "Communication"
  | "Collaboration"
  | "Agents"
  | "Automations"
  | "Requests"
  | "Sign-ups"
  | "Security";

/** Seed definition for one row of the Notifications preference table. */
export type ProfileNotificationSeed = {
  key: string;
  label: string;
  sub: string;
  category: ProfileNotificationCategory;
};

/** One row of the Notifications table after per-row app/email state has been merged in. */
export type ProfileNotificationRow = ProfileNotificationSeed & {
  show_header: boolean;
  app_on: boolean;
  email_on: boolean;
};

/** One row of the personal Session history table. */
export type ProfileSessionRow = {
  id: string;
  device: string;
  location: string;
  ip: string;
  last_usage: string;
  duration: string;
  is_current_device: boolean;
  can_logout: boolean;
};

export type ProfileTimeFormat = "12" | "24";
export type ProfileDateFormat = "long" | "euro";
export type ProfileFirstDayOfWeek = "sunday" | "monday";
