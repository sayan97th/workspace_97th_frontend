"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Live `window.matchMedia` result for `query`, for layout decisions CSS alone
 * cannot make (pixel widths computed in JS, like the board table's frozen Item
 * column). Prefer the Sass mixins in `src/styles/responsive` for pure styling.
 *
 * The server snapshot is always `false` (desktop), so the first client paint
 * matches the server HTML and the phone layout applies right after hydration.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media_query_list = window.matchMedia(query);
      media_query_list.addEventListener("change", onChange);
      return () => media_query_list.removeEventListener("change", onChange);
    },
    [query]
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const getServerSnapshot = () => false;

export default useMediaQuery;
