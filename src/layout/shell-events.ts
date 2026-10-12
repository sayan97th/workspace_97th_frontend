/**
 * Lets any page open one of the top bar's panels (the search box, the
 * notifications inbox, the updates feed or the invite dialog) without
 * sharing state with `AppTopBar`. Home's quick actions use it.
 */
export type ShellPanel = "search" | "notifications" | "feed" | "invite";

export const SHELL_OPEN_PANEL_EVENT = "shell:open-panel";

export const openShellPanel = (panel: ShellPanel): void => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<ShellPanel>(SHELL_OPEN_PANEL_EVENT, { detail: panel }));
};

/** Subscribes to `openShellPanel` calls, returns the cleanup for a `useEffect`. */
export const onShellPanelOpen = (listener: (panel: ShellPanel) => void): (() => void) => {
  const handleEvent = (event: Event) => listener((event as CustomEvent<ShellPanel>).detail);
  window.addEventListener(SHELL_OPEN_PANEL_EVENT, handleEvent);
  return () => window.removeEventListener(SHELL_OPEN_PANEL_EVENT, handleEvent);
};
