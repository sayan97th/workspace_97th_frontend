"use client";
import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { accountSettingsService } from "@/services/administration/account-settings.service";
import type { AccountSettingsDto } from "@/types/administration/account-settings";

export const SESSION_INACTIVITY_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 240, label: "4 hours" },
  { minutes: 1440, label: "1 day" },
];

export const SESSION_MAX_DURATION_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 480, label: "8 hours" },
  { minutes: 1440, label: "1 day" },
  { minutes: 10080, label: "1 week" },
  { minutes: 43200, label: "30 days" },
];

export type PanicStage = "idle" | "confirm" | "active";

export type AdvancedSettingsManagerApi = {
  is_loading: boolean;
  error: string | null;

  session_inactivity_minutes: number | null;
  session_max_duration_minutes: number | null;
  setSessionInactivityMinutes: (minutes: number) => void;
  setSessionMaxDurationMinutes: (minutes: number) => void;
  has_unsaved_changes: boolean;
  is_saving: boolean;
  saveSessionDurations: () => Promise<void>;

  panic_stage: PanicStage;
  openPanicConfirm: () => void;
  cancelPanicConfirm: () => void;
  panic_password: string;
  setPanicPassword: (value: string) => void;
  panic_confirmation_phrase: string;
  setPanicConfirmationPhrase: (value: string) => void;
  panic_error: string | null;
  is_submitting_panic: boolean;
  confirmActivatePanic: () => Promise<void>;
  deactivatePanic: () => Promise<void>;
};

/**
 * Owns the Advanced section: session-duration policy (an explicit "Save" button, matching
 * the section's existing design) and panic mode. Panic mode is the single most disruptive
 * action in all of Administration, activating it revokes every other active session
 * account-wide and locks out everyone but admins, so it requires the admin's own password
 * plus a literal "PANIC" confirmation phrase, not just a click.
 */
export function useAdvancedSettingsManager(): AdvancedSettingsManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session_inactivity_minutes, setSessionInactivityMinutesValue] = useState<number | null>(null);
  const [session_max_duration_minutes, setSessionMaxDurationMinutesValue] = useState<number | null>(null);
  const [saved_inactivity, setSavedInactivity] = useState<number | null>(null);
  const [saved_max_duration, setSavedMaxDuration] = useState<number | null>(null);
  const [is_saving, setIsSaving] = useState(false);

  const [panic_stage, setPanicStage] = useState<PanicStage>("idle");
  const [panic_password, setPanicPassword] = useState("");
  const [panic_confirmation_phrase, setPanicConfirmationPhrase] = useState("");
  const [panic_error, setPanicError] = useState<string | null>(null);
  const [is_submitting_panic, setIsSubmittingPanic] = useState(false);

  const hydrate = (dto: AccountSettingsDto) => {
    setSessionInactivityMinutesValue(dto.session_inactivity_minutes);
    setSessionMaxDurationMinutesValue(dto.session_max_duration_minutes);
    setSavedInactivity(dto.session_inactivity_minutes);
    setSavedMaxDuration(dto.session_max_duration_minutes);
    setPanicStage(dto.panic_mode_active ? "active" : "idle");
  };

  useEffect(() => {
    let cancelled = false;
    accountSettingsService
      .getAccountSettings()
      .then((dto) => {
        if (!cancelled) hydrate(dto);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "Failed to load advanced settings."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSessionDurations = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const dto = await accountSettingsService.updateAdvancedSettings({
        session_inactivity_minutes,
        session_max_duration_minutes,
      });
      hydrate(dto);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to save session duration settings."));
    } finally {
      setIsSaving(false);
    }
  };

  const openPanicConfirm = () => {
    setPanicPassword("");
    setPanicConfirmationPhrase("");
    setPanicError(null);
    setPanicStage("confirm");
  };

  const cancelPanicConfirm = () => setPanicStage("idle");

  const confirmActivatePanic = async () => {
    setIsSubmittingPanic(true);
    setPanicError(null);
    try {
      const dto = await accountSettingsService.activatePanicMode(panic_password);
      hydrate(dto);
    } catch (err) {
      setPanicError(apiErrorMessage(err, "Failed to activate panic mode."));
    } finally {
      setIsSubmittingPanic(false);
    }
  };

  const deactivatePanic = async () => {
    setIsSubmittingPanic(true);
    setPanicError(null);
    try {
      const dto = await accountSettingsService.deactivatePanicMode();
      hydrate(dto);
    } catch (err) {
      setPanicError(apiErrorMessage(err, "Failed to deactivate panic mode."));
    } finally {
      setIsSubmittingPanic(false);
    }
  };

  return {
    is_loading,
    error,

    session_inactivity_minutes,
    session_max_duration_minutes,
    setSessionInactivityMinutes: setSessionInactivityMinutesValue,
    setSessionMaxDurationMinutes: setSessionMaxDurationMinutesValue,
    has_unsaved_changes:
      session_inactivity_minutes !== saved_inactivity || session_max_duration_minutes !== saved_max_duration,
    is_saving,
    saveSessionDurations,

    panic_stage,
    openPanicConfirm,
    cancelPanicConfirm,
    panic_password,
    setPanicPassword,
    panic_confirmation_phrase,
    setPanicConfirmationPhrase,
    panic_error,
    is_submitting_panic,
    confirmActivatePanic,
    deactivatePanic,
  };
}
