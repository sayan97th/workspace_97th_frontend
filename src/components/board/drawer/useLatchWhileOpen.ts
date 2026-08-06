import { useRef } from "react";

/**
 * Freezes `value` at its last snapshot while `is_open` is `false`, so a
 * closing {@link SlideOverPanel} keeps rendering the row it was showing
 * instead of flashing empty content the instant the row closes (`open_row`
 * resets to `null` synchronously on `close()`, ahead of the panel's own
 * slide-out transition).
 */
export function useLatchWhileOpen<T>(value: T, is_open: boolean): T {
  const latched_ref = useRef(value);
  if (is_open) latched_ref.current = value;
  return is_open ? value : latched_ref.current;
}

export default useLatchWhileOpen;
