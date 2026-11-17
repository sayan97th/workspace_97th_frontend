"use client";
import { useEffect, useRef, useState } from "react";

/**
 * True once the element comes within `margin` of the viewport, and it stays
 * true. Video cards wait for it before mounting the player, so a long thread
 * doesn't ask the bucket for every video's metadata up front.
 */
export function useNearViewport<TElement extends HTMLElement>(margin = "400px") {
  const ref = useRef<TElement>(null);
  const [is_near, setIsNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || is_near) return;
    if (typeof IntersectionObserver === "undefined") {
      setIsNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [is_near, margin]);

  return { ref, is_near };
}
