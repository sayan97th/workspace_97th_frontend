/** Whether a key press comes from somewhere the person is typing (inputs, editors), where global shortcuts must stay out of the way. */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

/** Whether the platform uses Cmd (macOS) rather than Ctrl as its primary shortcut modifier, for shortcut labels. */
export const isApplePlatform = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent);

type SubmitShortcutEvent = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"> & {
  isComposing?: boolean;
  nativeEvent?: { isComposing?: boolean };
};

/**
 * Whether a key press is the "send" chord shared by every update, reply and
 * comment box: Command + Enter on macOS, Control + Enter elsewhere (either one
 * is accepted on both, so a Mac user on an external PC keyboard is covered).
 * Plain Enter never sends, it adds a new line, so a draft can't be posted by
 * accident. Ignored while an input method (IME) is still composing a character.
 */
export const isSubmitShortcut = (event: SubmitShortcutEvent): boolean => {
  if (event.key !== "Enter") return false;
  if (event.isComposing || event.nativeEvent?.isComposing) return false;
  return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey;
};
