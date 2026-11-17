import { describe, expect, it } from "vitest";
import { accessFromError, matchRecorderShortcut, permissionSteps, shortcutLabel } from "@/components/recorder/recorderPlatform";

const keyDown = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);

describe("recorder shortcuts", () => {
  it("match Option/Alt + Shift + letter by physical key, which is what a Mac sends", () => {
    // On a Mac, Option + Shift + P types "∏", only `code` still says KeyP.
    expect(matchRecorderShortcut(keyDown({ key: "∏", code: "KeyP", altKey: true, shiftKey: true }))).toBe("toggle_pause");
    expect(matchRecorderShortcut(keyDown({ key: "H", code: "KeyH", altKey: true, shiftKey: true }))).toBe("toggle_controls");
    expect(matchRecorderShortcut(keyDown({ key: "S", code: "KeyS", altKey: true, shiftKey: true }))).toBe("finish");
  });

  it("ignores other chords", () => {
    expect(matchRecorderShortcut(keyDown({ key: "p", code: "KeyP", altKey: true }))).toBeNull();
    expect(matchRecorderShortcut(keyDown({ key: "P", code: "KeyP", altKey: true, shiftKey: true, metaKey: true }))).toBeNull();
  });

  it("labels them the Mac way on a Mac", () => {
    expect(shortcutLabel("toggle_pause", true)).toBe("⌥⇧P");
    expect(shortcutLabel("toggle_pause", false)).toBe("Alt+Shift+P");
  });
});

describe("permissions", () => {
  it("tells a site block from a macOS block", () => {
    expect(accessFromError(new DOMException("Permission denied", "NotAllowedError"))).toBe("denied");
    expect(accessFromError(new DOMException("Permission denied by system", "NotAllowedError"))).toBe("system_denied");
    expect(accessFromError(new DOMException("Could not start video source", "NotReadableError"))).toBe("busy");
    expect(accessFromError(new DOMException("Requested device not found", "NotFoundError"))).toBe("not_found");
  });

  it("points Mac users to System Settings, and to restart the browser for screen recording", () => {
    const steps = permissionSteps("screen", "system_denied", "chrome", true);
    expect(steps[0]).toContain("Privacy & Security");
    expect(steps[0]).toContain("Screen & System Audio Recording");
    expect(steps.join(" ")).toContain("Quit Chrome");
    expect(permissionSteps("camera", "denied", "safari", true)[0]).toContain("Settings for This Website");
  });
});
