"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BOARD_DEFAULT_GROUP_BY_ID,
  BoardItemDrawer,
  BoardPopover,
  BoardShell,
  BoardTable,
  BoardToolbar,
  BoardViewTabs,
  ChangeBoardTypeModal,
  PersonAvatarStack,
  ProductTag,
  StatusPill,
  useBoardItemDrawer,
  useBoardToolbar,
  type BoardColumn,
  type BoardGroup as BoardGroupRow,
  type BoardGroupByOption,
  type BoardHeaderInfo,
  type BoardItemDrawerConfig,
  type BoardPersonOption,
  type BoardQuickFilterFacet,
  type BoardSortOption,
  type BoardToolbarConfig,
  type BoardViewTabItem,
} from "@/components/board";
import { CheckIcon, PlusIcon } from "@/icons/board-icons";
import { ChevronRightIcon, FolderIcon } from "@/icons/workspace-icons";
import { useAuth } from "@/context/AuthContext";
import { boardContentService } from "@/services/board-content.service";
import type {
  BoardColumnDto,
  BoardColumnType,
  BoardFilterState,
  BoardGroupDto,
  BoardItemDetailDto,
  BoardItemDto,
  BoardViewDto,
} from "@/types/board-content";
import type { BoardType, WorkspaceNavNode } from "@/types/workspace";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";

export type WorkspaceViewProps = {
  /** The navigation node whose view is being rendered. */
  node: WorkspaceNavNode;
  /** Human-readable labels from the workspace root down to this node. */
  breadcrumb: string[];
  workspace_slug: string;
  /** Deep-link support for `/boards/{id}/pulses/{item_id}` — opens this item's drawer on mount. */
  initial_open_item_id?: number;
  /** Deep-link support for `/boards/{id}/views/{view_id}` — selects this tab on mount. */
  active_view_id?: number;
};

const ITEM_COLUMN_ID = "name";

const COLUMN_TYPE_META: Record<BoardColumnType, { accent_color: string; glyph: string; glyph_text_color?: string }> = {
  text: { accent_color: "#579bfc", glyph: "Te" },
  status: { accent_color: "#00c875", glyph: "St" },
  people: { accent_color: "#a358df", glyph: "Pp" },
  date: { accent_color: "#2b76e5", glyph: "Da" },
  tags: { accent_color: "#7e5bef", glyph: "Tg" },
  number: { accent_color: "#fdab3d", glyph: "#", glyph_text_color: "#3a2a00" },
  checkbox: { accent_color: "#17a2b8", glyph: "Ck" },
};

const EMPTY_FILTER_STATE: BoardFilterState = {
  search_query: "",
  search_column_ids: [],
  selected_person_ids: [],
  quick_filter_selections: {},
  advanced_filter_rows: [],
};

/**
 * A saved `filter_state` blob's `quick_filter_selections` may come back as `[]`
 * instead of `{}` — an empty PHP array json-encodes as a list, not an object,
 * so an empty map round-trips through the API as `[]`. Normalize it back to an
 * object so it doesn't perpetually read as "different from the toolbar's `{}`".
 */
const normalizeFilterState = (filter_state: BoardFilterState | null): BoardFilterState => {
  const base = filter_state ?? EMPTY_FILTER_STATE;
  return {
    ...base,
    quick_filter_selections: Array.isArray(base.quick_filter_selections) ? {} : base.quick_filter_selections,
  };
};

/**
 * `JSON.stringify` on a plain object serializes keys in insertion order, but
 * MySQL's native `JSON` column type doesn't guarantee that order survives a
 * round-trip — a saved view's `filter_state` can come back with its keys in a
 * different order than it went in. Sorting keys at every level before
 * stringifying makes the dirty-check compare data, not incidental key order.
 * Array element order is left untouched — it's meaningful there (row order).
 */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const getInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatDate = (value: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** Resolves a node into the "Board info" popover content shown from its header chevron. */
const buildBoardInfo = (
  node: WorkspaceNavNode,
  board_type: BoardType,
  onChangeBoardType: () => void
): BoardHeaderInfo => ({
  description: node.description,
  board_type,
  can_change_board_type: true,
  onChangeBoardType,
  owners: node.owners,
  created_by: node.creator?.full_name ?? null,
  created_at: node.created_at
    ? new Date(node.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null,
  notifications: "Everything",
});

/**
 * The reusable "table board" engine — any board without a special `view_key`
 * (see `view-registry.tsx`) renders through here. Composes the same board kit
 * `ClientHubBoard.tsx` uses (`BoardShell`/`BoardTable`/`BoardToolbar`/
 * `BoardItemDrawer`), but driven by real data from `board-content.service.ts`
 * instead of static seed data, with any number of tables (groups), a
 * server-searchable item list, saved views/tabs, and a drawer addressable at
 * `/boards/{id}/pulses/{item_id}`.
 */
const TableBoardView: React.FC<WorkspaceViewProps> = ({
  node,
  breadcrumb,
  workspace_slug,
  initial_open_item_id,
  active_view_id,
}) => {
  const [board_type, setBoardType] = useState<BoardType>(node.board_type);
  const [is_change_type_open, setIsChangeTypeOpen] = useState(false);

  const [loaded, setLoaded] = useState<{
    columns: BoardColumnDto[];
    groups: BoardGroupDto[];
    items: BoardItemDto[];
    views: BoardViewDto[];
  } | null>(null);
  const [has_error, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    setHasError(false);

    Promise.all([
      boardContentService.getColumns(node.id),
      boardContentService.getGroups(node.id),
      boardContentService.getItems(node.id),
      boardContentService.getViews(node.id),
    ])
      .then(([columns, groups, items, views]) => {
        if (!cancelled) setLoaded({ columns, groups, items, views });
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [node.id]);

  const handleChangeBoardType = async (next_board_type: BoardType) => {
    await import("@/services/workspace.service").then(({ workspaceService }) =>
      workspaceService.updateNavItem(workspace_slug, node.id, { board_type: next_board_type })
    );
    setBoardType(next_board_type);
  };

  const info = buildBoardInfo(node, board_type, () => setIsChangeTypeOpen(true));

  if (has_error) {
    return (
      <CenteredMessage title="Something went wrong" detail="We couldn't load this board. Please try again." />
    );
  }

  if (!loaded) {
    return (
      <BoardShell header={{ title: node.label, is_favorite: node.is_favorite, invite_count: 0, info }} tabs={{ primary_label: "Main table", views: [] }}>
        <BoardLoadingSpinner />
      </BoardShell>
    );
  }

  return (
    <>
      <TableBoardBody
        key={node.id}
        node={node}
        breadcrumb={breadcrumb}
        board_type={board_type}
        info={info}
        initial_columns={loaded.columns}
        initial_groups={loaded.groups}
        initial_items={loaded.items}
        initial_views={loaded.views}
        initial_active_view_id={active_view_id ?? null}
        initial_open_item_id={initial_open_item_id ?? null}
      />
      <ChangeBoardTypeModal
        is_open={is_change_type_open}
        initial_board_type={board_type}
        onSubmit={handleChangeBoardType}
        onClose={() => setIsChangeTypeOpen(false)}
      />
    </>
  );
};

export default TableBoardView;

// ─────────────────────────────────────────────────────────────────────────────

type TableBoardBodyProps = {
  node: WorkspaceNavNode;
  breadcrumb: string[];
  board_type: BoardType;
  info: BoardHeaderInfo;
  initial_columns: BoardColumnDto[];
  initial_groups: BoardGroupDto[];
  initial_items: BoardItemDto[];
  initial_views: BoardViewDto[];
  initial_active_view_id: number | null;
  initial_open_item_id: number | null;
};

/**
 * Mounted only once the board's columns/groups/items/views have all loaded,
 * so `useBoardToolbar`'s lazy initial state (e.g. "which columns are
 * searchable by default") reads the real column list on its very first
 * render instead of an empty placeholder.
 */
const TableBoardBody: React.FC<TableBoardBodyProps> = ({
  node,
  breadcrumb,
  info,
  initial_columns,
  initial_groups,
  initial_items,
  initial_views,
  initial_active_view_id,
  initial_open_item_id,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const board_id = node.id;

  const [columns, setColumns] = useState(initial_columns);
  const [groups, setGroups] = useState(initial_groups);
  const [items, setItems] = useState(initial_items);
  const [views, setViews] = useState(initial_views);
  const [active_view_id, setActiveViewId] = useState<number | null>(
    initial_active_view_id ?? initial_views.find((v) => v.is_primary)?.id ?? initial_views[0]?.id ?? null
  );
  const [applied_view_id, setAppliedViewId] = useState<number | null>(null);
  const [item_detail_by_id, setItemDetailById] = useState<Record<string, BoardItemDetailDto>>({});

  const [add_group_anchor, setAddGroupAnchor] = useState<HTMLElement | null>(null);
  const [add_group_name, setAddGroupName] = useState("");
  const [adding_item_group_id, setAddingItemGroupId] = useState<string | null>(null);

  const columns_by_id = useMemo(
    () => Object.fromEntries(columns.map((c) => [String(c.id), c])),
    [columns]
  );
  const people_names_by_id = useMemo(
    () => Object.fromEntries(node.owners.map((o) => [String(o.id), o.full_name])),
    [node.owners]
  );

  const board_columns: BoardColumn[] = useMemo(() => {
    const item_column: BoardColumn = {
      id: ITEM_COLUMN_ID,
      label: "Item",
      width: 280,
      swatch: { accent_color: "#7e5bef", glyph: "It" },
      full_label: "Item",
      pinnable: true,
      hideable: false,
    };
    return [
      item_column,
      ...columns.map((c) => ({
        id: String(c.id),
        label: c.label,
        width: c.width,
        hideable: c.hideable,
        pinnable: c.pinnable,
        swatch: COLUMN_TYPE_META[c.type],
        full_label: c.label,
        bleed: c.type === "status",
        align: (c.type === "checkbox" || c.type === "number" ? "center" : undefined) as "center" | undefined,
      })),
    ];
  }, [columns]);

  const default_groups: BoardGroupRow<BoardItemDto>[] = useMemo(
    () =>
      groups.map((g) => ({
        id: String(g.id),
        name: g.name,
        accent_color: g.accent_color,
        rows: items.filter((item) => item.group_id === g.id),
      })),
    [groups, items]
  );

  const getColumnText = useCallback(
    (row: BoardItemDto, column_id: string): string => {
      if (column_id === ITEM_COLUMN_ID) return row.name;
      const column = columns_by_id[column_id];
      const value = row.values[column_id];
      if (value == null) return "";
      if (column?.type === "people" && Array.isArray(value)) {
        return value.map((id) => people_names_by_id[String(id)] ?? String(id)).join(" ");
      }
      return Array.isArray(value) ? value.join(" ") : String(value);
    },
    [columns_by_id, people_names_by_id]
  );

  const people_column_ids = useMemo(
    () => columns.filter((c) => c.type === "people").map((c) => String(c.id)),
    [columns]
  );
  const getPersonIds = useCallback(
    (row: BoardItemDto): string[] =>
      people_column_ids.flatMap((cid) => {
        const value = row.values[cid];
        return Array.isArray(value) ? value.map(String) : [];
      }),
    [people_column_ids]
  );

  const persons: BoardPersonOption[] = useMemo(
    () =>
      node.owners.map((owner, index) => ({
        id: String(owner.id),
        name: owner.full_name,
        initials: getInitials(owner.full_name),
        avatar_seed: index,
      })),
    [node.owners]
  );

  const sort_options: BoardSortOption<BoardItemDto>[] = useMemo(
    () => [
      { id: ITEM_COLUMN_ID, label: "Name", getValue: (row) => row.name },
      ...columns.map((c) => ({
        id: String(c.id),
        label: c.label,
        swatch: COLUMN_TYPE_META[c.type],
        getValue: (row: BoardItemDto): string | number => {
          const value = row.values[String(c.id)];
          if (c.type === "number") return typeof value === "number" ? value : 0;
          if (Array.isArray(value)) return value.join(", ");
          return value == null ? "" : String(value);
        },
      })),
    ],
    [columns]
  );

  const group_by_options: BoardGroupByOption<BoardItemDto>[] = useMemo(() => {
    const options: BoardGroupByOption<BoardItemDto>[] = [{ id: BOARD_DEFAULT_GROUP_BY_ID, label: "Default tables" }];
    columns
      .filter((c) => c.type === "status" && c.config?.options?.length)
      .forEach((c) => {
        const option_by_id = new Map((c.config?.options ?? []).map((o) => [o.id, o]));
        options.push({
          id: String(c.id),
          label: `By ${c.label}`,
          swatch: COLUMN_TYPE_META.status,
          getGroupKey: (row) => String(row.values[String(c.id)] ?? "none"),
          getGroupLabel: (key) => option_by_id.get(key)?.label ?? "No status",
          getGroupColor: (key) => option_by_id.get(key)?.color ?? "#c4c4c4",
        });
      });
    return options;
  }, [columns]);

  const quick_filter_facets: BoardQuickFilterFacet<BoardItemDto>[] = useMemo(
    () =>
      columns
        .filter((c) => (c.type === "status" || c.type === "tags") && c.config?.options?.length)
        .map((c) => ({
          id: String(c.id),
          label: c.label,
          options: (c.config?.options ?? []).map((o) => ({ id: o.id, label: o.label, dot_color: o.color })),
          getOptionIds: (row: BoardItemDto): string[] => {
            const value = row.values[String(c.id)];
            if (c.type === "tags") return Array.isArray(value) ? value.map(String) : [];
            return value != null ? [String(value)] : [];
          },
        })),
    [columns]
  );

  const toolbar_config: BoardToolbarConfig<BoardItemDto> = useMemo(
    () => ({
      columns: board_columns,
      default_groups,
      getRowId: (row) => String(row.id),
      getColumnText,
      persons,
      getPersonIds,
      sort_options,
      group_by_options,
      quick_filter_facets,
    }),
    [board_columns, default_groups, getColumnText, persons, getPersonIds, sort_options, group_by_options, quick_filter_facets]
  );

  const toolbar = useBoardToolbar(toolbar_config);
  const toolbar_ref = useRef(toolbar);
  toolbar_ref.current = toolbar;

  // ── Apply the active view's saved filter/sort/display state to the toolbar ──
  //
  // Two phases, because `addAdvancedFilterRow`/`addSortRule`/`addConditionalColorRule`
  // each generate their OWN random id for the row they create — there's no way to
  // tell them "use this id". Phase 1 resets the toolbar and adds one blank
  // placeholder row per saved rule. Phase 2 waits for those placeholders to show
  // up in `toolbar`'s state, then fills each one in by position by using its real
  // (now-known) generated id — calling `updateAdvancedFilterRow(rule.id, rule)`
  // directly in phase 1 would silently no-op, since `rule.id` is the *saved* id,
  // which never matches the freshly generated placeholder's id.
  const [pending_view, setPendingView] = useState<BoardViewDto | null>(null);

  useEffect(() => {
    const view = views.find((v) => v.id === active_view_id);
    if (!view) return;

    const t = toolbar_ref.current;
    const filter_state = normalizeFilterState(view.filter_state);
    t.setSearchQuery(filter_state.search_query);
    t.setAllSearchColumns(false);
    filter_state.search_column_ids.forEach((id) => t.toggleSearchColumnId(id));
    t.clearPersonFilter();
    filter_state.selected_person_ids.forEach((id) => t.togglePersonId(id));
    t.clearQuickFilters();
    Object.entries(filter_state.quick_filter_selections).forEach(([facet_id, option_ids]) => {
      option_ids.forEach((option_id) => t.toggleQuickFilterOption(facet_id, option_id));
    });
    t.clearAdvancedFilters();
    filter_state.advanced_filter_rows.forEach(() => t.addAdvancedFilterRow());
    t.clearSort();
    (view.sort_state ?? []).forEach(() => t.addSortRule());
    t.showAllColumns();
    (view.hidden_column_ids ?? []).forEach((id) => t.toggleColumnHidden(id));
    t.unpinAllColumns();
    (view.pinned_column_ids ?? []).forEach((id) => t.togglePinnedColumn(id));
    t.setRowHeight(view.row_height);
    t.clearConditionalColorRules();
    (view.conditional_color_rules ?? []).forEach(() => t.addConditionalColorRule());
    t.setGroupByOptionId(view.group_by_option_id ?? BOARD_DEFAULT_GROUP_BY_ID);

    setPendingView(view);
    // Deliberately only re-runs when the active view id changes — replays the
    // saved state onto the toolbar once per tab switch, not on every toolbar edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active_view_id]);

  useEffect(() => {
    if (!pending_view) return;
    const t = toolbar_ref.current;
    const filter_state = normalizeFilterState(pending_view.filter_state);
    const wanted_filters = filter_state.advanced_filter_rows;
    const wanted_sorts = pending_view.sort_state ?? [];
    const wanted_colors = pending_view.conditional_color_rules ?? [];

    // Not all placeholder rows have landed in toolbar state yet — wait for the render where they have.
    if (
      t.advanced_filter_rows.length !== wanted_filters.length ||
      t.sort_rules.length !== wanted_sorts.length ||
      t.conditional_color_rules.length !== wanted_colors.length
    ) {
      return;
    }

    wanted_filters.forEach((rule, index) => {
      const actual_id = t.advanced_filter_rows[index]?.id;
      if (actual_id) t.updateAdvancedFilterRow(actual_id, rule);
    });
    wanted_sorts.forEach((rule, index) => {
      const actual_id = t.sort_rules[index]?.id;
      if (actual_id) t.updateSortRule(actual_id, rule);
    });
    wanted_colors.forEach((rule, index) => {
      const actual_id = t.conditional_color_rules[index]?.id;
      if (actual_id) t.updateConditionalColorRule(actual_id, rule);
    });

    setAppliedViewId(pending_view.id);
    setPendingView(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending_view, toolbar.advanced_filter_rows.length, toolbar.sort_rules.length, toolbar.conditional_color_rules.length]);

  // ── "Save filters for this view" dirty check ──
  const active_view = views.find((v) => v.id === active_view_id) ?? null;
  const is_view_applied = applied_view_id === active_view_id;
  const current_filter_state: BoardFilterState = {
    search_query: toolbar.search_query,
    search_column_ids: toolbar.search_column_ids,
    selected_person_ids: toolbar.selected_person_ids,
    quick_filter_selections: toolbar.quick_filter_selections,
    advanced_filter_rows: toolbar.advanced_filter_rows,
  };
  // `id` on advanced-filter/sort/color rows is a local React-key concern, freshly
  // generated every time a view is replayed onto the toolbar — it never matches
  // the saved blob's ids even when the rule itself is unchanged, so it's stripped
  // before comparing (otherwise every view with a saved rule would always read
  // as dirty, even right after loading it).
  const withoutIds = <T extends { id: string }>(rows: T[]): Omit<T, "id">[] =>
    rows.map(({ id: _id, ...rest }) => rest);
  const is_dirty =
    is_view_applied &&
    active_view !== null &&
    stableStringify({
      filter_state: { ...current_filter_state, advanced_filter_rows: withoutIds(current_filter_state.advanced_filter_rows) },
      sort_state: withoutIds(toolbar.sort_rules),
      hidden_column_ids: toolbar.hidden_column_ids,
      pinned_column_ids: toolbar.pinned_column_ids,
      row_height: toolbar.row_height,
      conditional_color_rules: withoutIds(toolbar.conditional_color_rules),
    }) !==
      stableStringify({
        filter_state: {
          ...normalizeFilterState(active_view.filter_state),
          advanced_filter_rows: withoutIds(normalizeFilterState(active_view.filter_state).advanced_filter_rows),
        },
        sort_state: withoutIds(active_view.sort_state ?? []),
        hidden_column_ids: active_view.hidden_column_ids ?? [],
        pinned_column_ids: active_view.pinned_column_ids ?? [],
        row_height: active_view.row_height,
        conditional_color_rules: withoutIds(active_view.conditional_color_rules ?? []),
      });

  const handleSaveView = async () => {
    if (!active_view) return;
    const saved = await boardContentService.saveView(board_id, active_view.id, {
      filter_state: current_filter_state,
      sort_state: toolbar.sort_rules,
      hidden_column_ids: toolbar.hidden_column_ids,
      pinned_column_ids: toolbar.pinned_column_ids,
      conditional_color_rules: toolbar.conditional_color_rules,
      row_height: toolbar.row_height,
    });
    setViews((current) => current.map((v) => (v.id === saved.id ? saved : v)));
  };

  // ── Item detail drawer ──
  const current_user: BoardPersonOption = user
    ? { id: String(user.id), name: user.full_name, initials: getInitials(user.full_name), avatar_seed: 0 }
    : { id: "0", name: "You", initials: "Y", avatar_seed: 0 };

  const fetchItemDetail = useCallback(
    (item_id: string) => {
      if (item_detail_by_id[item_id]) return;
      boardContentService.getItem(board_id, Number(item_id)).then((detail) => {
        setItemDetailById((current) => ({ ...current, [item_id]: detail }));
      });
    },
    [board_id, item_detail_by_id]
  );

  const getInfoBoxes = useCallback(
    (row: BoardItemDto) => {
      const detail = item_detail_by_id[String(row.id)];
      const group = groups.find((g) => g.id === row.group_id);
      return [
        {
          id: "details",
          label: "Details",
          accent_color: "#00c875",
          rows: [
            { label: "Table", value: group?.name ?? "—" },
            { label: "Created by", value: detail?.creator?.full_name ?? "Loading…" },
            { label: "Created at", value: detail ? formatDate(detail.created_at) : "Loading…" },
          ],
        },
      ];
    },
    [item_detail_by_id, groups]
  );

  const drawer_config: BoardItemDrawerConfig<BoardItemDto> = useMemo(
    () => ({
      getRowId: (row) => String(row.id),
      getRowTitle: (row) => row.name,
      eyebrow_label: `${node.label} · Item`,
      current_user,
      mentionable_people: persons,
      getInitialComments: () => [],
      getInfoBoxes,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.label, current_user.id, persons, getInfoBoxes]
  );

  const drawer = useBoardItemDrawer(drawer_config);

  const buildViewUrl = (view: BoardViewDto): string =>
    view.is_primary ? `/boards/${board_id}` : `/boards/${board_id}/views/${view.id}`;

  const handleRowClick = (row: BoardItemDto) => {
    drawer.openRow(row);
    fetchItemDetail(String(row.id));
    router.push(`/boards/${board_id}/pulses/${row.id}`);
  };

  const handleDrawerClose = () => {
    drawer.close();
    const view = views.find((v) => v.id === active_view_id);
    router.push(view ? buildViewUrl(view) : `/boards/${board_id}`);
  };

  const opened_initial_ref = useRef(false);
  useEffect(() => {
    if (opened_initial_ref.current || !initial_open_item_id) return;
    const row = items.find((item) => item.id === initial_open_item_id);
    if (!row) return;
    opened_initial_ref.current = true;
    drawer.openRow(row);
    fetchItemDetail(String(row.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, initial_open_item_id]);

  // ── Tabs ──
  const tabs: BoardViewTabItem[] = views
    .slice()
    .sort((a, b) => (a.is_primary === b.is_primary ? a.position - b.position : a.is_primary ? -1 : 1))
    .map((v) => ({ id: v.id, label: v.label }));

  const handleSelectView = (id: number | string) => {
    const view = views.find((v) => v.id === id);
    if (!view) return;
    setActiveViewId(view.id);
    router.push(buildViewUrl(view));
  };

  const handleAddView = async () => {
    const created = await boardContentService.createView(board_id, { label: `View ${views.length + 1}` });
    setViews((current) => [...current, created]);
    setActiveViewId(created.id);
    router.push(buildViewUrl(created));
  };

  // ── Add table (group) ──
  const handleCreateGroup = async () => {
    const name = add_group_name.trim();
    if (!name) return;
    const created = await boardContentService.createGroup(board_id, { name });
    setGroups((current) => [...current, created]);
    setAddGroupName("");
    setAddGroupAnchor(null);
  };

  // ── Add item — inline input in place of the table's "+ Add item" row, no popover ──
  const handleOpenAddItem = (group_id: string) => setAddingItemGroupId(group_id);

  const handleSubmitNewItem = async (group_id: string, name: string) => {
    const created = await boardContentService.createItem(board_id, {
      name,
      group_id: Number(group_id),
    });
    setItems((current) => [...current, created]);
    setAddingItemGroupId(null);
  };

  const handleCancelAddItem = () => setAddingItemGroupId(null);

  // ── "New item" toolbar button — always inserts at the very top of the first table ──
  const handleNewItemAtTop = async () => {
    const target_group = groups[0];
    if (!target_group) return;

    // `position` is an unsigned column, so making room at the front means
    // shifting every existing sibling down by one before inserting at 0 —
    // otherwise repeated clicks would all tie at the same position.
    const siblings = items.filter((item) => item.group_id === target_group.id);
    await Promise.all(
      siblings.map((item) => boardContentService.updateItem(board_id, item.id, { position: item.position + 1 }))
    );
    const created = await boardContentService.createItem(board_id, {
      name: "New item",
      group_id: target_group.id,
      position: 0,
    });

    setItems((current) => [
      created,
      ...current.map((item) =>
        item.group_id === target_group.id ? { ...item, position: item.position + 1 } : item
      ),
    ]);
  };

  const renderCell = (row: BoardItemDto, column: BoardColumn): React.ReactNode => {
    if (column.id === ITEM_COLUMN_ID) {
      return (
        <span className="min-w-0 truncate text-[13.5px] font-medium text-shell-text">{row.name}</span>
      );
    }

    const column_dto = columns_by_id[column.id];
    if (!column_dto) return null;
    const value = row.values[column.id];

    switch (column_dto.type) {
      case "status": {
        const option = column_dto.config?.options?.find((o) => o.id === value);
        return option ? (
          <StatusPill label={option.label} bg={option.color} color="#ffffff" />
        ) : (
          <div className="h-full w-full bg-shell-panel-alt" />
        );
      }
      case "tags": {
        const ids = Array.isArray(value) ? value.map(String) : [];
        const options_by_id = new Map((column_dto.config?.options ?? []).map((o) => [o.id, o]));
        return (
          <div className="flex flex-wrap items-center gap-1">
            {ids.map((id) => {
              const option = options_by_id.get(id);
              return option ? <ProductTag key={id} label={option.label} /> : null;
            })}
          </div>
        );
      }
      case "people": {
        const ids = Array.isArray(value) ? value.map(String) : [];
        const people = ids
          .map((id) => node.owners.find((o) => String(o.id) === id))
          .filter((owner): owner is (typeof node.owners)[number] => Boolean(owner));
        return <PersonAvatarStack people={people} empty_label="—" />;
      }
      case "date":
        return value ? (
          <span className="text-[12.5px] text-shell-text-secondary">{formatDate(String(value))}</span>
        ) : null;
      case "number":
        return value != null ? (
          <span className="text-[12.5px] text-shell-text-secondary">{String(value)}</span>
        ) : null;
      case "checkbox":
        return value ? (
          <span className="text-success-500">
            <CheckIcon size={14} />
          </span>
        ) : null;
      case "text":
      default:
        return value ? (
          <span className="w-full truncate text-[12.5px] text-shell-text-secondary">{String(value)}</span>
        ) : null;
    }
  };

  return (
    <BoardShell
      header={{ title: node.label, is_favorite: node.is_favorite, invite_count: 0, info }}
      tabs={{ tabs, active_view_id, onSelectView: handleSelectView, onAddView: handleAddView }}
      toolbar={<BoardToolbar toolbar={toolbar} onNewItem={handleNewItemAtTop} />}
    >
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={(event) => setAddGroupAnchor(event.currentTarget)}
          className="flex items-center gap-1.5 rounded-[7px] border border-shell-border px-2.5 py-1.5 text-[12.5px] font-medium text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
        >
          <PlusIcon size={13} />
          Add table
        </button>
        {is_dirty && (
          <button
            type="button"
            onClick={handleSaveView}
            className="rounded-[7px] bg-brand-500 px-2.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Save changes to &ldquo;{active_view?.label}&rdquo;
          </button>
        )}
      </div>

      {breadcrumb.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1 text-[12.5px] text-shell-text-muted">
          {breadcrumb.slice(0, -1).map((crumb, index) => (
            <span key={`${crumb}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRightIcon size={10} />}
              {crumb}
            </span>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
            <FolderIcon size={26} />
          </span>
          <h2 className="text-lg font-semibold text-shell-text">No tables yet</h2>
          <p className="text-[13.5px] text-shell-text-muted">
            Add your first table to start adding items to this board.
          </p>
        </div>
      ) : (
        <BoardTable<BoardItemDto>
          columns={toolbar.visible_columns}
          groups={toolbar.groups}
          getRowId={(row) => String(row.id)}
          renderCell={renderCell}
          rowHeight={toolbar.row_height}
          pinnedColumnIds={toolbar.pinned_column_ids}
          rowColors={toolbar.row_colors}
          cellColors={toolbar.cell_colors}
          onRowClick={handleRowClick}
          selectedRowId={drawer.open_row_id}
          onAddItem={handleOpenAddItem}
          addingItemGroupId={adding_item_group_id}
          onSubmitNewItem={handleSubmitNewItem}
          onCancelAddItem={handleCancelAddItem}
        />
      )}

      <BoardItemDrawer drawer={{ ...drawer, close: handleDrawerClose }} />

      <BoardPopover anchor_el={add_group_anchor} is_open={add_group_anchor !== null} onClose={() => setAddGroupAnchor(null)} width={260}>
        <form
          className="flex flex-col gap-2 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleCreateGroup();
          }}
        >
          <label className="text-[12.5px] font-semibold text-shell-text">New table name</label>
          <input
            autoFocus
            value={add_group_name}
            onChange={(event) => setAddGroupName(event.target.value)}
            className="rounded-md border border-shell-border bg-shell-bg px-2.5 py-1.5 text-[13px] text-shell-text outline-none focus:border-brand-500"
            placeholder="e.g. Backlog"
          />
          <button
            type="submit"
            className="mt-1 rounded-md bg-brand-500 px-2.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-brand-600"
          >
            Add table
          </button>
        </form>
      </BoardPopover>
    </BoardShell>
  );
};
