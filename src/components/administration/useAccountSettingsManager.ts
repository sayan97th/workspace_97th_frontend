"use client";
import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { accountSettingsService } from "@/services/administration/account-settings.service";
import type { AccountSettingsDto, UpdateAccountDefaultsPayload } from "@/types/administration/account-settings";

/** Account defaults every new user starts with, edited as one form. */
export type AccountDefaultsDraft = {
  default_timezone: string;
  default_language: string;
  default_date_format: "long" | "euro";
  default_time_format: "12" | "24";
  default_first_day_of_week: "sunday" | "monday";
};

const EMPTY_DEFAULTS: AccountDefaultsDraft = {
  default_timezone: "",
  default_language: "en",
  default_date_format: "long",
  default_time_format: "12",
  default_first_day_of_week: "sunday",
};

export type AccountSettingsManagerApi = {
  is_loading: boolean;
  error: string | null;

  // ── Account preferences (save immediately) ───────────────────────────
  weekend_start: "fri_sat" | "sat_sun";
  setWeekendStart: (value: "fri_sat" | "sat_sun") => void;
  show_weekends: boolean;
  setShowWeekends: (value: boolean) => void;
  home_page: "default" | "dashboard";
  setHomePage: (value: "default" | "dashboard") => void;
  preferences_save_error: string | null;

  // ── Defaults for new users (explicit "Save defaults") ────────────────
  defaults: AccountDefaultsDraft;
  setDefault: <K extends keyof AccountDefaultsDraft>(key: K, value: AccountDefaultsDraft[K]) => void;
  has_unsaved_defaults: boolean;
  is_saving_defaults: boolean;
  defaults_save_error: string | null;
  defaults_saved_notice: string | null;
  saveDefaults: () => Promise<void>;
};

/**
 * Owns the account wide `AccountSetting` singleton for the Account and New user defaults
 * Administration sections. Account's radio preferences save immediately on change, the same
 * optimistic then persist shape as {@link useProfileManager}'s working status fields, while the
 * defaults form only persists when "Save defaults" is clicked.
 */
export function useAccountSettingsManager(): AccountSettingsManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [weekend_start, setWeekendStartValue] = useState<"fri_sat" | "sat_sun">("sat_sun");
  const [show_weekends, setShowWeekendsValue] = useState(true);
  const [home_page, setHomePageValue] = useState<"default" | "dashboard">("default");
  const [preferences_save_error, setPreferencesSaveError] = useState<string | null>(null);

  const [defaults, setDefaults] = useState<AccountDefaultsDraft>(EMPTY_DEFAULTS);
  const [saved_defaults, setSavedDefaults] = useState<AccountDefaultsDraft>(EMPTY_DEFAULTS);
  const [is_saving_defaults, setIsSavingDefaults] = useState(false);
  const [defaults_save_error, setDefaultsSaveError] = useState<string | null>(null);
  const [defaults_saved_notice, setDefaultsSavedNotice] = useState<string | null>(null);

  const hydrate = (dto: AccountSettingsDto) => {
    setWeekendStartValue(dto.weekend_start);
    setShowWeekendsValue(dto.show_weekends);
    setHomePageValue(dto.home_page);
    const next_defaults: AccountDefaultsDraft = {
      default_timezone: dto.default_timezone ?? "",
      default_language: dto.default_language ?? "en",
      default_date_format: dto.default_date_format ?? "long",
      default_time_format: dto.default_time_format ?? "12",
      default_first_day_of_week: dto.default_first_day_of_week ?? "sunday",
    };
    setDefaults(next_defaults);
    setSavedDefaults(next_defaults);
  };

  useEffect(() => {
    let cancelled = false;
    accountSettingsService
      .getAccountSettings()
      .then((dto) => {
        if (!cancelled) hydrate(dto);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "Failed to load account settings."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Account preferences ──────────────────────────────────────────────

  const savePreferences = async (payload: {
    weekend_start?: "fri_sat" | "sat_sun";
    show_weekends?: boolean;
    home_page?: "default" | "dashboard";
  }) => {
    try {
      const dto = await accountSettingsService.updatePreferences(payload);
      hydrate(dto);
      setPreferencesSaveError(null);
    } catch (err) {
      setPreferencesSaveError(apiErrorMessage(err, "Failed to save account preferences."));
    }
  };

  const setWeekendStart = (value: "fri_sat" | "sat_sun") => {
    setWeekendStartValue(value);
    void savePreferences({ weekend_start: value });
  };

  const setShowWeekends = (value: boolean) => {
    setShowWeekendsValue(value);
    void savePreferences({ show_weekends: value });
  };

  const setHomePage = (value: "default" | "dashboard") => {
    setHomePageValue(value);
    void savePreferences({ home_page: value });
  };

  // ── Defaults for new users ───────────────────────────────────────────

  const setDefault = <K extends keyof AccountDefaultsDraft>(key: K, value: AccountDefaultsDraft[K]) => {
    setDefaultsSavedNotice(null);
    setDefaults((current) => ({ ...current, [key]: value }));
  };

  const saveDefaults = async () => {
    setIsSavingDefaults(true);
    setDefaultsSaveError(null);
    try {
      const payload: UpdateAccountDefaultsPayload = { ...defaults, default_timezone: defaults.default_timezone || null };
      hydrate(await accountSettingsService.updateDefaults(payload));
      setDefaultsSavedNotice("Defaults saved. They apply to everyone who joins from now on.");
    } catch (err) {
      setDefaultsSaveError(apiErrorMessage(err, "Failed to save the account defaults."));
    } finally {
      setIsSavingDefaults(false);
    }
  };

  const has_unsaved_defaults = (Object.keys(defaults) as (keyof AccountDefaultsDraft)[]).some(
    (key) => defaults[key] !== saved_defaults[key]
  );

  return {
    is_loading,
    error,

    weekend_start,
    setWeekendStart,
    show_weekends,
    setShowWeekends,
    home_page,
    setHomePage,
    preferences_save_error,

    defaults,
    setDefault,
    has_unsaved_defaults,
    is_saving_defaults,
    defaults_save_error,
    defaults_saved_notice,
    saveDefaults,
  };
}
