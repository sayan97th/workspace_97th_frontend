"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { downloadBlob } from "@/lib/download-blob";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { adminUsersService } from "@/services/administration/admin-users.service";
import { contentDirectoryService } from "@/services/administration/content-directory.service";
import type { AdminUserDto } from "@/types/administration/admin-users";
import type {
  AdminContentBoardDto,
  AdminContentFilterOptionsDto,
  AdminContentSortField,
} from "@/types/administration/content-directory";
import {
  useAdminFilterState,
  useAdminSelection,
  useAdminSort,
  useDebouncedValue,
  type AdminFilterDef,
  type AdminFilterStateApi,
  type AdminSelectionApi,
} from "./filters";

export type ContentDirectoryMode = "directory" | "tidy_up";

export const CONTENT_PER_PAGE = 25;

/** Inactivity thresholds offered by Tidy up, in days. */
export const TIDY_UP_THRESHOLDS = [30, 60, 90, 180, 365];

const personInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Column filters for the account wide boards table. Tidy up drops the Status and Last
 * activity filters, since it only ever lists active boards past its own inactivity cutoff.
 */
export const buildContentFilterDefs = (options: AdminContentFilterOptionsDto, mode: ContentDirectoryMode): AdminFilterDef[] => {
  const defs: AdminFilterDef[] = [
    {
      key: "workspace",
      label: "Workspace",
      kind: "multi_select",
      param: "workspace",
      options: options.workspaces.map((workspace) => ({ id: String(workspace.id), label: workspace.name })),
    },
    {
      key: "owner",
      label: "Owner",
      kind: "multi_select",
      param: "owner",
      options: [
        { id: "none", label: "No owner" },
        ...options.owners.map((owner) => ({
          id: String(owner.id),
          label: owner.full_name,
          person: {
            id: String(owner.id),
            name: owner.full_name,
            initials: personInitials(owner.full_name),
            avatar_seed: owner.id,
            avatar_url: owner.profile_photo_url ?? undefined,
            is_deactivated: owner.is_deactivated,
          },
        })),
      ],
    },
    {
      key: "board_type",
      label: "Privacy",
      kind: "multi_select",
      param: "board_type",
      options: [
        { id: "main", label: "Main" },
        { id: "private", label: "Private" },
        { id: "shareable", label: "Shareable" },
      ],
    },
    { key: "items", label: "Items", kind: "number_range", min_param: "items_min", max_param: "items_max" },
    {
      key: "created",
      label: "Created",
      kind: "date_range",
      from_param: "created_from",
      to_param: "created_to",
    },
  ];

  if (mode === "directory") {
    defs.splice(3, 0, {
      key: "status",
      label: "Status",
      kind: "multi_select",
      param: "status",
      options: [
        { id: "active", label: "Active", color: "#00c875" },
        { id: "archived", label: "Archived", color: "#c4c4c4" },
      ],
    });
    defs.push({
      key: "activity",
      label: "Last activity",
      kind: "date_range",
      from_param: "activity_from",
      to_param: "activity_to",
    });
  }

  return defs;
};

export type ContentDirectoryManagerApi = {
  mode: ContentDirectoryMode;
  is_loading: boolean;
  error: string | null;
  notice: string | null;
  query: string;
  setQuery: (value: string) => void;
  rows: AdminContentBoardDto[];
  total: number;
  page: number;
  setPage: (page: number) => void;
  last_page: number;

  filter_options: AdminContentFilterOptionsDto;
  filter_defs: AdminFilterDef[];
  filters: AdminFilterStateApi;
  sort_field: AdminContentSortField;
  sort_direction: "asc" | "desc";
  toggleSort: (field: AdminContentSortField) => void;
  selection: AdminSelectionApi;

  /** Active staff tier people boards can be reassigned to. */
  owner_candidates: AdminUserDto[];

  inactive_days: number;
  setInactiveDays: (days: number) => void;

  is_running_bulk_action: boolean;
  archiveSelected: () => Promise<void>;
  restoreSelected: () => Promise<void>;
  reassignSelected: (owner_id: number) => Promise<void>;
  is_exporting: boolean;
  exportBoards: (selected_only: boolean) => Promise<void>;
};

/**
 * Owns Administration > Content directory and Administration > Tidy up, the same account wide
 * boards listing from `/api/admin/content`: Tidy up just pins an inactivity cutoff and sorts
 * the stalest boards first.
 */
export function useContentDirectoryManager(mode: ContentDirectoryMode): ContentDirectoryManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const debounced_query = useDebouncedValue(query.trim());
  const [rows, setRows] = useState<AdminContentBoardDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [reload_token, setReloadToken] = useState(0);
  const [filter_options, setFilterOptions] = useState<AdminContentFilterOptionsDto>({ workspaces: [], owners: [] });
  const [inactive_days, setInactiveDaysValue] = useState(90);
  const [is_running_bulk_action, setIsRunningBulkAction] = useState(false);
  const [is_exporting, setIsExporting] = useState(false);
  const [owner_candidates, setOwnerCandidates] = useState<AdminUserDto[]>([]);

  const filter_defs = useMemo(() => buildContentFilterDefs(filter_options, mode), [filter_options, mode]);
  const filters = useAdminFilterState(filter_defs);
  const { filter_params, filter_key } = filters;
  const { sort_field, sort_direction, toggleSort } = useAdminSort<AdminContentSortField>(
    "last_activity_at",
    mode === "tidy_up" ? "asc" : "desc"
  );
  const selection = useAdminSelection();
  const effective_inactive_days = mode === "tidy_up" ? inactive_days : undefined;

  useEffect(() => {
    let cancelled = false;
    contentDirectoryService
      .getFilterOptions()
      .then((result) => {
        if (!cancelled) setFilterOptions(result);
      })
      .catch(() => {
        // The table still works without the Workspace and Owner choices.
      });
    return () => {
      cancelled = true;
    };
  }, [reload_token]);

  useEffect(() => {
    let cancelled = false;
    adminUsersService
      .getUsers({ type: "staff", per_page: 100, sort_field: "name", sort_direction: "asc", filter_params: { account_status: "active" } })
      .then((result) => {
        if (!cancelled) setOwnerCandidates(result.data);
      })
      .catch(() => {
        // Reassign is simply unavailable without the candidate list.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debounced_query, filter_key, sort_field, sort_direction, inactive_days]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    contentDirectoryService
      .getBoards({
        search: debounced_query,
        page,
        per_page: CONTENT_PER_PAGE,
        sort_field,
        sort_direction,
        inactive_days: effective_inactive_days,
        filter_params,
      })
      .then((result) => {
        if (cancelled) return;
        setRows(result.data);
        setTotal(result.total);
        setLastPage(result.last_page);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't load the boards."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `filter_key` is the stable string form of `filter_params`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced_query, page, sort_field, sort_direction, effective_inactive_days, filter_key, reload_token]);

  const setInactiveDays = useCallback(
    (days: number) => {
      setInactiveDaysValue(days);
      selection.clear();
    },
    [selection]
  );

  const runBulk = useCallback(
    async (action: () => Promise<{ message: string; skipped_count: number }>, fallback_error: string) => {
      if (selection.selected_ids.length === 0) return;
      setIsRunningBulkAction(true);
      setError(null);
      try {
        const result = await action();
        setNotice(result.skipped_count > 0 ? `${result.message} ${result.skipped_count} already up to date.` : result.message);
        selection.clear();
        setReloadToken((token) => token + 1);
      } catch (err) {
        setError(apiErrorMessage(err, fallback_error));
      } finally {
        setIsRunningBulkAction(false);
      }
    },
    [selection]
  );

  const archiveSelected = useCallback(
    () => runBulk(() => contentDirectoryService.archiveBoards(selection.selected_ids), "We couldn't archive those boards."),
    [runBulk, selection.selected_ids]
  );

  const restoreSelected = useCallback(
    () => runBulk(() => contentDirectoryService.restoreBoards(selection.selected_ids), "We couldn't restore those boards."),
    [runBulk, selection.selected_ids]
  );

  const reassignSelected = useCallback(
    (owner_id: number) =>
      runBulk(
        () => contentDirectoryService.reassignBoards(selection.selected_ids, owner_id),
        "We couldn't reassign those boards."
      ),
    [runBulk, selection.selected_ids]
  );

  const exportBoards = useCallback(
    async (selected_only: boolean) => {
      setIsExporting(true);
      setError(null);
      try {
        const blob = await contentDirectoryService.exportBoards({
          search: selected_only ? undefined : debounced_query,
          sort_field,
          sort_direction,
          inactive_days: selected_only ? undefined : effective_inactive_days,
          filter_params: selected_only ? {} : filter_params,
          ids: selected_only ? selection.selected_ids : undefined,
        });
        const prefix = mode === "tidy_up" ? "inactive-boards" : "content-directory";
        downloadBlob(blob, `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`);
      } catch (err) {
        setError(apiErrorMessage(err, "We couldn't export the boards."));
      } finally {
        setIsExporting(false);
      }
    },
    [debounced_query, sort_field, sort_direction, effective_inactive_days, filter_params, selection.selected_ids, mode]
  );

  return {
    mode,
    is_loading,
    error,
    notice,
    query,
    setQuery,
    rows,
    total,
    page,
    setPage,
    last_page,
    filter_options,
    filter_defs,
    filters,
    sort_field,
    sort_direction,
    toggleSort,
    selection,
    owner_candidates,
    inactive_days,
    setInactiveDays,
    is_running_bulk_action,
    archiveSelected,
    restoreSelected,
    reassignSelected,
    is_exporting,
    exportBoards,
  };
}
