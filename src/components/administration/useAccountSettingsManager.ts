"use client";
import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { accountSettingsService } from "@/services/administration/account-settings.service";
import type { AccountSettingsDto } from "@/types/administration/account-settings";

export type AccountSettingsManagerApi = {
  is_loading: boolean;
  error: string | null;

  // ── Profile (explicit "Save changes") ────────────────────────────────
  account_name: string;
  setAccountName: (value: string) => void;
  account_url: string;
  setAccountUrl: (value: string) => void;
  is_saving_profile: boolean;
  profile_save_error: string | null;
  /** True once the account name/URL differ from the last saved value. */
  has_unsaved_profile_changes: boolean;
  saveProfile: () => Promise<void>;

  // ── Account preferences (save immediately) ───────────────────────────
  weekend_start: "fri_sat" | "sat_sun";
  setWeekendStart: (value: "fri_sat" | "sat_sun") => void;
  show_weekends: boolean;
  setShowWeekends: (value: boolean) => void;
  home_page: "default" | "dashboard";
  setHomePage: (value: "default" | "dashboard") => void;
  preferences_save_error: string | null;
};

/**
 * Owns the account-wide `AccountSetting` singleton for the Profile and Account
 * Administration sections. Profile's name/URL fields only persist when "Save changes" is
 * clicked (an account URL change redirects the whole account for 30 days, not something to
 * fire on every keystroke); Account's radio preferences save immediately on change, the
 * same optimistic-then-persist shape as {@link useProfileManager}'s working-status fields.
 */
export function useAccountSettingsManager(): AccountSettingsManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [account_name, setAccountNameValue] = useState("");
  const [account_url, setAccountUrlValue] = useState("");
  const [saved_account_name, setSavedAccountName] = useState("");
  const [saved_account_url, setSavedAccountUrl] = useState("");
  const [is_saving_profile, setIsSavingProfile] = useState(false);
  const [profile_save_error, setProfileSaveError] = useState<string | null>(null);

  const [weekend_start, setWeekendStartValue] = useState<"fri_sat" | "sat_sun">("sat_sun");
  const [show_weekends, setShowWeekendsValue] = useState(true);
  const [home_page, setHomePageValue] = useState<"default" | "dashboard">("default");
  const [preferences_save_error, setPreferencesSaveError] = useState<string | null>(null);

  const hydrate = (dto: AccountSettingsDto) => {
    setAccountNameValue(dto.account_name);
    setAccountUrlValue(dto.account_url);
    setSavedAccountName(dto.account_name);
    setSavedAccountUrl(dto.account_url);
    setWeekendStartValue(dto.weekend_start);
    setShowWeekendsValue(dto.show_weekends);
    setHomePageValue(dto.home_page);
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

  // ── Profile ───────────────────────────────────────────────────────────

  const saveProfile = async () => {
    setIsSavingProfile(true);
    setProfileSaveError(null);
    try {
      const dto = await accountSettingsService.updateProfile({ account_name, account_url });
      hydrate(dto);
    } catch (err) {
      setProfileSaveError(apiErrorMessage(err, "Failed to save profile settings."));
    } finally {
      setIsSavingProfile(false);
    }
  };

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

  return {
    is_loading,
    error,

    account_name,
    setAccountName: setAccountNameValue,
    account_url,
    setAccountUrl: setAccountUrlValue,
    is_saving_profile,
    profile_save_error,
    has_unsaved_profile_changes: account_name !== saved_account_name || account_url !== saved_account_url,
    saveProfile,

    weekend_start,
    setWeekendStart,
    show_weekends,
    setShowWeekends,
    home_page,
    setHomePage,
    preferences_save_error,
  };
}
