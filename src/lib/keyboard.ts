/** Whether a key press comes from somewhere the person is typing (inputs, editors), where global shortcuts must stay out of the way. */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

/** Whether the platform uses Cmd (macOS) rather than Ctrl as its primary shortcut modifier, for shortcut labels. */
export const isApplePlatform = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent);
