"use client";
import { useMemo, useState } from "react";
import {
  PROFILE_NOTIFICATION_SEED,
  PROFILE_SESSIONS_SEED,
  PROFILE_STATUS_OPTIONS,
} from "@/data/profile-data";
import type {
  ProfileDateFormat,
  ProfileFirstDayOfWeek,
  ProfileNotificationRow,
  ProfileSectionId,
  ProfileSessionRow,
  ProfileStatusOption,
  ProfileTimeFormat,
} from "./types";

export type ProfileManagerApi = {
  // ── Left nav ──────────────────────────────────────────────────────────
  active_section: ProfileSectionId;
  selectSection: (id: ProfileSectionId) => void;

  // ── Working status ───────────────────────────────────────────────────
  status_options: ProfileStatusOption[];
  working_status: string;
  setWorkingStatus: (key: string) => void;
  status_dates: string;
  setStatusDates: (value: string) => void;
  disable_notifications_while_away: boolean;
  toggleDisableNotificationsWhileAway: () => void;
  hide_online_status: boolean;
  toggleHideOnlineStatus: () => void;

  // ── Notifications ─────────────────────────────────────────────────────
  notification_rows: ProfileNotificationRow[];
  toggleNotificationApp: (key: string) => void;
  toggleNotificationEmail: (key: string) => void;
  is_desktop_banner_dismissed: boolean;
  dismissDesktopBanner: () => void;
  desktop_notifications_enabled: boolean;
  toggleDesktopNotifications: () => void;
  is_muted_boards_expanded: boolean;
  toggleMutedBoardsExpanded: () => void;

  // ── Language & region ────────────────────────────────────────────────
  language: string;
  setLanguage: (value: string) => void;
  region_timezone: string;
  setRegionTimezone: (value: string) => void;
  time_format: ProfileTimeFormat;
  setTimeFormat: (value: ProfileTimeFormat) => void;
  date_format: ProfileDateFormat;
  setDateFormat: (value: ProfileDateFormat) => void;
  first_day_of_week: ProfileFirstDayOfWeek;
  setFirstDayOfWeek: (value: ProfileFirstDayOfWeek) => void;

  // ── Session history ───────────────────────────────────────────────────
  session_rows: ProfileSessionRow[];
  logoutSession: (id: string) => void;
};

const DEFAULT_NOTIFICATION_PREFS: Record<string, boolean> = {
  mentioned_app: true,
  mentioned_email: true,
  wrote_own_app: true,
  wrote_own_email: false,
  wrote_sub_app: true,
  wrote_sub_email: false,
  replied_thread_app: true,
  replied_thread_email: false,
  replied_update_app: true,
  replied_update_email: true,
  reactions_app: true,
  reactions_email: false,
  assigned_app: true,
  assigned_email: true,
  invitations_app: true,
  invitations_email: true,
  template_changes_app: false,
  template_changes_email: false,
  agent_failures_app: true,
  agent_failures_email: true,
  automations_notify_app: true,
  automations_notify_email: false,
  automation_failures_app: true,
  automation_failures_email: true,
  platform_api_app: false,
  platform_api_email: false,
  requests_access_app: true,
  requests_access_email: true,
  requests_install_app: true,
  requests_install_email: false,
  signed_up_app: true,
  signed_up_email: false,
  not_signed_up_app: false,
  not_signed_up_email: false,
  violation_summaries_app: true,
  violation_summaries_email: true,
  file_deleted_app: true,
  file_deleted_email: true,
  update_deleted_app: true,
  update_deleted_email: true,
};

/**
 * Owns all My Profile modal state behind one config-in/API-out hook, the same shape as
 * {@link useAdministrationManager} — so {@link ProfileModal} and its section panels stay
 * presentational. Personal info, password and two-factor auth already have real backend
 * wiring (see {@link ProfileForm}, {@link ChangePasswordSection}, {@link TwoFactorSection})
 * and are left to manage themselves; the sections driven by this hook (working status,
 * notifications, language & region, session history) don't have an API yet, so writes here
 * just update local state — mirroring how the Administration modal mocks its own sections.
 */
export function useProfileManager(): ProfileManagerApi {
  const [active_section, setActiveSection] = useState<ProfileSectionId>("personal");

  // ── Working status ───────────────────────────────────────────────────
  const [working_status, setWorkingStatus] = useState("office");
  const [status_dates, setStatusDates] = useState("");
  const [disable_notifications_while_away, setDisableNotificationsWhileAway] = useState(false);
  const [hide_online_status, setHideOnlineStatus] = useState(false);

  // ── Notifications ─────────────────────────────────────────────────────
  const [notification_prefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);
  const [is_desktop_banner_dismissed, setIsDesktopBannerDismissed] = useState(false);
  const [desktop_notifications_enabled, setDesktopNotificationsEnabled] = useState(false);
  const [is_muted_boards_expanded, setIsMutedBoardsExpanded] = useState(false);

  const notification_rows: ProfileNotificationRow[] = useMemo(() => {
    let previous_category: string | null = null;
    return PROFILE_NOTIFICATION_SEED.map((seed) => {
      const show_header = seed.category !== previous_category;
      previous_category = seed.category;
      return {
        ...seed,
        show_header,
        app_on: !!notification_prefs[`${seed.key}_app`],
        email_on: !!notification_prefs[`${seed.key}_email`],
      };
    });
  }, [notification_prefs]);

  const toggleNotificationApp = (key: string) =>
    setNotificationPrefs((current) => ({ ...current, [`${key}_app`]: !current[`${key}_app`] }));
  const toggleNotificationEmail = (key: string) =>
    setNotificationPrefs((current) => ({ ...current, [`${key}_email`]: !current[`${key}_email`] }));

  // ── Language & region ────────────────────────────────────────────────
  const [language, setLanguage] = useState("en");
  const [region_timezone, setRegionTimezone] = useState("mt");
  const [time_format, setTimeFormat] = useState<ProfileTimeFormat>("12");
  const [date_format, setDateFormat] = useState<ProfileDateFormat>("long");
  const [first_day_of_week, setFirstDayOfWeek] = useState<ProfileFirstDayOfWeek>("sunday");

  // ── Session history ───────────────────────────────────────────────────
  const [logged_out_session_ids, setLoggedOutSessionIds] = useState<string[]>([]);
  const session_rows = PROFILE_SESSIONS_SEED.filter((row) => !logged_out_session_ids.includes(row.id));
  const logoutSession = (id: string) =>
    setLoggedOutSessionIds((current) => [...current, id]);

  return {
    active_section,
    selectSection: setActiveSection,

    status_options: PROFILE_STATUS_OPTIONS,
    working_status,
    setWorkingStatus,
    status_dates,
    setStatusDates,
    disable_notifications_while_away,
    toggleDisableNotificationsWhileAway: () => setDisableNotificationsWhileAway((current) => !current),
    hide_online_status,
    toggleHideOnlineStatus: () => setHideOnlineStatus((current) => !current),

    notification_rows,
    toggleNotificationApp,
    toggleNotificationEmail,
    is_desktop_banner_dismissed,
    dismissDesktopBanner: () => setIsDesktopBannerDismissed(true),
    desktop_notifications_enabled,
    toggleDesktopNotifications: () => setDesktopNotificationsEnabled((current) => !current),
    is_muted_boards_expanded,
    toggleMutedBoardsExpanded: () => setIsMutedBoardsExpanded((current) => !current),

    language,
    setLanguage,
    region_timezone,
    setRegionTimezone,
    time_format,
    setTimeFormat,
    date_format,
    setDateFormat,
    first_day_of_week,
    setFirstDayOfWeek,

    session_rows,
    logoutSession,
  };
}
