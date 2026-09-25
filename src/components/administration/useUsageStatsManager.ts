"use client";
import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { usageStatsService } from "@/services/administration/usage-stats.service";
import type { UsageStatsDto } from "@/types/administration/usage-stats";

export type UsageRangePreset = "7" | "30" | "90" | "365" | "custom";

export type UsageStatsManagerApi = {
  is_loading: boolean;
  error: string | null;
  stats: UsageStatsDto | null;
  preset: UsageRangePreset;
  setPreset: (preset: UsageRangePreset) => void;
  from: string;
  to: string;
  setCustomRange: (from: string, to: string) => void;
};

const ymd = (date: Date): string => format(date, "yyyy-MM-dd");

/** Owns Administration > Usage stats: the date range and the `/api/admin/usage` payload for it. */
export function useUsageStatsManager(): UsageStatsManagerApi {
  const [preset, setPresetValue] = useState<UsageRangePreset>("30");
  const [from, setFrom] = useState(() => ymd(subDays(new Date(), 29)));
  const [to, setTo] = useState(() => ymd(new Date()));
  const [stats, setStats] = useState<UsageStatsDto | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    usageStatsService
      .getUsage(from, to)
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't load usage stats."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const setPreset = (next: UsageRangePreset) => {
    setPresetValue(next);
    if (next !== "custom") {
      setFrom(ymd(subDays(new Date(), Number(next) - 1)));
      setTo(ymd(new Date()));
    }
  };

  const setCustomRange = (next_from: string, next_to: string) => {
    setPresetValue("custom");
    setFrom(next_from);
    setTo(next_to);
  };

  return { is_loading, error, stats, preset, setPreset, from, to, setCustomRange };
}
