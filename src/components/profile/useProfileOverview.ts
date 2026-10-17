"use client";
import { useEffect, useState } from "react";
import { profileService } from "@/services/profile.service";
import type { ProfileOverview } from "@/types/auth";

export type ProfileOverviewState = {
  overview: ProfileOverview | null;
  is_loading: boolean;
};

/**
 * Loads the read only department and teams shown on the My Profile header and Personal info page,
 * once per mount. A failed request leaves the overview empty, both places then simply hide those rows.
 */
export function useProfileOverview(): ProfileOverviewState {
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [is_loading, setIsLoading] = useState(true);

  useEffect(() => {
    let is_cancelled = false;
    profileService
      .fetchProfileOverview()
      .then((data) => {
        if (!is_cancelled) setOverview(data);
      })
      .catch(() => {
        if (!is_cancelled) setOverview({ department: null, teams: [] });
      })
      .finally(() => {
        if (!is_cancelled) setIsLoading(false);
      });
    return () => {
      is_cancelled = true;
    };
  }, []);

  return { overview, is_loading };
}
