"use client";
import { useMemo, useState } from "react";
import type { BoardRowHeight } from "../types";
import { deriveBoardRows } from "./deriveBoardRows";
import {
  BOARD_DEFAULT_GROUP_BY_ID,
  type BoardAdvancedFilterRow,
  type BoardSortDirection,
  type BoardSortRule,
  type BoardToolbarApi,
  type BoardToolbarConfig,
  type BoardToolbarPanelId,
} from "./types";

const createId = () => Math.random().toString(36).slice(2, 10);

export function useBoardToolbar<TRow>(config: BoardToolbarConfig<TRow>): BoardToolbarApi<TRow> {
  const [active_panel, setActivePanel] = useState<BoardToolbarPanelId | null>(null);

  const [is_search_open, setIsSearchOpen] = useState(false);
  const [search_query, setSearchQuery] = useState("");
  const [search_column_ids, setSearchColumnIds] = useState<string[]>(() =>
    config.columns.map((column) => column.id)
  );

  const [selected_person_ids, setSelectedPersonIds] = useState<string[]>([]);

  const [quick_filter_selections, setQuickFilterSelections] = useState<Record<string, string[]>>({});

  const [filter_mode, setFilterMode] = useState<"quick" | "advanced">("quick");
  const [advanced_filter_rows, setAdvancedFilterRows] = useState<BoardAdvancedFilterRow[]>([]);

  const [sort_rules, setSortRules] = useState<BoardSortRule[]>([]);

  const [hidden_column_ids, setHiddenColumnIds] = useState<string[]>([]);

  const [group_by_option_id, setGroupByOptionId] = useState(BOARD_DEFAULT_GROUP_BY_ID);
  const [group_order_direction, setGroupOrderDirection] = useState<BoardSortDirection>("asc");
  const [show_empty_groups, setShowEmptyGroups] = useState(false);

  const [row_height, setRowHeight] = useState<BoardRowHeight>("medium");

  const openPanel = (id: BoardToolbarPanelId) => setActivePanel(id);
  const closePanel = () => setActivePanel(null);
  const togglePanel = (id: BoardToolbarPanelId) =>
    setActivePanel((current) => (current === id ? null : id));

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    if (active_panel === "search_columns") closePanel();
  };

  const toggleSearchColumnId = (column_id: string) =>
    setSearchColumnIds((current) =>
      current.includes(column_id)
        ? current.filter((id) => id !== column_id)
        : [...current, column_id]
    );
  const setAllSearchColumns = (selected: boolean) =>
    setSearchColumnIds(selected ? config.columns.map((column) => column.id) : []);

  const togglePersonId = (id: string) =>
    setSelectedPersonIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id]
    );
  const clearPersonFilter = () => setSelectedPersonIds([]);

  const toggleQuickFilterOption = (facet_id: string, option_id: string) =>
    setQuickFilterSelections((current) => {
      const selected = current[facet_id] ?? [];
      const next = selected.includes(option_id)
        ? selected.filter((id) => id !== option_id)
        : [...selected, option_id];
      return { ...current, [facet_id]: next };
    });
  const clearQuickFilters = () => setQuickFilterSelections({});

  const addAdvancedFilterRow = () =>
    setAdvancedFilterRows((current) => [
      ...current,
      { id: createId(), column_id: null, condition: null, value: "" },
    ]);
  const removeAdvancedFilterRow = (id: string) =>
    setAdvancedFilterRows((current) => current.filter((row) => row.id !== id));
  const updateAdvancedFilterRow = (id: string, patch: Partial<BoardAdvancedFilterRow>) =>
    setAdvancedFilterRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  const clearAdvancedFilters = () => setAdvancedFilterRows([]);

  const clearAllFilters = () => {
    clearQuickFilters();
    clearAdvancedFilters();
  };

  const addSortRule = () =>
    setSortRules((current) => [
      ...current,
      { id: createId(), sort_option_id: null, direction: "asc" },
    ]);
  const removeSortRule = (id: string) =>
    setSortRules((current) => current.filter((rule) => rule.id !== id));
  const updateSortRule = (id: string, patch: Partial<BoardSortRule>) =>
    setSortRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  const clearSort = () => setSortRules([]);

  const toggleColumnHidden = (id: string) =>
    setHiddenColumnIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id]
    );
  const showAllColumns = () => setHiddenColumnIds([]);

  const derived = useMemo(
    () =>
      deriveBoardRows(config, {
        search_query,
        search_column_ids,
        selected_person_ids,
        quick_filter_selections,
        advanced_filter_rows,
        sort_rules,
        hidden_column_ids,
        group_by_option_id,
        group_order_direction,
        show_empty_groups,
      }),
    [
      config,
      search_query,
      search_column_ids,
      selected_person_ids,
      quick_filter_selections,
      advanced_filter_rows,
      sort_rules,
      hidden_column_ids,
      group_by_option_id,
      group_order_direction,
      show_empty_groups,
    ]
  );

  return {
    ...config,
    active_panel,
    openPanel,
    closePanel,
    togglePanel,

    is_search_open,
    openSearch,
    closeSearch,
    search_query,
    setSearchQuery,
    search_column_ids,
    toggleSearchColumnId,
    setAllSearchColumns,

    selected_person_ids,
    togglePersonId,
    clearPersonFilter,

    quick_filter_selections,
    toggleQuickFilterOption,
    clearQuickFilters,

    filter_mode,
    setFilterMode,
    advanced_filter_rows,
    addAdvancedFilterRow,
    removeAdvancedFilterRow,
    updateAdvancedFilterRow,
    clearAdvancedFilters,
    clearAllFilters,

    sort_rules,
    addSortRule,
    removeSortRule,
    updateSortRule,
    clearSort,

    hidden_column_ids,
    toggleColumnHidden,
    showAllColumns,

    group_by_option_id,
    setGroupByOptionId,
    group_order_direction,
    setGroupOrderDirection,
    show_empty_groups,
    setShowEmptyGroups,

    row_height,
    setRowHeight,

    ...derived,
  };
}

export default useBoardToolbar;
