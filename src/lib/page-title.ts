/** Product name shown at the end of every browser tab title. */
export const APP_NAME = "Workspace 97th";

const TITLE_SEPARATOR = " | ";
const MAX_TITLE_PART_LENGTH = 60;

/** Trims a title part and shortens an overlong one (an item name can be a whole sentence) with an ellipsis. */
const normalizeTitlePart = (part: string): string => {
  const trimmed = part.trim().replace(/\s+/g, " ");
  return trimmed.length > MAX_TITLE_PART_LENGTH ? `${trimmed.slice(0, MAX_TITLE_PART_LENGTH - 1).trimEnd()}…` : trimmed;
};

/**
 * Builds a browser tab title from the most specific part to the least
 * specific one, ending with the product name, e.g.
 * `buildPageTitle("Launch plan", "Client Hub")` -> "Launch plan | Client Hub | Workspace 97th".
 * Empty parts are skipped, so a part that is still loading never leaves a
 * dangling separator. Static routes should not call this: they export a plain
 * `metadata.title` and the root layout's `title.template` adds the product name.
 */
export const buildPageTitle = (...parts: Array<string | null | undefined>): string =>
  [...parts.map((part) => normalizeTitlePart(part ?? "")).filter(Boolean), APP_NAME].join(TITLE_SEPARATOR);
