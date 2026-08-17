"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ADDABLE_COLUMN_TYPES,
  BOARD_DEFAULT_GROUP_BY_ID,
  BOARD_VIEW_TYPES,
  BoardCalendar,
  BoardComingSoonView,
  BoardDiscussionDrawer,
  BoardDocView,
  BoardFileGalleryView,
  BoardInviteModal,
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
  KANBAN_COLORS,
  KANBAN_DEFAULT_LANE_OPTIONS,
  KanbanCardLabels,
  KanbanCardMembers,
  KanbanItemDrawer,
  PersonAvatarStack,
  useBoardDiscussionDrawer,
  useBoardItemDrawer,
  useBoardToolbar,
  type AddableColumnType,
  type BoardCalendarRange,
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
import { AttachmentIcon, CalendarViewIcon, CheckIcon, KanbanViewIcon, PlusIcon, RowChatIcon } from "@/icons/board-icons";
import { ChevronRightIcon, FolderIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import { useAuth } from "@/context/AuthContext";
import { useBoardViewTabs } from "@/hooks/useBoardViewTabs";
import { boardContentService } from "@/services/board-content.service";
import { boardInvitationService } from "@/services/board-invitation.service";
import type {
  BoardColumnConfig,
  BoardColumnDto,
  BoardGroupDto,
  BoardItemDetailDto,
  BoardItemDto,
  BoardItemValue,
  BoardViewDto,
} from "@/types/board-content";
import type { BoardAccessEntry } from "@/types/board-invitation";
import type { BoardDetail, BoardType } from "@/types/workspace";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";

export type WorkspaceViewProps = {
  /** The navigation node whose view is being rendered, plus the workspace it belongs to. */
  node: BoardDetail;
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

/**
 * A Kanban card's due-date pill: "Today" (flagged urgent) beats the usual
 * short "Nov 4" form, and a past-due date is flagged urgent too.
 *
 * A plain `YYYY-MM-DD` string parses as UTC midnight (`new Date(value)`),
 * but `toDateString()`/`toLocaleDateString()` read it back in the *local*
 * zone — west of UTC that rolls the calendar day back by one (a stored
 * "2026-08-06" reads as "Aug 5"). Parsing the y/m/d digits directly into a
 * *local* `Date` sidesteps the UTC round-trip entirely.
 */
const formatKanbanDueDate = (value: string): { label: string; urgent: boolean } => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return { label: value, urgent: false };
  const today = new Date();
  const start_of_today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const is_same_day = date.getTime() === start_of_today.getTime();
  return {
    label: is_same_day ? "Today" : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    urgent: date < new Date(start_of_today.getTime() + 24 * 60 * 60 * 1000),
  };
};

/** Resolves a node into the "Board info" popover content shown from its header chevron. */
const buildBoardInfo = (
  node: BoardDetail,
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
 * (see `view-registry.tsx`) renders through here, including Client Hub.
 * Composes the board kit (`BoardShell`/`BoardTable`/`BoardToolbar`/
 * `BoardItemDrawer`) driven by real data from `board-content.service.ts`,
 * with any number of tables (groups), a server-searchable item list, saved
 * views/tabs, and a drawer addressable at `/boards/{id}/pulses/{item_id}`.
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

  const [access, setAccess] = useState<BoardAccessEntry[]>([]);
  const [is_invite_open, setIsInviteOpen] = useState(false);

  // The "who can view this board" roster is board-level, not per-tab, so it's
  // fetched once per board rather than re-running on every `active_view_id`
  // tab switch like the columns/groups/items/views fetch below.
  useEffect(() => {
    let cancelled = false;
    setAccess([]);
    boardInvitationService
      .listAccess(node.id)
      .then((data) => {
        if (!cancelled) setAccess(data);
      })
      .catch(() => {
        // The header's invite count/roster just stays empty; not worth a
        // whole-board error state over.
      });
    return () => {
      cancelled = true;
    };
  }, [node.id]);

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
      <BoardShell
        header={{ title: node.label, is_favorite: node.is_favorite, invite_count: access.length, info, onInviteClick: () => setIsInviteOpen(true) }}
        tabs={{ primary_label: "Main table", views: [] }}
      >
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
        invite_count={access.length}
        onInviteClick={() => setIsInviteOpen(true)}
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
      <BoardInviteModal
        is_open={is_invite_open}
        onClose={() => setIsInviteOpen(false)}
        board_id={node.id}
        board_label={node.label}
        board_type={board_type}
        workspace_name={node.workspace.name}
        initial_access={access}
        onAccessChange={setAccess}
      />
    </>
  );
};

export default TableBoardView;

// ─────────────────────────────────────────────────────────────────────────────

type TableBoardBodyProps = {
  node: BoardDetail;
  breadcrumb: string[];
  workspace_slug: string;
  board_type: BoardType;
  info: BoardHeaderInfo;
  invite_count: number;
  onInviteClick: () => void;
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
  invite_count,
  onInviteClick,
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

  // ── Shared across Kanban/Calendar/the Kanban drawer's own detail rows ──
  // the board's first column of each relevant type drives that view's
  // structural axis: Kanban's lanes and Calendar's event color both come
  // from the first `status` column, Trello-style card "Labels"/Calendar
  // overflow chips from the first `tags` column, card/event "Members" from
  // the first `people` column, and Calendar's day placement from the first
  // (and, for a start+end range, second) `date` column. A row's membership
  // in all of these *is* just its value in that column, so dragging a card
  // between lanes or an event onto a new day is an ordinary cell edit
  // (`handleUpdateCellValue`) — no separate "lane"/"event" concept to keep
  // in sync.
  const board_status_column = columns.find((c) => c.type === "status") ?? null;
  const board_label_column = columns.find((c) => c.type === "tags") ?? null;
  const board_member_column = columns.find((c) => c.type === "people") ?? null;
  // A Kanban card's priority pill/left-border accent — a second `status`
  // column (the first one is already spoken for by the lanes) labeled
  // "Priority", so a board opts in just by adding one with that label; no
  // new column type or schema change needed.
  const board_priority_column =
    columns.find((c) => c.type === "status" && c.id !== board_status_column?.id && /priority/i.test(c.label)) ?? null;
  // A Kanban card's "mark complete" toggle — the board's first `checkbox`
  // column, mirroring how `board_status_column` etc pick "the first column
  // of that type". Optional: cards render without a toggle until one exists.
  const board_done_column = columns.find((c) => c.type === "checkbox") ?? null;
  const date_columns = useMemo(() => columns.filter((c) => c.type === "date"), [columns]);
  const board_date_column = date_columns[0] ?? null;
  const board_date_end_column = date_columns[1] ?? null;

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

  // ── Description — a first-class field on the item itself (like `name`),
  // not a column value, so it persists through `updateItem` rather than
  // `updateItemValues`. Debounced inside `useBoardItemDrawer` (mirrors
  // `BoardDocView`'s autosave), so this just needs to write straight through. ──
  const handleUpdateItemDescription = (item_id: string, description: string) => {
    const previous = items;
    setItems((current) => current.map((item) => (String(item.id) === item_id ? { ...item, description } : item)));
    boardContentService.updateItem(board_id, Number(item_id), { description }).catch(() => setItems(previous));
  };

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
      getDescription: (row) => row.description ?? "",
      onDescriptionChange: handleUpdateItemDescription,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.label, current_user.id, persons, board_id, getInfoBoxes]
  );

  const drawer = useBoardItemDrawer(drawer_config);

  // ── Board-wide discussion drawer ("Board updates") ──
  const discussion_drawer = useBoardDiscussionDrawer({
    board_id,
    current_user,
    mentionable_people: persons,
    breadcrumb_label: `${node.workspace.name} · ${node.label}`,
    initial_comment_count: node.comments_count,
    initial_has_unseen_comments: node.has_unseen_comments,
  });

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

  // Keeps the drawer in sync with `initial_open_item_id` (the board's
  // `/pulses/{item_id}` URL, read from `BoardRouteContext`) rather than only
  // opening it once on mount — since the board/view no longer remounts
  // between navigations (see `BoardRouteView`), this is what actually opens
  // the drawer for a fresh deep link, and what closes it again on browser
  // back/forward. Ordinary row clicks (`handleRowClick`) still open the
  // drawer synchronously themselves; this effect just no-ops for those once
  // the pushed URL round-trips back down as a matching `initial_open_item_id`.
  //
  // Deliberately NOT keyed on `drawer.open_row_id`: `router.push` inside
  // `handleRowClick` resolves a render or two after `drawer.openRow` sets
  // local state, so a row click produces one render where `open_row_id` has
  // already flipped to the clicked row but `initial_open_item_id` (still
  // read from the pre-navigation URL) hasn't caught up yet. Watching
  // `open_row_id` made that in-between render re-run this effect, hit the
  // `!initial_open_item_id` branch, and immediately close the drawer that
  // was just opened — then the *next* render (URL caught up) reopened it,
  // re-fetching its comments a second time. That open/close/reopen inside a
  // few milliseconds is what read as the table "flickering" or "reloading"
  // when clicking a row's checkbox/selection cell. Reading `drawer.open_row_id`
  // inside the effect body (without depending on it) still lets the
  // `!initial_open_item_id` branch close the drawer correctly — it now just
  // does so only when the URL itself changes (deep link, tab switch, browser
  // back/forward), which is the only case this effect needs to react to.
  useEffect(() => {
    if (!initial_open_item_id) {
      if (drawer.open_row_id != null) drawer.close();
      return;
    }
    if (String(initial_open_item_id) === drawer.open_row_id) return;
    const row = items.find((item) => item.id === initial_open_item_id);
    if (!row) return;
    drawer.openRow(row);
    fetchItemDetail(String(row.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, initial_open_item_id]);

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
      const has_comments = row.comment_count > 0;
      return (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleRowClick(row);
          }}
          aria-label={has_comments ? `${row.comment_count} comments, open item` : "Open item comments"}
          title={has_comments ? `${row.comment_count} comments` : "Comments"}
          className={`flex items-center gap-[3px] rounded-[4px] px-1 py-1 text-[11px] font-semibold transition-colors hover:bg-shell-hover ${
            has_comments ? "text-shell-text-muted" : "text-shell-text-faint"
          }`}
        >
          <RowChatIcon />
          {has_comments && row.comment_count}
        </button>
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

  // `board_status_column`/`board_label_column`/`board_member_column`/
  // `board_priority_column`/`board_done_column`/`board_date_column`/
  // `board_date_end_column` are declared earlier in this component (right
  // after `columns_by_id`) — see the comment there.
  const active_view_type: BoardViewKind = view_tabs.active_view?.view_type ?? "table";
  const active_doc_view = view_tabs.active_view;
  const filtered_rows = useMemo(() => toolbar.groups.flatMap((g) => g.rows), [toolbar.groups]);

  const kanban_lanes: BoardKanbanLane<BoardItemDto>[] = useMemo(() => {
    if (!board_status_column) return [];
    const column_id = String(board_status_column.id);
    const options = (board_status_column.config?.options ?? []).filter((o) => o.is_active !== false);
    const lanes: BoardKanbanLane<BoardItemDto>[] = options.map((option) => ({
      id: option.id,
      label: option.label,
      color: option.color,
      rows: filtered_rows.filter((row) => row.values[column_id] === option.id),
      renamable: true,
    }));
    const known_ids = new Set(options.map((o) => o.id));
    const unassigned = filtered_rows.filter((row) => {
      const value = row.values[column_id];
      return value == null || !known_ids.has(String(value));
    });
    if (unassigned.length > 0) {
      lanes.push({ id: "__none__", label: "No status", color: "#c4c4c4", rows: unassigned, renamable: false });
    }
    return lanes;
  }, [board_status_column, filtered_rows]);

  const renderKanbanCard = (row: BoardItemDto): React.ReactNode => {
    const excluded_column_ids = new Set(
      [
        board_status_column?.id,
        board_label_column?.id,
        board_member_column?.id,
        board_priority_column?.id,
        board_done_column?.id,
        board_date_column?.id,
      ].filter((id): id is number => id != null)
    );
    const other_columns = columns.filter((c) => !excluded_column_ids.has(c.id));

    const label_ids = board_label_column ? asStringArray(row.values[String(board_label_column.id)]) : [];
    const member_ids = board_member_column ? asStringArray(row.values[String(board_member_column.id)]) : [];
    const members = board_member_column ? node.owners.filter((owner) => member_ids.includes(String(owner.id))) : [];

    const priority_value = board_priority_column ? row.values[String(board_priority_column.id)] : null;
    const priority_option =
      board_priority_column && typeof priority_value === "string"
        ? (board_priority_column.config?.options ?? []).find((option) => option.id === priority_value) ?? null
        : null;

    const is_done = board_done_column ? row.values[String(board_done_column.id)] === true : false;
    const due_date_value = board_date_column ? row.values[String(board_date_column.id)] : null;
    const due_date = typeof due_date_value === "string" && due_date_value ? formatKanbanDueDate(due_date_value) : null;

    const has_meta_row = Boolean(priority_option || due_date || row.attachment_count > 0 || row.comment_count > 0 || board_member_column);

    return (
      <div
        className="flex flex-col"
        style={{ borderLeft: `3px solid ${priority_option?.color ?? KANBAN_COLORS.border_default}` }}
      >
        <div className="flex flex-col" style={{ padding: "11px 12px 10px" }}>
          <div className="flex items-start gap-2">
            {board_done_column && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleUpdateCellValue(row.id, String(board_done_column.id), !is_done);
                }}
                aria-label={is_done ? "Mark incomplete" : "Mark complete"}
                title={is_done ? "Mark incomplete" : "Mark complete"}
                className="mt-px flex h-4 w-4 flex-none items-center justify-center rounded-full border-[1.6px] transition-colors"
                style={is_done ? { background: KANBAN_COLORS.success, borderColor: KANBAN_COLORS.success } : { borderColor: KANBAN_COLORS.text_hairline }}
              >
                {is_done && <CheckIcon size={9} className="text-white" />}
              </button>
            )}

            {editing_item_id === row.id ? (
              <InlineTitleEditor
                value={row.name}
                onCommit={(name) => handleRenameItem(row.id, name)}
                onCancel={() => setEditingItemId(null)}
                className="w-full min-w-0 text-[13.5px] font-bold"
                style={{ color: KANBAN_COLORS.text_strong }}
                aria_label="Rename item"
              />
            ) : (
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  setEditingItemId(row.id);
                }}
                className="min-w-0 flex-1 cursor-text text-[13.5px] font-bold leading-snug"
                style={{ color: is_done ? KANBAN_COLORS.text_faded : KANBAN_COLORS.text_strong, textDecoration: is_done ? "line-through" : "none" }}
                title="Click to rename"
              >
                {row.name}
              </span>
            )}
            <span className="mt-px flex-none" style={{ color: KANBAN_COLORS.text_hairline }}>
              <MoreDotsIcon size={13} />
            </span>
          </div>

          {board_label_column && (
            <div style={{ margin: "8px 0 9px", paddingLeft: 24 }}>
              <KanbanCardLabels
                options={board_label_column.config?.options ?? []}
                selected_ids={label_ids}
                onToggle={(option_id) => {
                  const next = label_ids.includes(option_id)
                    ? label_ids.filter((id) => id !== option_id)
                    : [...label_ids, option_id];
                  void handleUpdateCellValue(row.id, String(board_label_column.id), next.length ? next : null);
                }}
                onCreateOption={(option) => handleAddColumnOption(String(board_label_column.id), option)}
                onEditOptions={makeOptionActions(String(board_label_column.id))}
              />
            </div>
          )}

          {has_meta_row && (
            <div
              className="flex flex-wrap items-center gap-1.5"
              style={{ paddingLeft: 24 }}
              onClick={(event) => event.stopPropagation()}
            >
              {priority_option && (
                <span
                  className="rounded-[5px] px-1.5 py-[3px] text-[10.5px] font-bold"
                  style={{ background: `${priority_option.color}1A`, color: priority_option.color }}
                >
                  {priority_option.label}
                </span>
              )}
              {due_date && (
                <span
                  className="flex items-center gap-1 rounded-[5px] px-1.5 py-[3px] text-[11.5px] font-semibold"
                  style={
                    due_date.urgent && !is_done
                      ? { background: KANBAN_COLORS.danger_bg, color: KANBAN_COLORS.red }
                      : { background: KANBAN_COLORS.chip_bg, color: KANBAN_COLORS.text_faint }
                  }
                >
                  <CalendarViewIcon size={11} />
                  {due_date.label}
                </span>
              )}
              {row.attachment_count > 0 && (
                <span className="flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: KANBAN_COLORS.text_placeholder }}>
                  <AttachmentIcon size={11} />
                  {row.attachment_count}
                </span>
              )}
              {row.comment_count > 0 && (
                <span className="flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: KANBAN_COLORS.text_placeholder }}>
                  <RowChatIcon size={11} />
                  {row.comment_count}
                </span>
              )}
              {board_member_column && (
                <span className="ml-auto flex-none">
                  <KanbanCardMembers
                    people={node.owners}
                    selected={members}
                    onToggle={(person_id) => {
                      const next = member_ids.includes(person_id)
                        ? member_ids.filter((id) => id !== person_id)
                        : [...member_ids, person_id];
                      void handleUpdateCellValue(row.id, String(board_member_column.id), next.length ? next : null);
                    }}
                  />
                </span>
              )}
            </div>
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
        </div>
      </div>
    );
  };

  /** Guarantees an item has a table (group) to belong to even when the active tab (Kanban/Calendar) has never opened the Table tab — auto-creates one silently. */
  const ensureBoardGroup = async (): Promise<BoardGroupDto | null> => {
    if (groups[0]) return groups[0];
    if (view_tabs.active_view_id == null) return null;
    const created = await boardContentService.createGroup(board_id, { view_id: view_tabs.active_view_id, name: "Board" });
    setGroups((current) => [...current, created]);
    return created;
  };

  const handleMoveKanbanCard = (row_id: string, lane_id: string) => {
    if (!board_status_column) return;
    handleUpdateCellValue(Number(row_id), String(board_status_column.id), lane_id === "__none__" ? null : lane_id);
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
    for (const row of filtered_rows) {
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
    const target_group = await ensureBoardGroup();
    if (!target_group) return;
    const values =
      board_status_column && lane_id !== "__none__" ? { [String(board_status_column.id)]: lane_id } : undefined;
    const created = await boardContentService.createItem(board_id, { name: title, group_id: target_group.id, values });
    setItems((current) => [...current, created]);
    setAddingKanbanLaneId(null);
  };

  const handleAddKanbanLane = () => {
    if (!board_status_column) return;
    const next_index = board_status_column.config?.options?.length ?? 0;
    void handleAddColumnOption(String(board_status_column.id), {
      label: `New lane ${next_index + 1}`,
      color: COLUMN_OPTION_PALETTE[next_index % COLUMN_OPTION_PALETTE.length],
    });
  };

  const handleRenameKanbanLane = (lane_id: string, label: string) => {
    if (!board_status_column) return;
    makeOptionActions(String(board_status_column.id)).onRename(lane_id, label);
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

  // ── Calendar ── events are positioned by the board's first Date column
  // (an optional second Date column becomes the range's end, e.g. "Start
  // date"/"Due date"); a card's day *is* its value in that column, so
  // dragging an event onto a new day is an ordinary cell edit, same as
  // Kanban's lane drag. Color comes from the same first Status column
  // Kanban uses (falling back to the Date column's own swatch blue when the
  // board has no status column), and "Members" reuses the same first People
  // column and avatar stack Kanban cards use. ──
  const getCalendarRowRange = (row: BoardItemDto): BoardCalendarRange | null => {
    if (!board_date_column) return null;
    const start = row.values[String(board_date_column.id)];
    if (typeof start !== "string" || !start) return null;
    const end = board_date_end_column ? row.values[String(board_date_end_column.id)] : null;
    return { start, end: typeof end === "string" && end ? end : null };
  };

  const getCalendarRowColor = (row: BoardItemDto): string => {
    if (!board_status_column) return COLUMN_KIND_SWATCH.date.accent_color;
    const value = row.values[String(board_status_column.id)];
    const option = (board_status_column.config?.options ?? []).find((o) => o.id === value);
    return option?.color ?? "#c4c4c4";
  };

  const renderCalendarEvent = (row: BoardItemDto): React.ReactNode => {
    const member_ids = board_member_column ? asStringArray(row.values[String(board_member_column.id)]) : [];
    const members = board_member_column ? node.owners.filter((owner) => member_ids.includes(String(owner.id))) : [];

    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-shell-text">{row.name}</span>
        {members.length > 0 && <PersonAvatarStack people={members} size={16} max_visible={3} />}
      </div>
    );
  };

  const handleMoveCalendarEvent = (row_id: string, new_start: string, new_end: string) => {
    if (!board_date_column) return;
    void handleUpdateCellValue(Number(row_id), String(board_date_column.id), new_start);
    if (board_date_end_column) {
      void handleUpdateCellValue(Number(row_id), String(board_date_end_column.id), new_end);
    }
  };

  const handleAddCalendarEvent = async (date: string) => {
    const target_group = await ensureBoardGroup();
    if (!target_group || !board_date_column) return;
    const created = await boardContentService.createItem(board_id, {
      name: "New item",
      group_id: target_group.id,
      values: { [String(board_date_column.id)]: date },
    });
    setItems((current) => [...current, created]);
    handleRowClick(created);
  };

  /**
   * A brand-new Calendar tab has no Date column yet — offer to add one
   * instead of showing an empty grid, mirroring `handleStartKanbanBoard`.
   */
  const handleStartCalendarBoard = () => {
    const date_type = ADDABLE_COLUMN_TYPES.find((type) => type.kind === "date");
    if (!date_type) return;
    void handleAddColumn(date_type);
  };

  // ── Kanban's own drawer — a literal reproduction of the mockup's single-panel
  // task drawer (see `KanbanItemDrawer`), not the richer tabbed `BoardItemDrawer`
  // every other view (Table/Calendar) keeps using. Every field still writes
  // through the exact same real persistence (`handleUpdateCellValue`/
  // `handleRenameItem`) as the card and the table cell it's mirrored from. ──
  const kanban_open_row = active_view_type === "kanban" ? items.find((item) => String(item.id) === drawer.open_row_id) ?? null : null;
  const kanban_open_row_member_ids = board_member_column && kanban_open_row ? asStringArray(kanban_open_row.values[String(board_member_column.id)]) : [];
  const kanban_open_row_label_ids = board_label_column && kanban_open_row ? asStringArray(kanban_open_row.values[String(board_label_column.id)]) : [];

  return (
    <BoardShell
      header={{
        title: node.label,
        is_favorite: node.is_favorite,
        invite_count,
        info,
        onInviteClick,
        onBoardUpdatesClick: discussion_drawer.open,
        board_updates_count: discussion_drawer.comment_count,
        board_updates_unseen: discussion_drawer.has_unseen_comments,
      }}
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
      toolbar={
        // A Doc or Files Gallery tab has no items/columns to search, filter or
        // sort — the item-grid toolbar would be pure noise above either one
        // (Files Gallery renders its own dedicated toolbar instead).
        active_view_type === "doc" || active_view_type === "file_gallery" ? undefined : (
          <BoardToolbar toolbar={toolbar} onNewItem={handleNewItemAtTop} />
        )
      }
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

      {/* A Doc tab's own header (creator/created/updated) already anchors it — the
          parent-path breadcrumb above the item-grid views would just be noise here. */}
      {active_view_type !== "doc" && breadcrumb.length > 1 && (
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
        board_status_column ? (
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
      ) : active_view_type === "calendar" ? (
        board_date_column ? (
          <BoardCalendar<BoardItemDto>
            rows={filtered_rows}
            getRowId={(row) => String(row.id)}
            getRowRange={getCalendarRowRange}
            getRowColor={getCalendarRowColor}
            renderEvent={renderCalendarEvent}
            onSelectEvent={handleRowClick}
            selectedRowId={drawer.open_row_id}
            onMoveEvent={handleMoveCalendarEvent}
            resizable={Boolean(board_date_end_column)}
            onAddEvent={handleAddCalendarEvent}
          />
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
              <CalendarViewIcon size={26} />
            </span>
            <h2 className="text-lg font-semibold text-shell-text">Set up your Calendar</h2>
            <p className="text-[13.5px] text-shell-text-muted">
              Calendar events come from a Date column — add one to place items on the calendar.
            </p>
            <button
              type="button"
              onClick={handleStartCalendarBoard}
              className="flex items-center gap-1.5 rounded-[7px] border border-shell-border px-2.5 py-1.5 text-[12.5px] font-medium text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
            >
              <PlusIcon size={13} />
              Add Date column
            </button>
          </div>
        )
      ) : active_view_type === "doc" && active_doc_view ? (
        <BoardDocView
          view={active_doc_view}
          onSaveDocContent={(doc_content) => view_tabs.updateDocContent(active_doc_view.id, doc_content)}
          onUploadImage={(file) => boardContentService.uploadDocImage(board_id, active_doc_view.id, file)}
        />
      ) : active_view_type === "file_gallery" && active_doc_view ? (
        <BoardFileGalleryView board_id={board_id} view_id={active_doc_view.id} />
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

      {active_view_type === "kanban" ? (
        <KanbanItemDrawer<BoardItemDto>
          drawer={{ ...drawer, close: handleDrawerClose }}
          title={kanban_open_row?.name ?? ""}
          onRenameTitle={(name) => kanban_open_row && handleRenameItem(kanban_open_row.id, name)}
          is_done={board_done_column && kanban_open_row ? kanban_open_row.values[String(board_done_column.id)] === true : false}
          onToggleDone={
            board_done_column && kanban_open_row
              ? () =>
                  handleUpdateCellValue(
                    kanban_open_row.id,
                    String(board_done_column.id),
                    !(kanban_open_row.values[String(board_done_column.id)] === true)
                  )
              : undefined
          }
          people={
            board_member_column
              ? {
                  roster: node.owners,
                  selected: node.owners.filter((owner) => kanban_open_row_member_ids.includes(String(owner.id))),
                  onToggle: (person_id) => {
                    if (!kanban_open_row) return;
                    const next = kanban_open_row_member_ids.includes(person_id)
                      ? kanban_open_row_member_ids.filter((id) => id !== person_id)
                      : [...kanban_open_row_member_ids, person_id];
                    void handleUpdateCellValue(kanban_open_row.id, String(board_member_column.id), next.length ? next : null);
                  },
                }
              : undefined
          }
          due_date={
            board_date_column
              ? {
                  value: kanban_open_row && typeof kanban_open_row.values[String(board_date_column.id)] === "string" ? (kanban_open_row.values[String(board_date_column.id)] as string) : null,
                  onChange: (value) => kanban_open_row && void handleUpdateCellValue(kanban_open_row.id, String(board_date_column.id), value),
                }
              : undefined
          }
          priority={
            board_priority_column
              ? {
                  options: board_priority_column.config?.options ?? [],
                  selected_id: kanban_open_row && typeof kanban_open_row.values[String(board_priority_column.id)] === "string" ? (kanban_open_row.values[String(board_priority_column.id)] as string) : null,
                  onSelect: (option_id) => kanban_open_row && void handleUpdateCellValue(kanban_open_row.id, String(board_priority_column.id), option_id),
                }
              : undefined
          }
          project={
            board_label_column
              ? {
                  options: board_label_column.config?.options ?? [],
                  selected_ids: kanban_open_row_label_ids,
                  onToggle: (option_id) => {
                    if (!kanban_open_row) return;
                    const next = kanban_open_row_label_ids.includes(option_id)
                      ? kanban_open_row_label_ids.filter((id) => id !== option_id)
                      : [...kanban_open_row_label_ids, option_id];
                    void handleUpdateCellValue(kanban_open_row.id, String(board_label_column.id), next.length ? next : null);
                  },
                  onCreateOption: (option) => handleAddColumnOption(String(board_label_column.id), option),
                }
              : undefined
          }
        />
      ) : (
        <BoardItemDrawer drawer={{ ...drawer, close: handleDrawerClose }} />
      )}

      <BoardDiscussionDrawer drawer={discussion_drawer} />
    </BoardShell>
  );
};
