"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ADDABLE_COLUMN_TYPES,
  BOARD_DEFAULT_GROUP_BY_ID,
  BOARD_VIEW_TYPES,
  BoardComingSoonView,
  BoardItemDrawer,
  BoardKanban,
  BoardShell,
  BoardTable,
  BoardToolbar,
  BoardValueCell,
  ChangeBoardTypeModal,
  COLUMN_KIND_SWATCH,
  COLUMN_OPTION_PALETTE,
  InlineTitleEditor,
  KANBAN_DEFAULT_LANE_OPTIONS,
  KanbanCardCover,
  KanbanCardLabels,
  KanbanCardMembers,
  useBoardItemDrawer,
  useBoardToolbar,
  type AddableColumnType,
  type BoardCellOption,
  type BoardColumn,
  type BoardKanbanLane,
  type BoardOptionActions,
  type BoardGroup as BoardGroupRow,
  type BoardGroupByOption,
  type BoardHeaderInfo,
  type BoardItemDrawerConfig,
  type BoardPersonOption,
  type BoardQuickFilterFacet,
  type BoardSortOption,
  type BoardToolbarConfig,
  type BoardViewKind,
} from "@/components/board";
import { KanbanViewIcon, PlusIcon, RowChatIcon } from "@/icons/board-icons";
import { ChevronRightIcon, FolderIcon } from "@/icons/workspace-icons";
import { useAuth } from "@/context/AuthContext";
import { useBoardViewTabs } from "@/hooks/useBoardViewTabs";
import { boardContentService } from "@/services/board-content.service";
import type {
  BoardColumnConfig,
  BoardColumnDto,
  BoardGroupDto,
  BoardItemDetailDto,
  BoardItemDto,
  BoardItemValue,
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
/** Synthetic, non-hideable column (like {@link ITEM_COLUMN_ID}) showing each row's comment count — mirrors Client Hub's static "chat" column. */
const CHAT_COLUMN_ID = "comments";

/** A multi-select cell's raw value, narrowed to the option/person ids it actually holds. */
const asStringArray = (value: BoardItemValue): string[] => (Array.isArray(value) ? value : []);

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
    personal_order: number[] | null;
  } | null>(null);
  const [has_error, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    setHasError(false);

    // Each tab (view) has its own independent columns/groups/items, so the
    // fetch is re-run on every tab switch, not just on board change — see
    // `active_view_id` in the dependency array below.
    Promise.all([
      boardContentService.getColumns(node.id, active_view_id),
      boardContentService.getGroups(node.id, active_view_id),
      boardContentService.getItems(node.id, active_view_id),
      boardContentService.getViews(node.id),
    ])
      .then(([columns, groups, items, views]) => {
        if (!cancelled) setLoaded({ columns, groups, items, views: views.views, personal_order: views.personal_order });
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [node.id, active_view_id]);

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
        workspace_slug={workspace_slug}
        board_type={board_type}
        info={info}
        initial_columns={loaded.columns}
        initial_groups={loaded.groups}
        initial_items={loaded.items}
        initial_views={loaded.views}
        initial_active_view_id={active_view_id ?? null}
        initial_personal_order={loaded.personal_order}
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
  workspace_slug: string;
  board_type: BoardType;
  info: BoardHeaderInfo;
  initial_columns: BoardColumnDto[];
  initial_groups: BoardGroupDto[];
  initial_items: BoardItemDto[];
  initial_views: BoardViewDto[];
  initial_active_view_id: number | null;
  initial_personal_order: number[] | null;
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
  workspace_slug,
  info,
  initial_columns,
  initial_groups,
  initial_items,
  initial_views,
  initial_active_view_id,
  initial_personal_order,
  initial_open_item_id,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const board_id = node.id;

  const [columns, setColumns] = useState(initial_columns);
  const [groups, setGroups] = useState(initial_groups);
  const [items, setItems] = useState(initial_items);
  const [item_detail_by_id, setItemDetailById] = useState<Record<string, BoardItemDetailDto>>({});

  const [adding_item_group_id, setAddingItemGroupId] = useState<string | null>(null);
  const [editing_item_id, setEditingItemId] = useState<number | null>(null);
  const [item_column_label, setItemColumnLabel] = useState(node.item_column_label ?? "Item");
  const [adding_kanban_lane_id, setAddingKanbanLaneId] = useState<string | null>(null);

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
      label: item_column_label,
      width: 280,
      swatch: { accent_color: "#7e5bef", glyph: "It" },
      full_label: item_column_label,
      pinnable: true,
      hideable: false,
    };
    const chat_column: BoardColumn = {
      id: CHAT_COLUMN_ID,
      label: "",
      width: 56,
      align: "center",
      hideable: false,
      pinnable: false,
    };
    return [
      item_column,
      chat_column,
      ...columns.map((c) => ({
        id: String(c.id),
        label: c.label,
        width: c.width,
        hideable: c.hideable,
        pinnable: c.pinnable,
        swatch: COLUMN_KIND_SWATCH[c.type],
        full_label: c.label,
        bleed: c.type === "status",
        align: (c.type === "checkbox" || c.type === "number" ? "center" : undefined) as "center" | undefined,
      })),
    ];
  }, [columns, item_column_label]);

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
      if (column_id === CHAT_COLUMN_ID) return String(row.comment_count);
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
        swatch: COLUMN_KIND_SWATCH[c.type],
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
          swatch: COLUMN_KIND_SWATCH.status,
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
  // ── Tabs — real saved views, applied onto the toolbar on every tab switch ──
  const buildViewUrl = (view: BoardViewDto): string =>
    view.is_primary ? `/boards/${board_id}` : `/boards/${board_id}/views/${view.id}`;

  const view_tabs = useBoardViewTabs({
    board_id,
    initial_views,
    initial_active_view_id,
    initial_personal_order,
    toolbar,
    onViewActivated: (view) => router.push(buildViewUrl(view)),
  });

  const handleAddView = (view_type?: BoardViewKind) => view_tabs.addView(view_type);
  const handleRenameView = (id: number | string, label: string) => view_tabs.renameView(Number(id), label);
  const handlePinView = (id: number | string) => view_tabs.pinView(Number(id));
  const handleDuplicateView = (id: number | string) => view_tabs.duplicateView(Number(id));
  const handleLockView = (id: number | string) => view_tabs.lockView(Number(id));
  const handleReorderPersonalTabs = (ordered_ids: Array<number | string>) => view_tabs.reorderPersonalTabs(ordered_ids);
  const handleChangeViewIcon = (id: number | string, icon: string | null) => view_tabs.changeViewIcon(Number(id), icon);
  const handleDeleteView = (id: number | string) => view_tabs.deleteView(Number(id));

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
      board_id,
      getInfoBoxes,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.label, current_user.id, persons, board_id, getInfoBoxes]
  );

  const drawer = useBoardItemDrawer(drawer_config);

  const handleRowClick = (row: BoardItemDto) => {
    drawer.openRow(row);
    fetchItemDetail(String(row.id));
    // Carries the active tab along so the board underneath the drawer keeps
    // showing that tab's content instead of falling back to the primary tab.
    const suffix =
      view_tabs.active_view && !view_tabs.active_view.is_primary ? `?view_id=${view_tabs.active_view.id}` : "";
    router.push(`/boards/${board_id}/pulses/${row.id}${suffix}`);
  };

  const handleDrawerClose = () => {
    drawer.close();
    router.push(view_tabs.active_view ? buildViewUrl(view_tabs.active_view) : `/boards/${board_id}`);
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

  // ── Add group (table) — one click appends a new table at the bottom of the active tab, no popover. Rename it inline afterward via the group title. ──
  const handleCreateGroup = async () => {
    if (view_tabs.active_view_id == null) return;
    const created = await boardContentService.createGroup(board_id, {
      view_id: view_tabs.active_view_id,
      name: "New group",
    });
    setGroups((current) => [...current, created]);
  };

  // ── Rename table (group) — inline input in place of the group's title, no popover ──
  const handleRenameGroup = async (group_id: string, name: string) => {
    const updated = await boardContentService.updateGroup(board_id, Number(group_id), { name });
    setGroups((current) => current.map((g) => (g.id === updated.id ? updated : g)));
  };

  // ── Rename column — inline input in place of the column header, no popover ──
  //
  // Every data column is a real `board_columns` row, renamed through the board
  // content API. The first "Item" column is the exception: it isn't a column
  // row (it's the item's own name), so its custom label lives on the board
  // (nav item) itself and is renamed through the workspace API.
  const handleRenameColumn = async (column_id: string, label: string) => {
    if (column_id === ITEM_COLUMN_ID) {
      const { workspaceService } = await import("@/services/workspace.service");
      const updated = await workspaceService.updateNavItem(workspace_slug, board_id, {
        item_column_label: label,
      });
      setItemColumnLabel(updated.item_column_label ?? "Item");
      return;
    }
    const updated = await boardContentService.updateColumn(board_id, Number(column_id), { label });
    setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c)));
  };

  // ── Rename item — click the item name to swap it for an inline input, mirroring
  // group/column rename. Only the name field is merged back in (not the whole
  // server item) so a stale `comment_count`/`values` response can't clobber
  // what's already known client-side. ──
  const handleRenameItem = async (item_id: number, name: string) => {
    const updated = await boardContentService.updateItem(board_id, item_id, { name });
    setItems((current) => current.map((item) => (item.id === item_id ? { ...item, name: updated.name } : item)));
    setEditingItemId(null);
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

  // ── Add column — "+" header button opens the reusable AddColumnMenu; a new
  // typed column is appended to the board (status columns get default options
  // seeded server-side, unless the caller supplies its own `config` — e.g.
  // the Kanban "set up your board" flow, which seeds Monday-style lane
  // labels instead). ──
  const handleAddColumn = async (type: AddableColumnType, config?: BoardColumnConfig) => {
    if (view_tabs.active_view_id == null) return;
    // `key` must be unique per tab and match `^[a-z0-9_]+$` — the kind plus a
    // timestamp satisfies both without a round-trip to check for collisions.
    const created = await boardContentService.createColumn(board_id, {
      view_id: view_tabs.active_view_id,
      key: `${type.kind}_${Date.now()}`,
      label: type.label,
      type: type.kind,
      width: type.default_width,
      config,
    });
    setColumns((current) => [...current, created]);
  };

  // ── Inline cell edit — optimistically writes the new value, then persists it,
  // reverting the whole item list if the request fails. ──
  const handleUpdateCellValue = async (item_id: number, column_id: string, value: BoardItemValue) => {
    const previous = items;
    setItems((current) =>
      current.map((item) =>
        item.id === item_id ? { ...item, values: { ...item.values, [column_id]: value } } : item
      )
    );
    try {
      await boardContentService.updateItemValues(board_id, item_id, { [column_id]: value });
    } catch {
      setItems(previous);
    }
  };

  // ── Add option to a status/dropdown column, inline from its cell picker —
  // persists the option to the column's config and resolves to it (with its
  // generated id) so the cell can select it right away. ──
  const handleAddColumnOption = async (
    column_id: string,
    option: { label: string; color: string }
  ): Promise<BoardCellOption | null> => {
    const column = columns_by_id[column_id];
    if (!column) return null;
    const new_option: BoardCellOption = { id: `opt_${Date.now()}`, label: option.label, color: option.color };
    const next_options = [...(column.config?.options ?? []), new_option];
    const updated = await boardContentService.updateColumn(board_id, Number(column_id), {
      config: { ...(column.config ?? {}), options: next_options },
    });
    setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    return new_option;
  };

  // ── Edit Labels (rename/recolor/delete/deactivate/describe) — every action
  // is a read-modify-write over the column's `config.options` array, so they
  // all funnel through this one persistence helper. ──
  const patchColumnOptions = useCallback(
    async (column_id: string, updater: (options: BoardCellOption[]) => BoardCellOption[]) => {
      const column = columns_by_id[column_id];
      if (!column) return;
      const next_options = updater(column.config?.options ?? []);
      const updated = await boardContentService.updateColumn(board_id, Number(column_id), {
        config: { ...(column.config ?? {}), options: next_options },
      });
      setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    },
    [board_id, columns_by_id]
  );

  const makeOptionActions = (column_id: string): BoardOptionActions => ({
    onRename: (option_id, label) =>
      void patchColumnOptions(column_id, (options) =>
        options.map((option) => (option.id === option_id ? { ...option, label } : option))
      ),
    onRecolor: (option_id, color) =>
      void patchColumnOptions(column_id, (options) =>
        options.map((option) => (option.id === option_id ? { ...option, color } : option))
      ),
    onDelete: (option_id) =>
      void patchColumnOptions(column_id, (options) => options.filter((option) => option.id !== option_id)),
    onToggleActive: (option_id) =>
      void patchColumnOptions(column_id, (options) =>
        options.map((option) =>
          option.id === option_id ? { ...option, is_active: option.is_active === false } : option
        )
      ),
    onSetDescription: (option_id, description) =>
      void patchColumnOptions(column_id, (options) =>
        options.map((option) => (option.id === option_id ? { ...option, description } : option))
      ),
  });

  const renderCell = (row: BoardItemDto, column: BoardColumn): React.ReactNode => {
    if (column.id === ITEM_COLUMN_ID) {
      if (editing_item_id === row.id) {
        return (
          <InlineTitleEditor
            value={row.name}
            onCommit={(name) => handleRenameItem(row.id, name)}
            onCancel={() => setEditingItemId(null)}
            className="w-full min-w-0 text-[13.5px] font-medium text-shell-text"
            aria_label="Rename item"
          />
        );
      }
      return (
        <span
          onClick={(event) => {
            event.stopPropagation();
            setEditingItemId(row.id);
          }}
          className="-mx-1 min-w-0 cursor-text truncate rounded-[4px] px-1 text-[13.5px] font-medium text-shell-text hover:bg-shell-hover"
          title="Click to rename"
        >
          {row.name}
        </span>
      );
    }

    if (column.id === CHAT_COLUMN_ID) {
      if (!row.comment_count) return null;
      return (
        <span className="flex items-center gap-[3px] text-[11px] font-semibold text-shell-text-muted">
          <RowChatIcon />
          {row.comment_count}
        </span>
      );
    }

    const column_dto = columns_by_id[column.id];
    if (!column_dto) return null;

    const has_options = column_dto.type === "status" || column_dto.type === "tags";
    return (
      <BoardValueCell
        column={{
          id: String(column_dto.id),
          kind: column_dto.type,
          options: column_dto.config?.options ?? undefined,
        }}
        value={row.values[column.id] ?? null}
        people={node.owners}
        bleed={column_dto.type === "status"}
        onCommit={(next) => handleUpdateCellValue(row.id, column.id, next)}
        onAddOption={has_options ? (opt) => handleAddColumnOption(column.id, opt) : undefined}
        onEditOptions={has_options ? makeOptionActions(column.id) : undefined}
      />
    );
  };

  // ── Kanban ── lanes are the first status column's options; a card's lane
  // membership *is* its value in that column, so dragging a card between
  // lanes is just an ordinary cell edit (`handleUpdateCellValue`) — no
  // separate "lane" concept to keep in sync. Trello-style "Labels" and
  // "Members" follow the same idea: the first `tags`/`people` column on the
  // board, rendered as colored pills / avatar circles instead of the generic
  // value chip other columns get.
  const active_view_type: BoardViewKind = view_tabs.active_view?.view_type ?? "table";
  const kanban_lane_column = columns.find((c) => c.type === "status") ?? null;
  const kanban_label_column = columns.find((c) => c.type === "tags") ?? null;
  const kanban_member_column = columns.find((c) => c.type === "people") ?? null;
  const kanban_rows = useMemo(() => toolbar.groups.flatMap((g) => g.rows), [toolbar.groups]);

  const kanban_lanes: BoardKanbanLane<BoardItemDto>[] = useMemo(() => {
    if (!kanban_lane_column) return [];
    const column_id = String(kanban_lane_column.id);
    const options = (kanban_lane_column.config?.options ?? []).filter((o) => o.is_active !== false);
    const lanes: BoardKanbanLane<BoardItemDto>[] = options.map((option) => ({
      id: option.id,
      label: option.label,
      color: option.color,
      rows: kanban_rows.filter((row) => row.values[column_id] === option.id),
      renamable: true,
    }));
    const known_ids = new Set(options.map((o) => o.id));
    const unassigned = kanban_rows.filter((row) => {
      const value = row.values[column_id];
      return value == null || !known_ids.has(String(value));
    });
    if (unassigned.length > 0) {
      lanes.push({ id: "__none__", label: "No status", color: "#c4c4c4", rows: unassigned, renamable: false });
    }
    return lanes;
  }, [kanban_lane_column, kanban_rows]);

  // ── Kanban card cover — a Trello-style attribute of the card itself (not a
  // column value), so it round-trips through its own multipart endpoints
  // rather than `handleUpdateCellValue`. ──
  const handleUploadCardCover = async (item_id: number, file: File) => {
    const updated = await boardContentService.updateItemCover(board_id, item_id, file);
    setItems((current) => current.map((item) => (item.id === item_id ? updated : item)));
  };

  const handleRemoveCardCover = async (item_id: number) => {
    const updated = await boardContentService.removeItemCover(board_id, item_id);
    setItems((current) => current.map((item) => (item.id === item_id ? updated : item)));
  };

  const renderKanbanCard = (row: BoardItemDto): React.ReactNode => {
    const excluded_column_ids = new Set(
      [kanban_lane_column?.id, kanban_label_column?.id, kanban_member_column?.id].filter(
        (id): id is number => id != null
      )
    );
    const other_columns = columns.filter((c) => !excluded_column_ids.has(c.id));
    const has_footer = row.comment_count > 0;

    const label_ids = kanban_label_column ? asStringArray(row.values[String(kanban_label_column.id)]) : [];
    const member_ids = kanban_member_column ? asStringArray(row.values[String(kanban_member_column.id)]) : [];
    const members = kanban_member_column ? node.owners.filter((owner) => member_ids.includes(String(owner.id))) : [];

    return (
      <div className="flex flex-col">
        <KanbanCardCover
          cover_image_url={row.cover_image_url}
          onUpload={(file) => void handleUploadCardCover(row.id, file)}
          onRemove={() => void handleRemoveCardCover(row.id)}
        />

        <div className="flex flex-col gap-2 p-2.5">
          {kanban_label_column && (
            <KanbanCardLabels
              options={kanban_label_column.config?.options ?? []}
              selected_ids={label_ids}
              onToggle={(option_id) => {
                const next = label_ids.includes(option_id)
                  ? label_ids.filter((id) => id !== option_id)
                  : [...label_ids, option_id];
                void handleUpdateCellValue(row.id, String(kanban_label_column.id), next.length ? next : null);
              }}
              onCreateOption={(option) => handleAddColumnOption(String(kanban_label_column.id), option)}
              onEditOptions={makeOptionActions(String(kanban_label_column.id))}
            />
          )}

          {editing_item_id === row.id ? (
            <InlineTitleEditor
              value={row.name}
              onCommit={(name) => handleRenameItem(row.id, name)}
              onCancel={() => setEditingItemId(null)}
              className="w-full min-w-0 text-[13px] font-semibold text-shell-text"
              aria_label="Rename item"
            />
          ) : (
            <span
              onClick={(event) => {
                event.stopPropagation();
                setEditingItemId(row.id);
              }}
              className="min-w-0 cursor-text text-[13px] font-semibold leading-snug text-shell-text"
              title="Click to rename"
            >
              {row.name}
            </span>
          )}

          {other_columns.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
              {other_columns.slice(0, 3).map((column) => {
                const has_options = column.type === "status" || column.type === "tags";
                return (
                  <div key={column.id} className="h-6 min-w-[26px] max-w-[120px]">
                    <BoardValueCell
                      column={{ id: String(column.id), kind: column.type, options: column.config?.options ?? undefined }}
                      value={row.values[String(column.id)] ?? null}
                      people={node.owners}
                      onCommit={(next) => handleUpdateCellValue(row.id, String(column.id), next)}
                      onAddOption={has_options ? (opt) => handleAddColumnOption(String(column.id), opt) : undefined}
                      onEditOptions={has_options ? makeOptionActions(String(column.id)) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {(has_footer || kanban_member_column) && (
            <div className="flex items-center justify-between gap-1 border-t border-shell-border pt-1.5">
              {has_footer ? (
                <span className="flex items-center gap-[3px] text-[11px] font-semibold text-shell-text-faint">
                  <RowChatIcon />
                  {row.comment_count}
                </span>
              ) : (
                <span />
              )}
              {kanban_member_column && (
                <KanbanCardMembers
                  people={node.owners}
                  selected={members}
                  onToggle={(person_id) => {
                    const next = member_ids.includes(person_id)
                      ? member_ids.filter((id) => id !== person_id)
                      : [...member_ids, person_id];
                    void handleUpdateCellValue(row.id, String(kanban_member_column.id), next.length ? next : null);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  /** Guarantees an item has a table (group) to belong to even when the Kanban view has never opened the Table tab — auto-creates one silently. */
  const ensureKanbanGroup = async (): Promise<BoardGroupDto | null> => {
    if (groups[0]) return groups[0];
    if (view_tabs.active_view_id == null) return null;
    const created = await boardContentService.createGroup(board_id, { view_id: view_tabs.active_view_id, name: "Board" });
    setGroups((current) => [...current, created]);
    return created;
  };

  const handleMoveKanbanCard = (row_id: string, lane_id: string) => {
    if (!kanban_lane_column) return;
    handleUpdateCellValue(Number(row_id), String(kanban_lane_column.id), lane_id === "__none__" ? null : lane_id);
  };

  /**
   * Persists a lane's new card order after a drag by recomputing `position`
   * only for that lane's rows, splicing them back into each backing table's
   * existing position sequence in place — so rows in other lanes (which may
   * share the same table/group) keep their relative order untouched.
   */
  const handleReorderKanbanCards = (lane_id: string, ordered_row_ids: string[]) => {
    const moved_ids = new Set(ordered_row_ids);
    const rows_by_group = new Map<number, BoardItemDto[]>();
    for (const row of kanban_rows) {
      const list = rows_by_group.get(row.group_id) ?? [];
      list.push(row);
      rows_by_group.set(row.group_id, list);
    }

    const position_updates: Array<{ id: number; position: number }> = [];
    for (const group_rows of rows_by_group.values()) {
      const lane_rows_in_group = group_rows.filter((row) => moved_ids.has(String(row.id)));
      if (lane_rows_in_group.length === 0) continue;

      const new_lane_order = ordered_row_ids
        .map((id) => lane_rows_in_group.find((row) => String(row.id) === id))
        .filter((row): row is BoardItemDto => Boolean(row));

      let cursor = 0;
      group_rows
        .map((row) => (moved_ids.has(String(row.id)) ? new_lane_order[cursor++] : row))
        .forEach((row, index) => {
          if (row.position !== index) position_updates.push({ id: row.id, position: index });
        });
    }

    if (position_updates.length === 0) return;

    const previous = items;
    setItems((current) =>
      current.map((item) => {
        const update = position_updates.find((entry) => entry.id === item.id);
        return update ? { ...item, position: update.position } : item;
      })
    );

    Promise.all(
      position_updates.map((update) => boardContentService.updateItem(board_id, update.id, { position: update.position }))
    ).catch(() => setItems(previous));
  };

  const handleSubmitNewKanbanCard = async (lane_id: string, title: string) => {
    const target_group = await ensureKanbanGroup();
    if (!target_group) return;
    const values =
      kanban_lane_column && lane_id !== "__none__" ? { [String(kanban_lane_column.id)]: lane_id } : undefined;
    const created = await boardContentService.createItem(board_id, { name: title, group_id: target_group.id, values });
    setItems((current) => [...current, created]);
    setAddingKanbanLaneId(null);
  };

  const handleAddKanbanLane = () => {
    if (!kanban_lane_column) return;
    const next_index = kanban_lane_column.config?.options?.length ?? 0;
    void handleAddColumnOption(String(kanban_lane_column.id), {
      label: `New lane ${next_index + 1}`,
      color: COLUMN_OPTION_PALETTE[next_index % COLUMN_OPTION_PALETTE.length],
    });
  };

  const handleRenameKanbanLane = (lane_id: string, label: string) => {
    if (!kanban_lane_column) return;
    makeOptionActions(String(kanban_lane_column.id)).onRename(lane_id, label);
  };

  /**
   * A brand-new Kanban tab has no status column yet — offer to add one
   * instead of showing empty lanes, seeded with `KANBAN_DEFAULT_LANE_OPTIONS`
   * ("To do" / "Working on it" / "Done") rather than the generic Status
   * column's server-side default (which includes "Stuck") so a fresh board
   * doesn't open with a lane that reads as a problem to solve.
   */
  const handleStartKanbanBoard = () => {
    const status_type = ADDABLE_COLUMN_TYPES.find((type) => type.kind === "status");
    if (!status_type) return;
    const options = KANBAN_DEFAULT_LANE_OPTIONS.map((option, index) => ({
      id: `opt_${Date.now()}_${index}`,
      label: option.label,
      color: option.color,
    }));
    void handleAddColumn(status_type, { options });
  };

  return (
    <BoardShell
      header={{ title: node.label, is_favorite: node.is_favorite, invite_count: 0, info }}
      tabs={{
        tabs: view_tabs.tabs,
        active_view_id: view_tabs.active_view_id,
        onSelectView: view_tabs.selectView,
        onAddView: handleAddView,
        view_type_options: BOARD_VIEW_TYPES,
        onRenameView: handleRenameView,
        onChangeIcon: handleChangeViewIcon,
        onDeleteView: handleDeleteView,
        onPinView: handlePinView,
        onDuplicateView: handleDuplicateView,
        onLockView: handleLockView,
        getViewUrl: (tab) => (tab.id === view_tabs.tabs[0]?.id ? `/boards/${board_id}` : `/boards/${board_id}/views/${tab.id}`),
        onReorderPersonalTabs: handleReorderPersonalTabs,
      }}
      toolbar={<BoardToolbar toolbar={toolbar} onNewItem={handleNewItemAtTop} />}
    >
      {view_tabs.is_dirty && (
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={view_tabs.saveActiveView}
            className="rounded-[7px] bg-brand-500 px-2.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Save changes to &ldquo;{view_tabs.active_view?.label}&rdquo;
          </button>
        </div>
      )}

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

      {active_view_type === "kanban" ? (
        kanban_lane_column ? (
          <BoardKanban<BoardItemDto>
            lanes={kanban_lanes}
            getRowId={(row) => String(row.id)}
            renderCard={renderKanbanCard}
            onCardClick={handleRowClick}
            selectedRowId={drawer.open_row_id}
            onMoveCard={handleMoveKanbanCard}
            onReorderCards={handleReorderKanbanCards}
            onAddCard={(lane_id) => setAddingKanbanLaneId(lane_id)}
            addingLaneId={adding_kanban_lane_id}
            onSubmitNewCard={handleSubmitNewKanbanCard}
            onCancelAddCard={() => setAddingKanbanLaneId(null)}
            onAddLane={handleAddKanbanLane}
            onRenameLane={handleRenameKanbanLane}
          />
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
              <KanbanViewIcon size={26} />
            </span>
            <h2 className="text-lg font-semibold text-shell-text">Set up your Kanban board</h2>
            <p className="text-[13.5px] text-shell-text-muted">
              Kanban lanes come from a Status column — add one to start grouping cards into lanes.
            </p>
            <button
              type="button"
              onClick={handleStartKanbanBoard}
              className="flex items-center gap-1.5 rounded-[7px] border border-shell-border px-2.5 py-1.5 text-[12.5px] font-medium text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
            >
              <PlusIcon size={13} />
              Add Status column
            </button>
          </div>
        )
      ) : active_view_type !== "table" ? (
        <BoardComingSoonView view_type={active_view_type} />
      ) : groups.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
            <FolderIcon size={26} />
          </span>
          <h2 className="text-lg font-semibold text-shell-text">No tables yet</h2>
          <p className="text-[13.5px] text-shell-text-muted">
            Add your first table to start adding items to this board.
          </p>
          <button
            type="button"
            onClick={handleCreateGroup}
            className="flex items-center gap-1.5 rounded-[7px] border border-shell-border px-2.5 py-1.5 text-[12.5px] font-medium text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <PlusIcon size={13} />
            Add new group
          </button>
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
          onRenameGroup={handleRenameGroup}
          onRenameColumn={handleRenameColumn}
          onAddGroup={handleCreateGroup}
          onAddColumn={handleAddColumn}
        />
      )}

      <BoardItemDrawer drawer={{ ...drawer, close: handleDrawerClose }} />
    </BoardShell>
  );
};
