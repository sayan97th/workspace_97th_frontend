import { useEffect, useState } from "react";
import { isApplePlatform } from "@/lib/keyboard";

/**
 * The label of the platform's primary shortcut key, "⌘" on macOS and "Ctrl"
 * elsewhere, for hints such as "⌘ + Enter to send". Resolved after mount so
 * server and client markup match.
 */
export const useModKeyLabel = (): string => {
  const [mod_key_label, setModKeyLabel] = useState("Ctrl");

  useEffect(() => {
    if (isApplePlatform()) setModKeyLabel("⌘");
  }, []);

  return mod_key_label;
};
