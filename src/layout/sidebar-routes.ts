import { ORGANIZATION_SETTINGS_PATH } from "@/components/organization/organization-routes";

/**
 * Account wide settings pages that render without the workspace sidebar, like monday.com's
 * administration: their changes apply to the whole site, so the page brings its own navigation
 * (the Administration rail, or a Back link) instead of the workspace tree.
 */
const SIDEBARLESS_PATH_PREFIXES = ["/administration", ORGANIZATION_SETTINGS_PATH];

export const isSidebarlessPath = (pathname: string | null): boolean =>
  Boolean(pathname) &&
  SIDEBARLESS_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname!.startsWith(`${prefix}/`));
