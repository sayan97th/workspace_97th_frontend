"use client";
import { useCallback, useEffect, useState } from "react";
import { externalAccountService } from "@/services/external-account.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { GoogleCalendarDto } from "@/types/external-account";

export type GoogleCalendarsApi = {
  calendars: GoogleCalendarDto[];
  is_loading: boolean;
  is_refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/** The Google calendars a connected account may add events to, nothing while `account_id` is null. */
export function useGoogleCalendars(account_id: number | null): GoogleCalendarsApi {
  const [calendars, setCalendars] = useState<GoogleCalendarDto[]>([]);
  const [is_loading, setIsLoading] = useState(account_id !== null);
  const [is_refreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account_id === null) {
      setCalendars([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    externalAccountService
      .getCalendars(account_id)
      .then((data) => {
        if (!cancelled) setCalendars(data);
      })
      .catch((failure) => {
        if (!cancelled) setError(apiErrorMessage(failure, "Your calendars could not be loaded."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [account_id]);

  const refresh = useCallback(async () => {
    if (account_id === null) return;
    setIsRefreshing(true);
    setError(null);
    try {
      setCalendars(await externalAccountService.getCalendars(account_id, true));
    } catch (failure) {
      setError(apiErrorMessage(failure, "Your calendars could not be loaded."));
    } finally {
      setIsRefreshing(false);
    }
  }, [account_id]);

  return { calendars, is_loading, is_refreshing, error, refresh };
}
