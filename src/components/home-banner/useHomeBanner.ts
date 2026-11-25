"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { homeBannerService } from "@/services/home-banner.service";
import type { HomeBannerState } from "@/types/home-banner";

/**
 * The last banner answer is kept per user, so Home paints the right image on the very first
 * frame instead of flashing the default gradient while `/api/home-banner` answers.
 */
const CACHE_KEY_PREFIX = "home_banner_state_v1:";

/** Lets Home and Administration > Organization stay in sync inside one tab. */
const CHANGE_EVENT = "home-banner:changed";

const readCache = (user_id: number): HomeBannerState | null => {
  try {
    const raw_value = window.localStorage.getItem(`${CACHE_KEY_PREFIX}${user_id}`);
    return raw_value ? (JSON.parse(raw_value) as HomeBannerState) : null;
  } catch {
    return null;
  }
};

const writeCache = (user_id: number, state: HomeBannerState): void => {
  try {
    window.localStorage.setItem(`${CACHE_KEY_PREFIX}${user_id}`, JSON.stringify(state));
  } catch {
    // Private mode or a full quota, the banner still works without the cache.
  }
};

export type HomeBannerApi = {
  /** Null until the cache or the API answers. */
  state: HomeBannerState | null;
  is_loaded: boolean;
  /** Stores an API answer, updates the cache and every other banner on the page. */
  applyState: (state: HomeBannerState) => void;
  reload: () => Promise<void>;
};

/** Both Home banners (personal and organization) for the signed in user. */
export function useHomeBanner(): HomeBannerApi {
  const { user } = useAuth();
  const user_id = user?.id ?? null;
  const [state, setState] = useState<HomeBannerState | null>(null);
  const [is_loaded, setIsLoaded] = useState(false);

  const applyState = useCallback(
    (next_state: HomeBannerState) => {
      const clean_state: HomeBannerState = {
        personal: next_state.personal,
        organization: next_state.organization,
        can_manage_organization: next_state.can_manage_organization,
      };
      setState(clean_state);
      setIsLoaded(true);
      if (user_id !== null) writeCache(user_id, clean_state);
      window.dispatchEvent(new CustomEvent<HomeBannerState>(CHANGE_EVENT, { detail: clean_state }));
    },
    [user_id]
  );

  const reload = useCallback(async () => {
    try {
      const next_state = await homeBannerService.getBanners();
      applyState(next_state);
    } catch {
      // Keeps the cached banner (or the default gradient), Home stays usable.
      setIsLoaded(true);
    }
  }, [applyState]);

  useEffect(() => {
    if (user_id === null) return;
    const cached_state = readCache(user_id);
    if (cached_state) setState(cached_state);
    void reload();
  }, [user_id, reload]);

  useEffect(() => {
    const syncFromEvent = (event: Event) => {
      const detail = (event as CustomEvent<HomeBannerState>).detail;
      if (detail) setState(detail);
    };
    window.addEventListener(CHANGE_EVENT, syncFromEvent);
    return () => window.removeEventListener(CHANGE_EVENT, syncFromEvent);
  }, []);

  return { state, is_loaded, applyState, reload };
}
