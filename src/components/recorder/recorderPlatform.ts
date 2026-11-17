import { isApplePlatform } from "@/lib/keyboard";

/**
 * Browser and operating system details the recorder adapts to. Most of the
 * team records on macOS, where both the browser AND the system must allow
 * the camera, the microphone and screen recording, and where Safari has its
 * own rules (no shared screen sound, no floating camera window).
 */

export type RecorderBrowser = "chrome" | "edge" | "safari" | "firefox" | "other";

export function detectBrowser(): RecorderBrowser {
  if (typeof navigator === "undefined") return "other";
  const user_agent = navigator.userAgent;
  if (/Edg\//.test(user_agent)) return "edge";
  if (/Firefox\//.test(user_agent)) return "firefox";
  if (/Chrome\/|CriOS\//.test(user_agent)) return "chrome";
  if (/Safari\//.test(user_agent)) return "safari";
  return "other";
}

/** macOS (not iPhone or iPad, which can't share their screen from a browser). */
export function isMacOS(): boolean {
  return typeof navigator !== "undefined" && /Macintosh|Mac OS X/.test(navigator.userAgent) && !/iPhone|iPad/.test(navigator.userAgent);
}

export function browserLabel(browser: RecorderBrowser): string {
  return { chrome: "Chrome", edge: "Edge", safari: "Safari", firefox: "Firefox", other: "your browser" }[browser];
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts while recording
// ---------------------------------------------------------------------------

export type RecorderShortcut = "toggle_pause" | "toggle_controls" | "finish";

/**
 * Option/Alt + Shift + a letter: free in Chrome, Safari and Edge on Mac and
 * PC, and never typed by accident. Matched on `event.code` (the physical
 * key), because on a Mac Option turns the letter into a symbol ("P" arrives
 * as "∏"), so `event.key` would never match there.
 */
export const RECORDER_SHORTCUTS: Record<RecorderShortcut, { code: string; letter: string; label: string }> = {
  toggle_pause: { code: "KeyP", letter: "P", label: "Pause or resume" },
  toggle_controls: { code: "KeyH", letter: "H", label: "Hide or show the controls" },
  finish: { code: "KeyS", letter: "S", label: "Finish recording" },
};

export function matchRecorderShortcut(event: KeyboardEvent): RecorderShortcut | null {
  if (!event.altKey || !event.shiftKey || event.metaKey || event.ctrlKey) return null;
  const match = (Object.keys(RECORDER_SHORTCUTS) as RecorderShortcut[]).find((shortcut) => RECORDER_SHORTCUTS[shortcut].code === event.code);
  return match ?? null;
}

/** "⌥⇧P" on a Mac, "Alt+Shift+P" elsewhere. */
export function shortcutLabel(shortcut: RecorderShortcut, is_apple = isApplePlatform()): string {
  const { letter } = RECORDER_SHORTCUTS[shortcut];
  return is_apple ? `⌥⇧${letter}` : `Alt+Shift+${letter}`;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/** Where a camera or microphone stands, so the setup can say exactly what is missing and how to fix it. */
export type DeviceAccess =
  | "idle"
  | "pending"
  | "granted"
  /** Blocked for this site in the browser. */
  | "denied"
  /** The browser itself is not allowed by the operating system (macOS Privacy & Security). */
  | "system_denied"
  | "not_found"
  /** Another app holds the device. */
  | "busy";

export type ScreenAccess = "idle" | "system_denied";

export function isDeviceBlocked(access: DeviceAccess): boolean {
  return access === "denied" || access === "system_denied" || access === "not_found" || access === "busy";
}

/** Reads a `getUserMedia`/`getDisplayMedia` failure. Chrome says "Permission denied by system" when macOS blocks it. */
export function accessFromError(error: unknown): DeviceAccess {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  const message = error instanceof Error || error instanceof DOMException ? error.message : "";
  if (name === "NotAllowedError" || name === "SecurityError") return /system/i.test(message) ? "system_denied" : "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "not_found";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  return "denied";
}

export type PermissionKind = "camera" | "microphone" | "screen";

const MAC_PRIVACY_PANES: Record<PermissionKind, string> = {
  camera: "Camera",
  microphone: "Microphone",
  screen: "Screen & System Audio Recording",
};

/**
 * Short, concrete steps to unblock one permission on this browser and
 * system. A site blocked in the browser is fixed from the address bar; a
 * browser blocked by macOS is fixed in System Settings (and screen recording
 * needs the browser to restart afterwards).
 */
export function permissionSteps(kind: PermissionKind, access: DeviceAccess | ScreenAccess, browser = detectBrowser(), is_mac = isMacOS()): string[] {
  const name = browserLabel(browser);

  if (access === "system_denied") {
    if (is_mac) {
      const steps = [
        `Open System Settings, then Privacy & Security, then ${MAC_PRIVACY_PANES[kind]}.`,
        `Turn on ${name}.`,
      ];
      if (kind === "screen") steps.push(`Quit ${name} completely (⌘Q) and open it again, macOS asks for this.`);
      else steps.push("Come back here and press Try again.");
      return steps;
    }
    return [`Allow ${name} to use the ${kind} in your system privacy settings.`, "Come back here and press Try again."];
  }

  if (access === "not_found") return [`Connect a ${kind}, or pick another one in the list.`, "Press Try again."];
  if (access === "busy") return [`Close other apps using the ${kind} (Zoom, Teams, FaceTime).`, "Press Try again."];

  if (browser === "safari") {
    return [
      "In the menu bar, open Safari, then Settings for This Website.",
      `Set ${kind === "camera" ? "Camera" : "Microphone"} to Allow.`,
      "Press Try again.",
    ];
  }
  if (browser === "firefox") return ["Click the crossed out icon at the left of the address bar.", `Remove the block on the ${kind}.`, "Press Try again."];
  return [`Click the site settings icon at the left of the address bar.`, `Set ${kind === "camera" ? "Camera" : "Microphone"} to Allow.`, "Press Try again."];
}
