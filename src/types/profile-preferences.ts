/**
 * API types for the My Profile sections backed by `PATCH /api/profile/*`:
 * Working status, Notifications, Language & region, and Session history.
 * These mirror the Laravel `ProfileResource` payload and its new preference
 * form-request shapes.
 */

import type { ProfileResponse } from "./auth";

export type WorkingStatusPayload = {
  working_status?: string | null;
  working_status_dates?: string | null;
  disable_notifications_while_away?: boolean;
  hide_online_status?: boolean;
};

export type NotificationPreferencesPayload = {
  preferences?: Record<string, boolean>;
  desktop_notifications_enabled?: boolean;
};

export type LocalePreferencesPayload = {
  language?: string | null;
  timezone?: string | null;
  time_format?: "12" | "24";
  date_format?: "long" | "euro";
  first_day_of_week?: "sunday" | "monday";
};

/** Common envelope returned by every `PATCH /api/profile/*` preference endpoint. */
export type UpdatePreferencesResponse = {
  message: string;
  user: ProfileResponse;
};

export type UserSessionDto = {
  id: string;
  device: string;
  ip: string | null;
  last_used_at: string;
  is_current_device: boolean;
  can_logout: boolean;
};
