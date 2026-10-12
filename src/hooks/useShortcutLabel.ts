import { useEffect, useState } from "react";

/** "Ctrl K" or the Command glyph, resolved after mount so server and client markup match. */
export const useShortcutLabel = (): string => {
  const [shortcut_label, setShortcutLabel] = useState("Ctrl K");

  useEffect(() => {
    if (/mac|iphone|ipad/i.test(navigator.userAgent)) setShortcutLabel("⌘ K");
  }, []);

  return shortcut_label;
};
