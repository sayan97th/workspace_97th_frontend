import { buildBoardPath, BOARD_ROUTE_BASE } from "@/components/workspace-nav/helpers";
import { buildWorkspaceManagePath } from "@/components/workspace-manage/tab-routing";
import type { NavIconSource } from "@/components/workspace-nav/NavItemIcon";
import type { RecentBoardDto } from "@/types/personal";
import type { GlobalSearchResults, SearchAssetType } from "@/types/search";

export type SearchSection = "recent" | "boards" | "items" | "workspaces";

export type SearchOptionWorkspace = {
  mono: string;
  color: string;
  avatar_url: string | null;
};

/** One row of the dropdown, already flattened so keyboard navigation can walk every section. */
export type SearchOption = {
  key: string;
  section: SearchSection;
  kind: "board" | "item" | "subitem" | "workspace";
  href: string;
  label: string;
  /** Breadcrumb shown under the label, from the closest parent to the workspace. */
  path: string[];
  /** Short type chip on the right, for example "Doc" or "Subitem". */
  type_label: string;
  /** Right side caption that replaces the type chip, for example "Visited 2 hours ago". */
  caption?: string;
  is_private?: boolean;
  /**
   * Board and doc rows reuse the sidebar icon, so search and sidebar look the same. The board
   * type is left out on purpose, privacy is shown by the trailing lock with its tooltip instead.
   */
  nav_icon?: NavIconSource;
  workspace?: SearchOptionWorkspace;
};

export const SECTION_ORDER: SearchSection[] = ["recent", "boards", "items", "workspaces"];

export const SECTION_LABELS: Record<SearchSection, string> = {
  recent: "Recently visited",
  boards: "Boards and docs",
  items: "Items",
  workspaces: "Workspaces",
};

const ASSET_TYPE_LABELS: Record<SearchAssetType, string> = {
  board: "Board",
  doc: "Doc",
  dashboard: "Dashboard",
  workflow: "Workflow",
};

/** How many recently visited boards the empty dropdown suggests. */
export const RECENT_OPTION_LIMIT = 5;

/** Flattens the grouped API payload into one ordered list. */
export const buildSearchOptions = (results: GlobalSearchResults): SearchOption[] => {
  const boards: SearchOption[] = results.boards.map((board) => ({
    key: `board-${board.id}`,
    section: "boards",
    kind: "board",
    href: buildBoardPath(board.id),
    label: board.label,
    path: [board.workspace.name],
    type_label: ASSET_TYPE_LABELS[board.asset_type] ?? "Board",
    is_private: board.board_type === "private",
    nav_icon: { view_key: board.asset_type },
  }));

  const items: SearchOption[] = results.items.map((item) => ({
    key: `item-${item.id}`,
    section: "items",
    kind: item.is_subitem ? "subitem" : "item",
    href: `${BOARD_ROUTE_BASE}/${item.board.id}/pulses/${item.id}?view_id=${item.view_id}`,
    label: item.name,
    path: [item.is_subitem ? item.parent_name : null, item.board.label, item.workspace.name].filter(
      (part): part is string => Boolean(part)
    ),
    type_label: item.is_subitem ? "Subitem" : "Item",
  }));

  const workspaces: SearchOption[] = results.workspaces.map((workspace) => ({
    key: `workspace-${workspace.id}`,
    section: "workspaces",
    kind: "workspace",
    href: buildWorkspaceManagePath(workspace.id),
    label: workspace.name,
    path: [],
    type_label: "Workspace",
    workspace: { mono: workspace.mono, color: workspace.color, avatar_url: workspace.avatar_url },
  }));

  return [...boards, ...items, ...workspaces];
};

/** Suggestions shown before the user types, so the dropdown is useful on focus. */
export const buildRecentOptions = (boards: RecentBoardDto[], formatVisit: (iso: string) => string): SearchOption[] =>
  boards.slice(0, RECENT_OPTION_LIMIT).map((board) => ({
    key: `recent-${board.id}`,
    section: "recent",
    kind: "board",
    href: buildBoardPath(board.id),
    label: board.label,
    path: board.workspace ? [board.workspace.name] : [],
    type_label: "Board",
    caption: formatVisit(board.visited_at),
    is_private: board.board_type === "private",
    nav_icon: { view_key: board.view_key },
  }));
