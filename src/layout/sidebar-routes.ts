/**
 * Account wide pages that render without the workspace sidebar, like monday.com's administration
 * and Teams directory: they apply to the whole site, so the page brings its own navigation (the
 * Administration rail, the Teams rail) instead of the workspace tree. Organization and Slack
 * settings are sections of the Administration view, so `/administration` covers them too. The
 * Slack testing pages open from Slack settings and share the Administration frame.
 */
const SIDEBARLESS_PATH_PREFIXES = ["/administration", "/teams", "/admin/test/slack"];

export const isSidebarlessPath = (pathname: string | null): boolean =>
  Boolean(pathname) &&
  SIDEBARLESS_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname!.startsWith(`${prefix}/`));

/** The app's Home page, where the top left logo leads and the fallback when no workspace page was visited yet. */
export const HOME_PATH = "/workspace-home";

const LAST_WORKSPACE_PATH_KEY = "last_workspace_path";

/**
 * Remembers the last page shown with the workspace sidebar (path plus query), so the sidebarless
 * settings pages can offer a "Back to workspace" link that lands where the user left off, even when
 * Administration was opened from a bookmark and the browser history has nothing to go back to.
 * Session storage keeps it per tab, and access is guarded because private windows may block it.
 */
export const rememberWorkspacePath = (path: string): void => {
  try {
    window.sessionStorage.setItem(LAST_WORKSPACE_PATH_KEY, path);
  } catch {
    // Storage is unavailable, "Back to workspace" falls back to Home.
  }
};

/** The page recorded by {@link rememberWorkspacePath}, or Home when there is none. */
export const readWorkspacePath = (): string => {
  try {
    const stored_path = window.sessionStorage.getItem(LAST_WORKSPACE_PATH_KEY);
    // Only same origin app paths, never a protocol relative URL.
    if (stored_path && stored_path.startsWith("/") && !stored_path.startsWith("//") && !isSidebarlessPath(stored_path)) {
      return stored_path;
    }
  } catch {
    // Storage is unavailable, fall through to Home.
  }
  return HOME_PATH;
};
