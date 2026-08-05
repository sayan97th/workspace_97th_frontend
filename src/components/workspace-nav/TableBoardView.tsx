"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BOARD_DEFAULT_GROUP_BY_ID,
  BoardItemDrawer,
  BoardShell,
  BoardTable,
  BoardToolbar,
  BoardValueCell,
  ChangeBoardTypeModal,
  COLUMN_KIND_SWATCH,
  InlineTitleEditor,
  useBoardItemDrawer,
  useBoardToolbar,
  type AddableColumnType,
  type BoardCellOption,
  type BoardColumn,
  type BoardOptionActions,
  type BoardGroup as BoardGroupRow,
  type BoardGroupByOption,
  type BoardHeaderInfo,
  type BoardItemDrawerConfig,
  type BoardPersonOption,
  type BoardQuickFilterFacet,
  type BoardSortOption,
  type BoardToolbarConfig,
} from "@/components/board";
import { PlusIcon, RowChatIcon } from "@/icons/board-icons";
import { ChevronRightIcon, FolderIcon } from "@/icons/workspace-icons";
import { useAuth } from "@/context/AuthContext";
import { useBoardViewTabs } from "@/hooks/useBoardViewTabs";
import { boardContentService } from "@/services/board-content.service";
import type {
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

    Promise.all([
      boardContentService.getColumns(node.id),
      boardContentService.getGroups(node.id),
      boardContentService.getItems(node.id),
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

  const handleAddView = () => view_tabs.addView();
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
    router.push(`/boards/${board_id}/pulses/${row.id}`);
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

  // ── Add group (table) — one click appends a new table at the bottom of the view, no popover. Rename it inline afterward via the group title. ──
  const handleCreateGroup = async () => {
    const created = await boardContentService.createGroup(board_id, { name: "New group" });
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
  // seeded server-side). ──
  const handleAddColumn = async (type: AddableColumnType) => {
    // `key` must be unique per board and match `^[a-z0-9_]+$` — the kind plus a
    // timestamp satisfies both without a round-trip to check for collisions.
    const created = await boardContentService.createColumn(board_id, {
      key: `${type.kind}_${Date.now()}`,
      label: type.label,
      type: type.kind,
      width: type.default_width,
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

  return (
    <BoardShell
      header={{ title: node.label, is_favorite: node.is_favorite, invite_count: 0, info }}
      tabs={{
        tabs: view_tabs.tabs,
        active_view_id: view_tabs.active_view_id,
        onSelectView: view_tabs.selectView,
        onAddView: handleAddView,
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

      {groups.length === 0 ? (
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
