"use client";
import { useEffect, useRef, type RefObject } from "react";

type UseInfiniteScrollOptions = {
  /** Fired when the sentinel scrolls into view and another page can be loaded. */
  onLoadMore: () => void;
  /** False while a page is loading or once the last page arrived, so the observer is disconnected and never double-fires. */
  can_load_more: boolean;
  /** The scrollable ancestor the sentinel is observed against, the viewport when omitted. */
  root_ref?: RefObject<Element | null>;
  /** Changes whenever the list grows (its length is enough), so a sentinel that stays visible after a short page keeps loading instead of stalling. */
  watch?: unknown;
  root_margin?: string;
};

/**
 * Infinite-scroll trigger shared by the notifications drawer and the update
 * feed: attach the returned ref to an empty element after the last row and
 * `onLoadMore` fires once it comes within {@link UseInfiniteScrollOptions.root_margin}
 * of the scroll container's edge.
 */
export function useInfiniteScroll({
  onLoadMore,
  can_load_more,
  root_ref,
  watch,
  root_margin = "240px",
}: UseInfiniteScrollOptions) {
  const sentinel_ref = useRef<HTMLDivElement>(null);
  const load_more_ref = useRef(onLoadMore);

  useEffect(() => {
    load_more_ref.current = onLoadMore;
  });

  useEffect(() => {
    const sentinel = sentinel_ref.current;
    if (!sentinel || !can_load_more) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) load_more_ref.current();
      },
      { root: root_ref?.current ?? null, rootMargin: root_margin }
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [can_load_more, root_ref, root_margin, watch]);

  return sentinel_ref;
}
