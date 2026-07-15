"use client";
import { useCallback, useMemo, useState } from "react";
import type { ToolbarCheckboxState } from "@/components/board";
import type { BoardPersonOption, TrashEntry, TrashItemType, TrashTabId } from "./types";

export type TrashManagerConfig = {
  /** Seed rows for the Trash tab. */
  trash_entries: TrashEntry[];
  /** Seed rows for the Archive tab. */
  archive_entries: TrashEntry[];
  /** People directory `deleted_by_id` resolves against. Defaults to the account's Teams roster. */
  members: BoardPersonOption[];
};

export type TrashManagerApi = {
  active_tab: TrashTabId;
  setActiveTab: (tab: TrashTabId) => void;

  query: string;
  setQuery: (value: string) => void;

  /** Types present anywhere in the active tab's full (unfiltered) list, in a stable order. */
  available_types: TrashItemType[];
  active_type_filters: TrashItemType[];
  toggleTypeFilter: (type: TrashItemType) => void;
  clearTypeFilters: () => void;

  /** Search + type filtered rows for the active tab. */
  visible_entries: TrashEntry[];
  total_entry_count: number;
  getDeletedBy: (entry: TrashEntry) => BoardPersonOption | undefined;

  select_all_state: ToolbarCheckboxState;
  selected_ids: string[];
  isSelected: (id: string) => boolean;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;

  restoreEntry: (id: string) => void;
  restoreSelected: () => void;
  deleteEntryForever: (id: string) => void;
  deleteSelectedForever: () => void;
};

const TYPE_ORDER: TrashItemType[] = ["item", "subitem", "column", "group", "doc", "dashboard", "board"];

/**
 * Owns all state for the account Trash dialog — the Trash/Archive tabs, search, type
 * filters, row selection, and restore/delete-forever actions — behind one
 * config-in/API-out hook, mirroring `useTeamsManager` and `useBoardToolbar` so
 * {@link TrashModal} and its panels stay presentational. Restoring or permanently
 * deleting a row removes it from local state; there's no backend for this mockup app,
 * so both actions simply drop the entry from its tab's list.
 */
export function useTrashManager({ trash_entries, archive_entries, members }: TrashManagerConfig): TrashManagerApi {
  const [entries_by_tab, setEntriesByTab] = useState<Record<TrashTabId, TrashEntry[]>>({
    trash: trash_entries,
    archive: archive_entries,
  });
  const [active_tab, setActiveTabState] = useState<TrashTabId>("trash");
  const [query, setQuery] = useState("");
  const [type_filters, setTypeFilters] = useState<Record<TrashTabId, TrashItemType[]>>({
    trash: [],
    archive: [],
  });
  const [selected_ids_by_tab, setSelectedIdsByTab] = useState<Record<TrashTabId, string[]>>({
    trash: [],
    archive: [],
  });

  const entries = entries_by_tab[active_tab];
  const active_type_filters = type_filters[active_tab];
  const selected_ids = selected_ids_by_tab[active_tab];

  const setActiveTab = useCallback((tab: TrashTabId) => {
    setActiveTabState(tab);
    setQuery("");
  }, []);

  const available_types = useMemo(
    () => TYPE_ORDER.filter((type) => entries.some((entry) => entry.type === type)),
    [entries]
  );

  const trimmed_query = query.trim().toLowerCase();
  const visible_entries = useMemo(
    () =>
      entries.filter((entry) => {
        const matches_query = trimmed_query ? entry.name.toLowerCase().includes(trimmed_query) : true;
        const matches_type = active_type_filters.length ? active_type_filters.includes(entry.type) : true;
        return matches_query && matches_type;
      }),
    [entries, trimmed_query, active_type_filters]
  );

  const getDeletedBy = (entry: TrashEntry) => members.find((member) => member.id === entry.deleted_by_id);

  const toggleTypeFilter = (type: TrashItemType) => {
    setTypeFilters((current) => {
      const active = current[active_tab];
      const next = active.includes(type) ? active.filter((item) => item !== type) : [...active, type];
      return { ...current, [active_tab]: next };
    });
  };
  const clearTypeFilters = () => setTypeFilters((current) => ({ ...current, [active_tab]: [] }));

  const visible_ids = visible_entries.map((entry) => entry.id);
  const selected_visible_count = selected_ids.filter((id) => visible_ids.includes(id)).length;
  const select_all_state: ToolbarCheckboxState =
    visible_ids.length === 0 || selected_visible_count === 0
      ? "unchecked"
      : selected_visible_count === visible_ids.length
        ? "checked"
        : "partial";

  const setSelectedIds = (updater: (current: string[]) => string[]) =>
    setSelectedIdsByTab((current) => ({ ...current, [active_tab]: updater(current[active_tab]) }));

  const isSelected = (id: string) => selected_ids.includes(id);

  const toggleSelect = (id: string) =>
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const toggleSelectAll = () =>
    setSelectedIds((current) =>
      select_all_state === "checked"
        ? current.filter((id) => !visible_ids.includes(id))
        : Array.from(new Set([...current, ...visible_ids]))
    );

  const clearSelection = () => setSelectedIds(() => []);

  const removeEntries = (ids: string[]) => {
    setEntriesByTab((current) => ({
      ...current,
      [active_tab]: current[active_tab].filter((entry) => !ids.includes(entry.id)),
    }));
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
  };

  const restoreEntry = (id: string) => removeEntries([id]);
  const restoreSelected = () => removeEntries(selected_ids);
  const deleteEntryForever = (id: string) => removeEntries([id]);
  const deleteSelectedForever = () => removeEntries(selected_ids);

  return {
    active_tab,
    setActiveTab,

    query,
    setQuery,

    available_types,
    active_type_filters,
    toggleTypeFilter,
    clearTypeFilters,

    visible_entries,
    total_entry_count: entries.length,
    getDeletedBy,

    select_all_state,
    selected_ids,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,

    restoreEntry,
    restoreSelected,
    deleteEntryForever,
    deleteSelectedForever,
  };
}
