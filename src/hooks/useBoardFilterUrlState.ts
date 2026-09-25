"use client";
import { useEffect, useRef, useState } from "react";
import {
  BOARD_DEFAULT_GROUP_BY_ID,
  type BoardAdvancedFilterRow,
  type BoardSortRule,
  type BoardToolbarFilterState,
} from "@/components/board";
import type { BoardViewDto } from "@/types/board-content";
import type { BoardViewSyncToolbar } from "./useBoardViewTabs";

/** Query parameter that carries the board's unsaved filter, sort and group-by state. */
export const BOARD_FILTER_URL_PARAM = "filters";

/** The compact state a shared link carries. Keys are omitted when empty. */
type UrlBoardState = {
  f?: Partial<BoardToolbarFilterState>;
  s?: Omit<BoardSortRule, "id">[];
  g?: string;
};

export type UseBoardFilterUrlStateConfig = {
  toolbar: BoardViewSyncToolbar;
  active_view: BoardViewDto | null;
  active_view_id: number | null;
  /** Whether the active view's saved state has finished replaying onto the toolbar. */
  is_view_applied: boolean;
  current_filter_state: BoardToolbarFilterState;
};

const encodeBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const decodeBase64Url = (value: string): string => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
};

const stripRule = (rule: BoardAdvancedFilterRow): Omit<BoardAdvancedFilterRow, "id"> => ({
  column_id: rule.column_id,
  condition: rule.condition,
  value: rule.value ?? "",
  values: rule.values ?? [],
  ...(rule.is_disabled ? { is_disabled: true } : {}),
});

/** Non-empty entries of a facet id map, sorted by facet id so equal maps serialize identically. */
const compactSelections = (selections: Record<string, string[]> | undefined) =>
  Object.entries(!selections || Array.isArray(selections) ? {} : selections)
    .filter(([, ids]) => ids.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

/**
 * Builds the compact, id free state for a filter slice + sort + group by. Keys
 * are always written in the same order and empty parts are dropped, so the
 * JSON of two equal states is identical and doubles as the equality check.
 */
const buildUrlState = (
  filter_state: BoardToolbarFilterState | null,
  sort_rules: BoardSortRule[] | Omit<BoardSortRule, "id">[] | null,
  group_by_option_id: string | null
): UrlBoardState => {
  const state: UrlBoardState = {};
  const f: Partial<BoardToolbarFilterState> = {};
  if (filter_state) {
    if (filter_state.search_query?.trim()) f.search_query = filter_state.search_query;
    if (filter_state.search_column_ids?.length) f.search_column_ids = filter_state.search_column_ids;
    if (filter_state.search_include_subitems) f.search_include_subitems = true;
    if (filter_state.search_include_updates) f.search_include_updates = true;
    if (filter_state.selected_person_ids?.length) f.selected_person_ids = filter_state.selected_person_ids;
    if (filter_state.selected_team_ids?.length) f.selected_team_ids = filter_state.selected_team_ids;
    if (filter_state.person_column_ids) f.person_column_ids = filter_state.person_column_ids;
    const quick = compactSelections(filter_state.quick_filter_selections);
    if (quick.length) f.quick_filter_selections = Object.fromEntries(quick);
    const exclusions = compactSelections(filter_state.quick_filter_exclusions);
    if (exclusions.length) f.quick_filter_exclusions = Object.fromEntries(exclusions);
    if (filter_state.include_subitems) f.include_subitems = true;
    if (filter_state.quick_filter_column_ids) f.quick_filter_column_ids = filter_state.quick_filter_column_ids;
    const rules = (filter_state.advanced_filter_rows ?? []).map(stripRule);
    if (rules.length) f.advanced_filter_rows = rules as BoardAdvancedFilterRow[];
    const groups = (filter_state.advanced_filter_groups ?? []).map((group) => ({
      join_operator: group.join_operator,
      rules: (group.rules ?? []).map(stripRule),
    }));
    if (groups.length) f.advanced_filter_groups = groups as BoardToolbarFilterState["advanced_filter_groups"];
    if (filter_state.advanced_filter_operator === "or") f.advanced_filter_operator = "or";
  }
  if (Object.keys(f).length) state.f = f;
  const sorts = (sort_rules ?? [])
    .filter((rule) => rule.sort_option_id)
    .map((rule) => ({ sort_option_id: rule.sort_option_id, direction: rule.direction, join_operator: rule.join_operator }));
  if (sorts.length) state.s = sorts;
  if (group_by_option_id && group_by_option_id !== BOARD_DEFAULT_GROUP_BY_ID) state.g = group_by_option_id;
  return state;
};

const readUrlState = (): UrlBoardState | null => {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get(BOARD_FILTER_URL_PARAM);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeBase64Url(raw));
    return parsed && typeof parsed === "object" ? (parsed as UrlBoardState) : null;
  } catch {
    // A truncated or hand-edited link just opens the view as saved.
    return null;
  }
};

const writeUrlParam = (value: string | null) => {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(BOARD_FILTER_URL_PARAM);
  else url.searchParams.set(BOARD_FILTER_URL_PARAM, value);
  if (url.href === window.location.href) return;
  // Native replaceState integrates with the Next.js router (see its docs,
  // "Native History API"), so this neither reloads nor adds history entries.
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
};

/**
 * Keeps the board's unsaved filter, sort and group-by state in the URL
 * (`?filters=...`), so a filtered board can be shared as a link and survives a
 * refresh. The parameter is only written while the toolbar differs from the
 * active view's saved state, and dropped as soon as it matches again (or the
 * change is saved). On load, a link's state is applied once, on top of the
 * view it was opened on, after that view's own state has been replayed.
 */
export function useBoardFilterUrlState(config: UseBoardFilterUrlStateConfig): void {
  const { toolbar, active_view, active_view_id, is_view_applied, current_filter_state } = config;
  // Read once on mount: the link's state belongs to the view the page opened on.
  const [pending_state] = useState(readUrlState);
  const initial_view_id_ref = useRef(active_view_id);
  const [is_link_consumed, setIsLinkConsumed] = useState(pending_state === null);

  useEffect(() => {
    if (is_link_consumed || !is_view_applied) return;
    setIsLinkConsumed(true);
    if (!pending_state || active_view_id !== initial_view_id_ref.current) return;
    const f = pending_state.f ?? {};
    toolbar.applyFilterState({
      search_query: f.search_query ?? "",
      search_column_ids: f.search_column_ids ?? [],
      selected_person_ids: f.selected_person_ids ?? [],
      quick_filter_selections: f.quick_filter_selections ?? {},
      advanced_filter_rows: (f.advanced_filter_rows ?? []) as BoardAdvancedFilterRow[],
      advanced_filter_groups: f.advanced_filter_groups ?? [],
      advanced_filter_operator: f.advanced_filter_operator ?? "and",
      quick_filter_column_ids: f.quick_filter_column_ids ?? null,
      quick_filter_exclusions: f.quick_filter_exclusions ?? {},
      include_subitems: f.include_subitems ?? false,
      person_column_ids: f.person_column_ids ?? null,
      selected_team_ids: f.selected_team_ids ?? [],
      search_include_subitems: f.search_include_subitems ?? false,
      search_include_updates: f.search_include_updates ?? false,
    });
    toolbar.applySortRules(pending_state.s ?? []);
    toolbar.setGroupByOptionId(pending_state.g ?? BOARD_DEFAULT_GROUP_BY_ID);
  }, [is_link_consumed, is_view_applied, pending_state, active_view_id, toolbar]);

  const current_json = JSON.stringify(buildUrlState(current_filter_state, toolbar.sort_rules, toolbar.group_by_option_id));
  const saved_json = active_view
    ? JSON.stringify(buildUrlState(active_view.filter_state, active_view.sort_state, active_view.group_by_option_id))
    : null;

  useEffect(() => {
    // Wait until the link (if any) has been applied and the view's own state
    // has replayed, otherwise the pending link would be wiped before use.
    if (!is_link_consumed || !is_view_applied || saved_json === null) return;
    writeUrlParam(current_json === saved_json ? null : encodeBase64Url(current_json));
  }, [is_link_consumed, is_view_applied, current_json, saved_json]);
}

export default useBoardFilterUrlState;
