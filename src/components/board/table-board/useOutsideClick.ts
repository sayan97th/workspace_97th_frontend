"use client";

import { useEffect, type RefObject } from "react";

export const useOutsideClick = (
  ref: RefObject<HTMLElement | null>,
  is_active: boolean,
  onOutsideAction: () => void
): void => {
  useEffect(() => {
    if (!is_active) return;

    const handlePointerDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideAction();
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onOutsideAction();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_active, onOutsideAction]);
};
