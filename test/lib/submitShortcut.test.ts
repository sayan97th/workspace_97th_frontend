import { describe, expect, it } from "vitest";
import { isSubmitShortcut } from "@/lib/keyboard";

const press = (overrides: Partial<Parameters<typeof isSubmitShortcut>[0]> = {}) => ({
  key: "Enter",
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...overrides,
});

describe("isSubmitShortcut", () => {
  it("never sends on plain Enter, so Return adds a new line", () => {
    expect(isSubmitShortcut(press())).toBe(false);
  });

  it("sends on Command + Enter (macOS) and Control + Enter (Windows, Linux)", () => {
    expect(isSubmitShortcut(press({ metaKey: true }))).toBe(true);
    expect(isSubmitShortcut(press({ ctrlKey: true }))).toBe(true);
  });

  it("keeps Shift + Enter and Option/Alt + Enter as line breaks", () => {
    expect(isSubmitShortcut(press({ shiftKey: true }))).toBe(false);
    expect(isSubmitShortcut(press({ altKey: true }))).toBe(false);
    expect(isSubmitShortcut(press({ metaKey: true, shiftKey: true }))).toBe(false);
    expect(isSubmitShortcut(press({ ctrlKey: true, altKey: true }))).toBe(false);
  });

  it("ignores other keys held with Command", () => {
    expect(isSubmitShortcut(press({ key: "k", metaKey: true }))).toBe(false);
  });

  it("does not send while an input method is still composing", () => {
    expect(isSubmitShortcut(press({ metaKey: true, isComposing: true }))).toBe(false);
    expect(isSubmitShortcut(press({ metaKey: true, nativeEvent: { isComposing: true } }))).toBe(false);
  });
});
