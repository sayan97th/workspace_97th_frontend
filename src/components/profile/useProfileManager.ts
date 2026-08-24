"use client";
import { useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { apiErrorMessage, profilePreferencesService } from "@/services/profile-preferences.service";
import { PROFILE_NOTIFICATION_SEED, PROFILE_STATUS_OPTIONS } from "@/data/profile-data";
import type { UserSessionDto } from "@/types/profile-preferences";
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

  /** Set when a preference save fails; shown as a banner above the active section. */
  preferences_error: string | null;

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
  is_loading_sessions: boolean;
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

const DEBOUNCE_MS = 600;

function toSessionRow(dto: UserSessionDto): ProfileSessionRow {
  const parsed = new Date(dto.last_used_at);
  return {
    id: dto.id,
    device: dto.device,
    ip: dto.ip,
    last_usage: format(parsed, "MMM d, yyyy"),
    duration: formatDistanceToNow(parsed, { addSuffix: true }),
    is_current_device: dto.is_current_device,
    can_logout: dto.can_logout,
  };
}

/**
 * Owns all My Profile modal state behind one config-in/API-out hook, the same shape as the
 * Administration view's per-section `use<Section>Manager` hooks, so {@link ProfileView} and
 * its section panels stay presentational. Personal info, password and two-factor auth manage their own real-API
 * wiring (see {@link ProfileForm}, {@link ChangePasswordSection}, {@link TwoFactorSection}).
 * The sections driven by this hook (working status, notifications, language & region,
 * session history) are backed by `PATCH /api/profile/*`: every setter optimistically
 * updates local state and persists in the background, reverting + surfacing
 * {@link preferences_error} on failure.
 */
export function useProfileManager(): ProfileManagerApi {
  const { user, refreshUser } = useAuth();
  const [active_section, setActiveSection] = useState<ProfileSectionId>("personal");
  const [preferences_error, setPreferencesError] = useState<string | null>(null);

  // ── Working status ───────────────────────────────────────────────────
  const [working_status, setWorkingStatusValue] = useState("office");
  const [status_dates, setStatusDatesValue] = useState("");
  const [disable_notifications_while_away, setDisableNotificationsWhileAwayValue] = useState(false);
  const [hide_online_status, setHideOnlineStatusValue] = useState(false);
  const status_dates_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Notifications ─────────────────────────────────────────────────────
  const [notification_prefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);
  const [is_desktop_banner_dismissed, setIsDesktopBannerDismissed] = useState(false);
  const [desktop_notifications_enabled, setDesktopNotificationsEnabledValue] = useState(false);
  const [is_muted_boards_expanded, setIsMutedBoardsExpanded] = useState(false);

  // ── Language & region ────────────────────────────────────────────────
  const [language, setLanguageValue] = useState("en");
  const [region_timezone, setRegionTimezoneValue] = useState("");
  const [time_format, setTimeFormatValue] = useState<ProfileTimeFormat>("12");
  const [date_format, setDateFormatValue] = useState<ProfileDateFormat>("long");
  const [first_day_of_week, setFirstDayOfWeekValue] = useState<ProfileFirstDayOfWeek>("sunday");

  // ── Session history ───────────────────────────────────────────────────
  const [session_rows, setSessionRows] = useState<ProfileSessionRow[]>([]);
  const [is_loading_sessions, setIsLoadingSessions] = useState(true);

  // Hydrate every section's local state from the already-fetched AuthContext user —
  // no extra GET needed, ProfileResource now includes all of this in one payload.
  useEffect(() => {
    if (!user) return;
    setWorkingStatusValue(user.working_status ?? "office");
    setStatusDatesValue(user.working_status_dates ?? "");
    setDisableNotificationsWhileAwayValue(user.disable_notifications_while_away);
    setHideOnlineStatusValue(user.hide_online_status);
    setNotificationPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...(user.notification_preferences ?? {}) });
    setDesktopNotificationsEnabledValue(user.desktop_notifications_enabled);
    setLanguageValue(user.language ?? "en");
    setRegionTimezoneValue(user.timezone ?? "");
    setTimeFormatValue(user.time_format ?? "12");
    setDateFormatValue(user.date_format ?? "long");
    setFirstDayOfWeekValue(user.first_day_of_week ?? "sunday");
  }, [user]);

  // Fetch Session history once on mount — its own endpoint, not part of the profile payload.
  useEffect(() => {
    let cancelled = false;
    profilePreferencesService
      .fetchSessions()
      .then((rows) => {
        if (!cancelled) setSessionRows(rows.map(toSessionRow));
      })
      .catch((error) => {
        if (!cancelled) setPreferencesError(apiErrorMessage(error, "Failed to load session history."));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSessions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (status_dates_timeout_ref.current) clearTimeout(status_dates_timeout_ref.current);
    };
  }, []);

  const notification_rows: ProfileNotificationRow[] = (() => {
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
  })();

  // ── Working status persistence ──────────────────────────────────────────

  const saveWorkingStatus = async (payload: Parameters<typeof profilePreferencesService.updateWorkingStatus>[0]) => {
    try {
      await profilePreferencesService.updateWorkingStatus(payload);
      await refreshUser();
    } catch (error) {
      setPreferencesError(apiErrorMessage(error, "Failed to save working status."));
    }
  };

  const setWorkingStatus = (key: string) => {
    setWorkingStatusValue(key);
    void saveWorkingStatus({ working_status: key });
  };

  const setStatusDates = (value: string) => {
    setStatusDatesValue(value);
    if (status_dates_timeout_ref.current) clearTimeout(status_dates_timeout_ref.current);
    status_dates_timeout_ref.current = setTimeout(() => {
      void saveWorkingStatus({ working_status_dates: value || null });
    }, DEBOUNCE_MS);
  };

  const toggleDisableNotificationsWhileAway = () => {
    const next_value = !disable_notifications_while_away;
    setDisableNotificationsWhileAwayValue(next_value);
    void saveWorkingStatus({ disable_notifications_while_away: next_value });
  };

  const toggleHideOnlineStatus = () => {
    const next_value = !hide_online_status;
    setHideOnlineStatusValue(next_value);
    void saveWorkingStatus({ hide_online_status: next_value });
  };

  // ── Notification persistence ────────────────────────────────────────────

  const saveNotificationPreferences = async (
    payload: Parameters<typeof profilePreferencesService.updateNotificationPreferences>[0],
  ) => {
    try {
      await profilePreferencesService.updateNotificationPreferences(payload);
      await refreshUser();
    } catch (error) {
      setPreferencesError(apiErrorMessage(error, "Failed to save notification preferences."));
    }
  };

  const toggleNotificationChannel = (key: string, channel: "app" | "email") => {
    const preference_key = `${key}_${channel}`;
    const next_value = !notification_prefs[preference_key];
    setNotificationPrefs((current) => ({ ...current, [preference_key]: next_value }));
    void saveNotificationPreferences({ preferences: { [preference_key]: next_value } });
  };

  const toggleNotificationApp = (key: string) => toggleNotificationChannel(key, "app");
  const toggleNotificationEmail = (key: string) => toggleNotificationChannel(key, "email");

  const toggleDesktopNotifications = () => {
    const next_value = !desktop_notifications_enabled;
    setDesktopNotificationsEnabledValue(next_value);
    void saveNotificationPreferences({ desktop_notifications_enabled: next_value });
  };

  // ── Language & region persistence ───────────────────────────────────────

  const saveLocalePreferences = async (payload: Parameters<typeof profilePreferencesService.updateLocalePreferences>[0]) => {
    try {
      await profilePreferencesService.updateLocalePreferences(payload);
      await refreshUser();
    } catch (error) {
      setPreferencesError(apiErrorMessage(error, "Failed to save language & region preferences."));
    }
  };

  const setLanguage = (value: string) => {
    setLanguageValue(value);
    void saveLocalePreferences({ language: value });
  };

  const setRegionTimezone = (value: string) => {
    setRegionTimezoneValue(value);
    void saveLocalePreferences({ timezone: value });
  };

  const setTimeFormat = (value: ProfileTimeFormat) => {
    setTimeFormatValue(value);
    void saveLocalePreferences({ time_format: value });
  };

  const setDateFormat = (value: ProfileDateFormat) => {
    setDateFormatValue(value);
    void saveLocalePreferences({ date_format: value });
  };

  const setFirstDayOfWeek = (value: ProfileFirstDayOfWeek) => {
    setFirstDayOfWeekValue(value);
    void saveLocalePreferences({ first_day_of_week: value });
  };

  // ── Session history ───────────────────────────────────────────────────

  const logoutSession = async (id: string) => {
    try {
      await profilePreferencesService.logoutSession(id);
      setSessionRows((current) => current.filter((row) => row.id !== id));
    } catch (error) {
      setPreferencesError(apiErrorMessage(error, "Failed to log out that session."));
    }
  };

  const selectSection = (id: ProfileSectionId) => {
    setPreferencesError(null);
    setActiveSection(id);
  };

  return {
    active_section,
    selectSection,

    preferences_error,

    status_options: PROFILE_STATUS_OPTIONS,
    working_status,
    setWorkingStatus,
    status_dates,
    setStatusDates,
    disable_notifications_while_away,
    toggleDisableNotificationsWhileAway,
    hide_online_status,
    toggleHideOnlineStatus,

    notification_rows,
    toggleNotificationApp,
    toggleNotificationEmail,
    is_desktop_banner_dismissed,
    dismissDesktopBanner: () => setIsDesktopBannerDismissed(true),
    desktop_notifications_enabled,
    toggleDesktopNotifications,
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

    is_loading_sessions,
    session_rows,
    logoutSession,
  };
}
