"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ADDABLE_COLUMN_TYPES,
  BOARD_DEFAULT_GROUP_BY_ID,
  BOARD_VIEW_TYPES,
  BoardCalendar,
  BoardChartView,
  BoardComingSoonView,
  BoardDiscussionDrawer,
  BoardDocView,
  BoardFileGalleryView,
  BoardInviteModal,
  BoardItemDrawer,
  BoardKanban,
  BoardPopover,
  BoardShell,
  BoardTable,
  BoardToolbar,
  ChangeBoardTypeModal,
  COLUMN_KIND_SWATCH,
  COLUMN_OPTION_PALETTE,
  TABLE_KIND_TO_ENGINE_KIND,
  DependencyPickerList,
  GanttChart,
  InlineTitleEditor,
  KANBAN_COLORS,
  KANBAN_DEFAULT_LANE_OPTIONS,
  KanbanCardLabels,
  KanbanCardMembers,
  KanbanItemDrawer,
  PersonAvatarStack,
  parseIsoDate,
  toIsoDate,
  useBoardDiscussionDrawer,
  useBoardItemDrawer,
  useBoardToolbar,
  type AddableColumnType,
  type BoardCalendarRange,
  type BoardCellItemOption,
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
  type BoardTableGroup,
  type BoardTableItem,
  type BoardTableNode,
  type BoardToolbarConfig,
  type BoardViewKind,
  type ColumnDef as TableColumnDef,
  type ColumnKind as TableColumnKind,
  type ColumnScope as TableColumnScope,
  type PersonDef as TablePersonDef,
  type ReorderPayload as TableReorderPayload,
  type UseBoardTableConfig,
} from "@/components/board";
import { AVATAR_COLORS } from "@/components/board/TeamAvatars";
import {
  AttachmentIcon,
  CalendarViewIcon,
  CheckIcon,
  GanttViewIcon,
  KanbanViewIcon,
  LinkIcon,
  PlusIcon,
  RowChatIcon,
} from "@/icons/board-icons";
import { ChevronRightIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import { useAuth } from "@/context/AuthContext";
import { useBoardViewTabs } from "@/hooks/useBoardViewTabs";
import { boardContentService } from "@/services/board-content.service";
import { boardInvitationService } from "@/services/board-invitation.service";
import { workspaceService } from "@/services/workspace.service";
import type {
  BoardColumnConfig,
  BoardColumnDto,
  BoardColumnScope,
  BoardGroupDto,
  BoardItemDetailDto,
  BoardItemDto,
  BoardItemValue,
  BoardViewDto,
} from "@/types/board-content";
import type { BoardAccessEntry } from "@/types/board-invitation";
import type { BoardDetail, BoardType, WorkspaceMember } from "@/types/workspace";
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

/**
 * The Table view's own `ColumnKind` enum (`@/components/board/table`) is
 * almost, but not quite, the engine's `BoardColumnType`: `"long_text"` here
 * is `"longtext"` there, and `"dependency"` (Gantt-only, no Table cell
 * renderer) has no counterpart at all.
 */
const TABLE_COLUMN_KIND: Partial<Record<BoardColumnDto["type"], TableColumnDef["kind"]>> = {
  text: "text",
  long_text: "longtext",
  status: "status",
  people: "people",
  date: "date",
  tags: "tags",
  dropdown: "dropdown",
  number: "number",
  checkbox: "checkbox",
  timeline: "timeline",
  label: "label",
  progress: "progress",
  phone: "phone",
  email: "email",
};

/** Real per-column option → the Table view's own option shape (`id`/`label`/`color`), used for status/label/dropdown/tags cells. */
const toTableOptions = (column: BoardColumnDto): TableColumnDef["options"] =>
  column.config?.options?.map((option) => ({ id: option.id, label: option.label, color: option.color }));

/** `null` for a column kind the Table view has no cell renderer for (currently just `dependency`) — filtered out of `table_base_columns`/`table_sub_base_columns`. */
const toTableColumnDef = (column: BoardColumnDto): TableColumnDef | null => {
  const kind = TABLE_COLUMN_KIND[column.type];
  if (!kind) return null;
  return { id: String(column.id), title: column.label, kind, width: column.width, options: toTableOptions(column) };
};

/**
 * `items` is a tree (each root's `children` holds its subitems, recursively),
 * not a flat list — a subitem's id never appears at the top level. These
 * three helpers let every per-item mutation handler (rename, edit a cell,
 * delete, ...) find/update/remove an item regardless of how deep it's
 * nested, without each handler having to walk the tree itself.
 */
const mapItemInTree = (
  items: BoardItemDto[],
  item_id: number,
  updater: (item: BoardItemDto) => BoardItemDto
): BoardItemDto[] =>
  items.map((item) =>
    item.id === item_id
      ? updater(item)
      : item.children.length
        ? { ...item, children: mapItemInTree(item.children, item_id, updater) }
        : item
  );

const removeItemFromTree = (items: BoardItemDto[], item_id: number): BoardItemDto[] =>
  items
    .filter((item) => item.id !== item_id)
    .map((item) => (item.children.length ? { ...item, children: removeItemFromTree(item.children, item_id) } : item));

const findItemInTree = (items: BoardItemDto[], item_id: number): BoardItemDto | undefined => {
  for (const item of items) {
    if (item.id === item_id) return item;
    const found = findItemInTree(item.children, item_id);
    if (found) return found;
  }
  return undefined;
};

/** The direct parent of `item_id` in the tree, or undefined for a root item / an id not found. */
const findParentInTree = (items: BoardItemDto[], item_id: number): BoardItemDto | undefined => {
  for (const item of items) {
    if (item.children.some((child) => child.id === item_id)) return item;
    const found = findParentInTree(item.children, item_id);
    if (found) return found;
  }
  return undefined;
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

  // The full assignable roster for People columns (Kanban's Assignee row,
  // the Table view's People cells, the Calendar's event members, etc), the
  // whole workspace, not just `node.owners` (which is only the handful of
  // members with the "owner" pivot role and previously left everyone else
  // unselectable/unresolvable). Seeded with `node.owners` (mapped onto the
  // richer `WorkspaceMember` shape with placeholder fields) so the roster
  // isn't empty for the one paint before the real fetch below resolves.
  const [workspace_members, setWorkspaceMembers] = useState<WorkspaceMember[]>(() =>
    node.owners.map((owner) => ({
      id: owner.id,
      full_name: owner.full_name,
      profile_photo_url: owner.profile_photo_url,
      email: "",
      role: null,
      is_recent: false,
      invited_by: null,
      joined_at: null,
    }))
  );
  useEffect(() => {
    let cancelled = false;
    workspaceService
      .getWorkspaceMembers(node.workspace.slug)
      .then((data) => {
        if (!cancelled) setWorkspaceMembers(data);
      })
      .catch(() => {
        // Keep the `node.owners` seed on failure rather than clearing the roster.
      });
    return () => {
      cancelled = true;
    };
  }, [node.workspace.slug]);

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
        tabs={{ primary_label: "Main board", views: [] }}
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
        board_type={board_type}
        info={info}
        invite_count={access.length}
        workspace_members={workspace_members}
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
  board_type: BoardType;
  info: BoardHeaderInfo;
  invite_count: number;
  onInviteClick: () => void;
  /** The full workspace roster, assignable to People columns (Assignee row, People cells, Calendar members, etc), see the fetch in `TableBoardView`. */
  workspace_members: WorkspaceMember[];
  initial_columns: BoardColumnDto[];
  initial_groups: BoardGroupDto[];
  initial_items: BoardItemDto[];
  initial_views: BoardViewDto[];
  initial_active_view_id: number | null;
  initial_personal_order: number[] | null;
  initial_open_item_id: number | null;
};

/**
 * The Gantt view's left-panel row content: name + timeline range, plus a
 * compact "link" trigger for the row's Dependency cell. A real component
 * (not a plain function returning JSX, like every other view's row
 * renderer) purely so it can hold its own popover-open/search state —
 * neither Table's grid nor the item drawer render inside a Gantt tab, so
 * this is the *only* place a Gantt tab can actually author dependencies.
 */
const GanttRowLabel: React.FC<{
  row: BoardItemDto;
  range: BoardCalendarRange | null;
  dependency_ids: string[];
  dependency_candidates: BoardCellItemOption[];
  onCommitDependencies: (value: string[] | null) => void;
  formatDate: (value: string) => string;
}> = ({ row, range, dependency_ids, dependency_candidates, onCommitDependencies, formatDate }) => {
  const [anchor_el, setAnchorEl] = useState<HTMLElement | null>(null);

  const toggle = (item_id: string) => {
    const next = dependency_ids.includes(item_id)
      ? dependency_ids.filter((id) => id !== item_id)
      : [...dependency_ids, item_id];
    onCommitDependencies(next.length ? next : null);
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <span className="truncate text-[13px] font-medium text-shell-text">{row.name}</span>
        {range && (
          <span className="truncate text-[11px] text-shell-text-muted">
            {formatDate(range.start)}
            {range.end && range.end !== range.start ? ` → ${formatDate(range.end)}` : ""}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setAnchorEl(event.currentTarget);
        }}
        title="Dependencies"
        className={`flex flex-none items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10.5px] font-semibold transition-colors ${
          dependency_ids.length > 0
            ? "border-brand-500/40 bg-brand-500/10 text-brand-500"
            : "border-shell-border text-shell-text-faint hover:bg-shell-hover"
        }`}
      >
        <LinkIcon size={10} />
        {dependency_ids.length > 0 && dependency_ids.length}
      </button>
      <BoardPopover anchor_el={anchor_el} is_open={anchor_el !== null} onClose={() => setAnchorEl(null)} align="start" width={260}>
        <DependencyPickerList items={dependency_candidates} selected_ids={dependency_ids} onToggle={toggle} />
      </BoardPopover>
    </div>
  );
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
  invite_count,
  onInviteClick,
  workspace_members,
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

  const [editing_item_id, setEditingItemId] = useState<number | null>(null);
  const [item_column_label] = useState(node.item_column_label ?? "Item");
  const [adding_kanban_lane_id, setAddingKanbanLaneId] = useState<string | null>(null);

  const columns_by_id = useMemo(
    () => Object.fromEntries(columns.map((c) => [String(c.id), c])),
    [columns]
  );
  // Every root-item-scoped column — drives Kanban's structural lanes and the toolbar.
  const item_columns = useMemo(() => columns.filter((c) => c.scope === "item"), [columns]);
  const people_names_by_id = useMemo(
    () => Object.fromEntries(workspace_members.map((o) => [String(o.id), o.full_name])),
    [workspace_members]
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
  const board_status_column = item_columns.find((c) => c.type === "status") ?? null;
  const board_label_column = item_columns.find((c) => c.type === "tags") ?? null;
  const board_member_column = item_columns.find((c) => c.type === "people") ?? null;
  // A Kanban card's priority pill/left-border accent — a second `status`
  // column (the first one is already spoken for by the lanes) labeled
  // "Priority", so a board opts in just by adding one with that label; no
  // new column type or schema change needed.
  const board_priority_column =
    item_columns.find((c) => c.type === "status" && c.id !== board_status_column?.id && /priority/i.test(c.label)) ?? null;
  // A Kanban card's "mark complete" toggle — the board's first `checkbox`
  // column, mirroring how `board_status_column` etc pick "the first column
  // of that type". Optional: cards render without a toggle until one exists.
  const board_done_column = item_columns.find((c) => c.type === "checkbox") ?? null;
  const date_columns = useMemo(() => item_columns.filter((c) => c.type === "date"), [item_columns]);
  const board_date_column = date_columns[0] ?? null;
  const board_date_end_column = date_columns[1] ?? null;
  // The Gantt view's bars are driven by a `timeline` column instead — one
  // column storing a `{start, end}` range together, mirroring monday.com's
  // own Timeline column (a plain `date` column, by contrast, is a single
  // point in time — fine for Calendar, but a Gantt bar needs both ends from
  // one place so a drag/resize is one atomic write, not two column writes
  // that can race). The board's first `dependency` column drives the Gantt
  // view's arrows and Finish-to-Start auto-reschedule.
  const board_timeline_column = item_columns.find((c) => c.type === "timeline") ?? null;
  const board_dependency_column = item_columns.find((c) => c.type === "dependency") ?? null;

  // Every column beyond the six special slots above — rendered as generic
  // "Properties" on a Kanban card (a few, inline) and in the Kanban drawer
  // (the full set, with add/remove), mirroring how `board_columns` lists
  // everything for the Table view.
  const other_kanban_columns = useMemo(() => {
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
    return item_columns.filter((c) => !excluded_column_ids.has(c.id));
  }, [item_columns, board_status_column, board_label_column, board_member_column, board_priority_column, board_done_column, board_date_column]);

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
      ...item_columns.map((c) => ({
        id: String(c.id),
        label: c.label,
        width: c.width,
        hideable: c.hideable,
        pinnable: c.pinnable,
        swatch: COLUMN_KIND_SWATCH[c.type],
        full_label: c.label,
        // The same board-wide "Priority" status column Kanban gives a border
        // accent to (see `board_priority_column` above) renders as a
        // bordered, centered pill here instead of the default full-bleed
        // fill, matching the design's Status vs. Priority treatment — so
        // unlike a regular Status column it keeps the cell's own padding
        // instead of bleeding edge-to-edge.
        bleed: c.type === "status" && c.id !== board_priority_column?.id,
        align: (c.type === "checkbox" || c.type === "number" ? "center" : undefined) as "center" | undefined,
        pill_style: (c.id === board_priority_column?.id ? "outline" : undefined) as "outline" | undefined,
      })),
    ];
  }, [item_columns, item_column_label, board_priority_column]);

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
    () => item_columns.filter((c) => c.type === "people").map((c) => String(c.id)),
    [item_columns]
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
      workspace_members.map((member, index) => ({
        id: String(member.id),
        name: member.full_name,
        initials: getInitials(member.full_name),
        avatar_seed: index,
      })),
    [workspace_members]
  );

  const sort_options: BoardSortOption<BoardItemDto>[] = useMemo(
    () => [
      { id: ITEM_COLUMN_ID, label: "Name", getValue: (row) => row.name },
      ...item_columns.map((c) => ({
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
    [item_columns]
  );

  const group_by_options: BoardGroupByOption<BoardItemDto>[] = useMemo(() => {
    const options: BoardGroupByOption<BoardItemDto>[] = [{ id: BOARD_DEFAULT_GROUP_BY_ID, label: "Default tables" }];
    item_columns
      .filter((c) => (c.type === "status" || c.type === "label") && c.config?.options?.length)
      .forEach((c) => {
        const option_by_id = new Map((c.config?.options ?? []).map((o) => [o.id, o]));
        options.push({
          id: String(c.id),
          label: `By ${c.label}`,
          swatch: COLUMN_KIND_SWATCH[c.type],
          getGroupKey: (row) => String(row.values[String(c.id)] ?? "none"),
          getGroupLabel: (key) => option_by_id.get(key)?.label ?? "No status",
          getGroupColor: (key) => option_by_id.get(key)?.color ?? "#c4c4c4",
        });
      });
    return options;
  }, [item_columns]);

  const quick_filter_facets: BoardQuickFilterFacet<BoardItemDto>[] = useMemo(
    () =>
      item_columns
        .filter((c) => (c.type === "status" || c.type === "tags" || c.type === "label") && c.config?.options?.length)
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
    [item_columns]
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
  const handleChangeViewEmoji = (id: number | string, emoji: string | null) => view_tabs.changeViewEmoji(Number(id), emoji);
  const handleDeleteView = (id: number | string) => view_tabs.deleteView(Number(id));

  // ── Rename item — used by Kanban's card-title inline editor. Only the name
  // field is merged back in (not the whole server item) so a stale
  // `comment_count`/`values` response can't clobber what's already known
  // client-side. ──
  const handleRenameItem = async (item_id: number, name: string) => {
    const updated = await boardContentService.updateItem(board_id, item_id, { name });
    setItems((current) => mapItemInTree(current, item_id, (item) => ({ ...item, name: updated.name })));
    setEditingItemId(null);
  };

  // ── "New item" toolbar button — always inserts at the very top of the first table ──
  const handleNewItemAtTop = async () => {
    // Falls back to `ensureBoardGroup` (auto-creating a "Board" table) rather
    // than no-op'ing, so the toolbar's "New item" button also works on a
    // brand-new Gantt/Calendar tab that's never had its Table tab opened and
    // has no group-creation affordance of its own yet.
    const target_group = groups[0] ?? (await ensureBoardGroup());
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
  // labels instead). `scope` defaults to "item" (the Kanban drawer's own
  // "add property" call site only ever adds item-scoped columns); the Table
  // view's own "+" gallery (see `handleAddTableColumn` below) passes it
  // explicitly to also support its subitem header's "+" button. ──
  const handleAddColumn = async (
    type: Pick<AddableColumnType, "kind" | "label" | "default_width">,
    scope: BoardColumnScope = "item",
    config?: BoardColumnConfig,
    position?: number
  ) => {
    if (view_tabs.active_view_id == null) return;
    // `key` must be unique per tab and match `^[a-z0-9_]+$` — the kind plus a
    // timestamp satisfies both without a round-trip to check for collisions.
    const created = await boardContentService.createColumn(board_id, {
      view_id: view_tabs.active_view_id,
      key: `${type.kind}_${Date.now()}`,
      label: type.label,
      type: type.kind,
      scope,
      width: type.default_width,
      config,
      position,
    });
    setColumns((current) => [...current, created]);
  };

  // ── Add column — the Table view's own "+" gallery (`ColumnPicker`, main or
  // subitem header) speaks the Table package's own `ColumnKind` vocabulary
  // (e.g. "longtext"), not the engine's `BoardColumnKind` ("long_text")
  // `handleAddColumn` above expects — see `TABLE_COLUMN_KIND`'s doc comment
  // for why the two differ. `TABLE_KIND_TO_ENGINE_KIND` (the reverse of
  // `TABLE_COLUMN_KIND`) bridges that, so `BoardTable`'s `onAddColumn` prop
  // can hand this straight to `handleAddColumn` without the Table package
  // ever needing to know the engine's own type vocabulary. ──
  const handleAddTableColumn = (_group_key: string, scope: TableColumnScope, kind: TableColumnKind, label: string, width: number) =>
    handleAddColumn({ kind: TABLE_KIND_TO_ENGINE_KIND[kind], label, default_width: width }, scope === "sub" ? "subitem" : "item");

  // ── Column-header menu — "Duplicate column"/"Add column to the right" both
  // create a new column id, so (like `handleAddTableColumn` above) they await
  // the real API call and let the resync effect off `table_config.initial_groups`
  // bring the new column in, rather than mutating `BoardTable`'s local state. ──
  const handleDuplicateTableColumn = async (_group_key: string, _scope: TableColumnScope, column_id: string) => {
    const created = await boardContentService.duplicateColumn(board_id, Number(column_id), false);
    setColumns((current) => [...current, created]);
  };

  const handleAddColumnRight = async (
    _group_key: string,
    scope: TableColumnScope,
    after_column_id: string,
    kind: TableColumnKind,
    label: string,
    width: number
  ) => {
    const after = columns_by_id[after_column_id];
    await handleAddColumn(
      { kind: TABLE_KIND_TO_ENGINE_KIND[kind], label, default_width: width },
      scope === "sub" ? "subitem" : "item",
      undefined,
      after ? after.position + 1 : undefined
    );
  };

  // ── Column-header menu's "Filter"/"Group by" rows — bridge into the
  // toolbar's own Filter/Group-by state, which `BoardTable` (a sibling of the
  // toolbar, not a descendant) has no access to on its own. ──
  const handleRequestColumnFilter = (column_id: string) => {
    toolbar.setFilterMode("advanced");
    toolbar.addAdvancedFilterRowForColumn(column_id);
    toolbar.openPanel("filter");
  };

  const handleRequestGroupByColumn = (column_id: string) => {
    toolbar.setGroupByOptionId(column_id);
  };

  // ── Remove a property from the Kanban drawer's generic "Properties"
  // section — deletes the backing column outright (and its values on every
  // item). ──
  const handleRemoveKanbanProperty = async (column_id: string) => {
    await boardContentService.deleteColumn(board_id, Number(column_id));
    setColumns((current) => current.filter((c) => String(c.id) !== column_id));
  };

  // ── Inline cell edit — optimistically writes the new value, then persists it,
  // reverting the whole item list if the request fails. ──
  const handleUpdateCellValue = async (item_id: number, column_id: string, value: BoardItemValue) => {
    const previous = items;
    setItems((current) =>
      mapItemInTree(current, item_id, (item) => ({ ...item, values: { ...item.values, [column_id]: value } }))
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
            { label: "Group", value: group?.name ?? "—" },
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
    setItems((current) => mapItemInTree(current, Number(item_id), (item) => ({ ...item, description })));
    boardContentService.updateItem(board_id, Number(item_id), { description }).catch(() => setItems(previous));
  };

  // ── Kanban card "Subtasks" checklist — piggybacks on `item_detail_by_id`
  // (already fetched by `fetchItemDetail` whenever a row's drawer opens, for
  // the Info Boxes tab) for the full per-item list, and mirrors
  // `handleUpdateItemDescription`'s optimistic-update-then-rollback pattern
  // for both that cached detail and `items`' `checklist_total_count`/
  // `checklist_done_count` (so the Kanban card's "✓ done/total" badge stays
  // live without waiting on a refetch). ──
  const handleAddChecklistItem = (item_id: string, label: string) => {
    boardContentService
      .createChecklistItem(board_id, Number(item_id), { label })
      .then((created) => {
        setItemDetailById((current) => {
          const detail = current[item_id];
          if (!detail) return current;
          return { ...current, [item_id]: { ...detail, checklist_items: [...detail.checklist_items, created] } };
        });
        setItems((current) =>
          current.map((item) =>
            String(item.id) === item_id ? { ...item, checklist_total_count: item.checklist_total_count + 1 } : item
          )
        );
      })
      .catch(() => {});
  };

  const handleToggleChecklistItem = (item_id: string, checklist_item_id: number) => {
    const detail = item_detail_by_id[item_id];
    const target = detail?.checklist_items.find((checklist_item) => checklist_item.id === checklist_item_id);
    if (!detail || !target) return;
    const next_done = !target.is_done;
    const previous_detail = detail;
    const previous_items = items;

    setItemDetailById((current) => ({
      ...current,
      [item_id]: {
        ...detail,
        checklist_items: detail.checklist_items.map((checklist_item) =>
          checklist_item.id === checklist_item_id ? { ...checklist_item, is_done: next_done } : checklist_item
        ),
      },
    }));
    setItems((current) =>
      current.map((item) =>
        String(item.id) === item_id
          ? { ...item, checklist_done_count: item.checklist_done_count + (next_done ? 1 : -1) }
          : item
      )
    );

    boardContentService.updateChecklistItem(board_id, Number(item_id), checklist_item_id, { is_done: next_done }).catch(() => {
      setItemDetailById((current) => ({ ...current, [item_id]: previous_detail }));
      setItems(previous_items);
    });
  };

  const handleRenameChecklistItem = (item_id: string, checklist_item_id: number, label: string) => {
    const detail = item_detail_by_id[item_id];
    if (!detail) return;
    const previous_detail = detail;

    setItemDetailById((current) => ({
      ...current,
      [item_id]: {
        ...detail,
        checklist_items: detail.checklist_items.map((checklist_item) =>
          checklist_item.id === checklist_item_id ? { ...checklist_item, label } : checklist_item
        ),
      },
    }));

    boardContentService
      .updateChecklistItem(board_id, Number(item_id), checklist_item_id, { label })
      .catch(() => setItemDetailById((current) => ({ ...current, [item_id]: previous_detail })));
  };

  const handleDeleteChecklistItem = (item_id: string, checklist_item_id: number) => {
    const detail = item_detail_by_id[item_id];
    const target = detail?.checklist_items.find((checklist_item) => checklist_item.id === checklist_item_id);
    if (!detail || !target) return;
    const previous_detail = detail;
    const previous_items = items;

    setItemDetailById((current) => ({
      ...current,
      [item_id]: {
        ...detail,
        checklist_items: detail.checklist_items.filter((checklist_item) => checklist_item.id !== checklist_item_id),
      },
    }));
    setItems((current) =>
      current.map((item) =>
        String(item.id) === item_id
          ? {
              ...item,
              checklist_total_count: item.checklist_total_count - 1,
              checklist_done_count: item.checklist_done_count - (target.is_done ? 1 : 0),
            }
          : item
      )
    );

    boardContentService.deleteChecklistItem(board_id, Number(item_id), checklist_item_id).catch(() => {
      setItemDetailById((current) => ({ ...current, [item_id]: previous_detail }));
      setItems(previous_items);
    });
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
    // Deep links (e.g. a notification's `/boards/{id}/pulses/{id}`) can point
    // at a subitem, which no longer sits at the top level of `items` — use
    // the tree-aware lookup so opening one still works.
    const row = findItemInTree(items, initial_open_item_id);
    if (!row) return;
    drawer.openRow(row);
    fetchItemDetail(String(row.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, initial_open_item_id]);

  /**
   * Valid predecessor candidates for `row`'s Dependency cell: every other
   * item on this tab except `row` itself and anything already reachable
   * *from* `row` by walking existing dependency edges forward — picking one
   * of those would close a cycle (`row` would end up depending, directly or
   * transitively, on something that already depends on `row`).
   */
  const getDependencyCandidates = (row: BoardItemDto, dependency_column_id: number): BoardCellItemOption[] => {
    const successors: Record<number, number[]> = {};
    for (const item of items) {
      const deps = item.values[String(dependency_column_id)];
      if (!Array.isArray(deps)) continue;
      for (const dep_id of deps) {
        const predecessor_id = Number(dep_id);
        (successors[predecessor_id] ??= []).push(item.id);
      }
    }
    const unreachable = new Set<number>([row.id]);
    const queue = [row.id];
    while (queue.length > 0) {
      const current = queue.shift() as number;
      for (const successor_id of successors[current] ?? []) {
        if (!unreachable.has(successor_id)) {
          unreachable.add(successor_id);
          queue.push(successor_id);
        }
      }
    }
    return items.filter((item) => !unreachable.has(item.id)).map((item) => ({ id: String(item.id), name: item.name }));
  };

  // `board_status_column`/`board_label_column`/`board_member_column`/
  // `board_priority_column`/`board_done_column`/`board_date_column`/
  // `board_date_end_column` are declared earlier in this component (right
  // after `columns_by_id`) — see the comment there.
  // A freshly-loaded board (no active view yet) opens on the Table ("Main
  // table") view, mirroring monday.com's own default.
  const active_view_type: BoardViewKind = view_tabs.active_view?.view_type ?? "table";
  const active_doc_view = view_tabs.active_view;
  const filtered_rows = useMemo(() => toolbar.groups.flatMap((g) => g.rows), [toolbar.groups]);

  // ── Table view — every subitem-scoped column, mirroring `item_columns` above. ──
  const subitem_columns = useMemo(() => columns.filter((c) => c.scope === "subitem"), [columns]);

  const table_people: TablePersonDef[] = useMemo(
    () =>
      workspace_members.map((member, index) => ({
        id: String(member.id),
        name: member.full_name,
        initials: getInitials(member.full_name),
        color: AVATAR_COLORS[index % AVATAR_COLORS.length],
      })),
    [workspace_members]
  );

  const table_base_columns = useMemo(
    () => item_columns.map(toTableColumnDef).filter((c): c is TableColumnDef => c !== null),
    [item_columns]
  );
  const table_sub_base_columns = useMemo(
    () => subitem_columns.map(toTableColumnDef).filter((c): c is TableColumnDef => c !== null),
    [subitem_columns]
  );

  const adaptTableNode = (item: BoardItemDto): BoardTableNode => ({ id: String(item.id), name: item.name, values: item.values });
  const adaptTableItem = (item: BoardItemDto): BoardTableItem => ({ ...adaptTableNode(item), subs: item.children.map(adaptTableNode) });

  const table_groups: BoardTableGroup[] = useMemo(
    () =>
      toolbar.groups.map((g) => ({
        key: g.id,
        title: g.name,
        color: g.accent_color,
        tint: g.accent_color,
        item_title: item_column_label,
        sub_title: "Subitem",
        base_columns: table_base_columns,
        sub_base_columns: table_sub_base_columns,
        custom_columns: [],
        sub_custom_columns: [],
        items: g.rows.map(adaptTableItem),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toolbar.groups, table_base_columns, table_sub_base_columns, item_column_label]
  );

  // ── Drag-and-drop row reordering — persists the Table view's own row/subitem
  // drag-and-drop (`useBoardTable`'s `onDragEnd`) to `board_items.position` via
  // the reorder endpoint. `items` is physically reordered (not just its
  // `position` fields patched) so the new order survives an unrelated re-render
  // — every derived list feeding the Table view (`toolbar.groups` → `table_groups`)
  // renders rows in `items`' own array order, not sorted by `position`. On
  // failure the previous `items` snapshot is restored, which — through that
  // same derivation chain — resyncs `useBoardTable`'s local order back too. ──
  const handleReorderTableItems = (payload: TableReorderPayload) => {
    const previous_items = items;
    const ordered_ids = payload.ordered_ids.map(Number);

    if (payload.scope === "root") {
      const group_id = Number(payload.group_key);
      setItems((current) => {
        const by_id = new Map(current.map((item) => [item.id, item]));
        const reordered = ordered_ids.map((id) => by_id.get(id)).filter((item): item is BoardItemDto => Boolean(item));
        let cursor = 0;
        return current.map((item) =>
          item.group_id === group_id && ordered_ids.includes(item.id) ? { ...reordered[cursor++], position: cursor - 1 } : item
        );
      });
      void boardContentService
        .reorderItems(board_id, {
          scope: "root",
          moved_item_id: Number(payload.moved_id),
          target_group_id: group_id,
          target_ordered_ids: ordered_ids,
        })
        .catch(() => setItems(previous_items));
    } else {
      const parent_id = Number(payload.parent_id);
      setItems((current) =>
        mapItemInTree(current, parent_id, (item) => {
          const by_id = new Map(item.children.map((child) => [child.id, child]));
          const reordered = ordered_ids
            .map((id) => by_id.get(id))
            .filter((child): child is BoardItemDto => Boolean(child))
            .map((child, index) => ({ ...child, position: index }));
          return { ...item, children: reordered };
        })
      );
      void boardContentService
        .reorderItems(board_id, { scope: "subitem", target_parent_id: parent_id, target_ordered_ids: ordered_ids })
        .catch(() => setItems(previous_items));
    }
  };

  /**
   * Bridges `BoardTable` to this component's own real handlers — rename,
   * cell edits and group rename/delete persist immediately; row/subitem/
   * group *creation* instead goes through `handleCreateTableItem`/
   * `handleCreateTableSubitem`/`handleCreateTableGroup` below (passed as
   * `BoardTable`'s own `onCreateItem`/`onCreateSubitem`/`onCreateGroup`
   * props), which await the real API call first — see `BoardTableProps`'s
   * own doc comment for why. Column-structure management (add/rename/delete
   * a column, the status/label editors) stays local-only for now; picking an
   * *existing* option persists via `onCellValueChange`, and appending a new
   * one inline from the Dropdown cell's own picker persists via
   * `onAddColumnOption` (both funnel into the same `handleAddColumnOption`
   * used by the Kanban drawer's Priority/Project fields).
   */
  const table_config: UseBoardTableConfig = useMemo(
    () => ({
      initial_groups: table_groups,
      people: table_people,
      onRenameNode: (node_id, name) => void handleRenameItem(Number(node_id), name),
      onCellValueChange: (node_id, column_id, value) =>
        void handleUpdateCellValue(Number(node_id), column_id, (value ?? null) as BoardItemValue),
      onAddColumnOption: (column_id, option) => handleAddColumnOption(column_id, option),
      // Dropdown cell's inline "Edit labels" mode (`DropdownMenu.tsx`) —
      // rename/recolor/delete all funnel through the same `patchColumnOptions`
      // helper the Kanban drawer's Priority/Project `makeOptionActions` use.
      onRenameColumnOption: (column_id, option_id, label) =>
        void patchColumnOptions(column_id, (options) => options.map((o) => (o.id === option_id ? { ...o, label } : o))),
      onRecolorColumnOption: (column_id, option_id, color) =>
        void patchColumnOptions(column_id, (options) => options.map((o) => (o.id === option_id ? { ...o, color } : o))),
      onDeleteColumnOption: (column_id, option_id) =>
        void patchColumnOptions(column_id, (options) => options.filter((o) => o.id !== option_id)),
      onDeleteNode: (node_id) => {
        void boardContentService
          .deleteItem(board_id, Number(node_id))
          .then(() => setItems((current) => removeItemFromTree(current, Number(node_id))));
      },
      onReorderItems: handleReorderTableItems,
      onRenameGroup: (group_key, title) => {
        void boardContentService
          .updateGroup(board_id, Number(group_key), { name: title })
          .then((updated) => setGroups((current) => current.map((g) => (g.id === updated.id ? updated : g))));
      },
      onRemoveGroup: (group_key) => {
        void boardContentService
          .deleteGroup(board_id, Number(group_key))
          .then(() => setGroups((current) => current.filter((g) => g.id !== Number(group_key))));
      },
      onRenameColumn: (_group_key, _scope, column_id, title) =>
        void boardContentService
          .updateColumn(board_id, Number(column_id), { label: title })
          .then((updated) => setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c)))),
      onDeleteColumn: (_group_key, _scope, column_id) => void handleRemoveKanbanProperty(column_id),
      onUpdateColumnSettings: (_group_key, _scope, column_id, patch) =>
        void boardContentService
          .updateColumn(board_id, Number(column_id), patch)
          .then((updated) => setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c)))),
      onChangeColumnKind: (_group_key, _scope, column_id, kind, default_width) =>
        void boardContentService
          .updateColumn(board_id, Number(column_id), { type: TABLE_KIND_TO_ENGINE_KIND[kind], width: default_width })
          .then((updated) => setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c)))),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table_groups, table_people, board_id]
  );

  const handleCreateTableItem = async (group_key: string): Promise<string> => {
    const created = await boardContentService.createItem(board_id, { name: "New item", group_id: Number(group_key) });
    setItems((current) => [...current, created]);
    return String(created.id);
  };

  const handleCreateTableSubitem = async (item_id: string): Promise<string> => {
    const created = await boardContentService.createItem(board_id, { name: "New subitem", parent_id: Number(item_id) });
    setItems((current) => mapItemInTree(current, Number(item_id), (item) => ({ ...item, children: [...item.children, created] })));
    return String(created.id);
  };

  const handleCreateTableGroup = async (): Promise<{ key: string; title: string }> => {
    const created = await boardContentService.createGroup(board_id, {
      view_id: view_tabs.active_view_id as number,
      name: "New group",
    });
    setGroups((current) => [...current, created]);
    return { key: String(created.id), title: created.name };
  };

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
    const label_ids = board_label_column ? asStringArray(row.values[String(board_label_column.id)]) : [];
    const member_ids = board_member_column ? asStringArray(row.values[String(board_member_column.id)]) : [];
    const members = board_member_column
      ? workspace_members.filter((member) => member_ids.includes(String(member.id)))
      : [];

    const priority_value = board_priority_column ? row.values[String(board_priority_column.id)] : null;
    const priority_option =
      board_priority_column && typeof priority_value === "string"
        ? (board_priority_column.config?.options ?? []).find((option) => option.id === priority_value) ?? null
        : null;

    const is_done = board_done_column ? row.values[String(board_done_column.id)] === true : false;
    const due_date_value = board_date_column ? row.values[String(board_date_column.id)] : null;
    const due_date = typeof due_date_value === "string" && due_date_value ? formatKanbanDueDate(due_date_value) : null;
    const has_checklist = row.checklist_total_count > 0;
    const checklist_pct = has_checklist ? Math.round((100 * row.checklist_done_count) / row.checklist_total_count) : 0;
    const description_snippet = row.description?.trim();

    const has_meta_row = Boolean(
      priority_option || due_date || row.attachment_count > 0 || row.comment_count > 0 || board_member_column
    );

    return (
      <div className="flex flex-col">
        {priority_option && <div className="h-[6px]" style={{ background: priority_option.color }} />}

        <div className="flex flex-col" style={{ padding: "13px 14px 12px" }}>
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
                className="w-full min-w-0 text-[14px] font-bold"
                style={{ color: KANBAN_COLORS.text_strong }}
                aria_label="Rename item"
              />
            ) : (
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  setEditingItemId(row.id);
                }}
                className="min-w-0 flex-1 cursor-text text-[14px] font-bold leading-snug"
                style={{ color: is_done ? KANBAN_COLORS.text_faded : KANBAN_COLORS.text_strong, textDecoration: is_done ? "line-through" : "none" }}
                title="Click to rename"
              >
                {row.name}
              </span>
            )}
            <span
              className="-mr-1 -mt-1 flex-none rounded-[6px] p-1 opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: KANBAN_COLORS.text_hairline }}
            >
              <MoreDotsIcon size={13} />
            </span>
          </div>

          {/* The Project row is only ever painted on the card once it has a value.
              An unset Project stays a drawer-only field instead of cluttering every
              card with an empty "+ Add label" affordance. */}
          {board_label_column && label_ids.length > 0 && (
            <div style={{ margin: "9px 0 0", paddingLeft: 24 }}>
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

          {description_snippet && (
            <div
              className="overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px]"
              style={{ color: KANBAN_COLORS.text_disabled, paddingLeft: 24, margin: "6px 0 0" }}
            >
              {description_snippet}
            </div>
          )}

          {has_checklist && (
            <div className="flex items-center gap-2" style={{ paddingLeft: 24, margin: "10px 0 0" }} onClick={(event) => event.stopPropagation()}>
              <div className="h-[5px] flex-1 overflow-hidden rounded-full" style={{ background: "var(--color-shell-border-strong)" }}>
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${checklist_pct}%`, background: KANBAN_COLORS.success }}
                />
              </div>
              <span className="flex-none text-[11px] font-bold" style={{ color: checklist_pct === 100 ? KANBAN_COLORS.success : KANBAN_COLORS.text_placeholder }}>
                {row.checklist_done_count}/{row.checklist_total_count}
              </span>
            </div>
          )}

          {has_meta_row && (
            <div
              className="flex flex-wrap items-center gap-2"
              style={{ paddingLeft: 24, margin: "11px 0 0" }}
              onClick={(event) => event.stopPropagation()}
            >
              {priority_option && (
                <span
                  className="rounded-[6px] px-[7px] py-[3px] text-[10.5px] font-extrabold uppercase tracking-wide"
                  style={{ background: `${priority_option.color}1A`, color: priority_option.color }}
                >
                  {priority_option.label}
                </span>
              )}
              {due_date && (
                <span
                  className="flex items-center gap-1 rounded-[6px] px-[7px] py-[3px] text-[11.5px] font-semibold"
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
                    people={workspace_members}
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

          {/* Custom properties (`other_kanban_columns`) are drawer-only, they never
              spill onto the card itself, unlike the four core fields above. See the
              drawer's own "Properties" section for where they're editable. */}
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
    void handleAddColumn(status_type, "item", { options });
  };

  // Guards `kanban_core_columns_bootstrap` below to at most one run per
  // board/tab, even though the columns it may create re-trigger the effect.
  const kanban_core_columns_bootstrap_ref = useRef<string | null>(null);

  /**
   * Once a Kanban tab has its lanes (`board_status_column`) set up, the four
   * card properties the client always wants visible — Assignee/Due date/
   * Priority/Project — plus the "Mark complete" checkbox column are silently
   * provisioned if missing, exactly like an ordinary "+ Add column" would,
   * so the user can still hide/rename/delete them afterward. This is also
   * what actually fixes "Mark complete": it previously did nothing on any
   * board without a checkbox column.
   */
  useEffect(() => {
    if (active_view_type !== "kanban" || !board_status_column) return;
    const bootstrap_key = `${board_id}:${view_tabs.active_view_id}`;
    if (kanban_core_columns_bootstrap_ref.current === bootstrap_key) return;
    kanban_core_columns_bootstrap_ref.current = bootstrap_key;

    if (!board_member_column) {
      const people_type = ADDABLE_COLUMN_TYPES.find((type) => type.kind === "people");
      if (people_type) void handleAddColumn({ ...people_type, label: "Assignee" });
    }
    if (!board_date_column) {
      const date_type = ADDABLE_COLUMN_TYPES.find((type) => type.kind === "date");
      if (date_type) void handleAddColumn({ ...date_type, label: "Due date" });
    }
    if (!board_priority_column) {
      const priority_type = ADDABLE_COLUMN_TYPES.find((type) => type.kind === "status");
      if (priority_type) {
        const priority_options = [
          { label: "Low", color: "#579bfc" },
          { label: "Medium", color: "#fdab3d" },
          { label: "High", color: "#ff642e" },
          { label: "Urgent", color: "#e2445c" },
        ].map((option, index) => ({ id: `opt_${Date.now()}_${index}`, ...option }));
        void handleAddColumn({ ...priority_type, label: "Priority" }, "item", { options: priority_options });
      }
    }
    if (!board_label_column) {
      const project_type = ADDABLE_COLUMN_TYPES.find((type) => type.kind === "tags");
      if (project_type) void handleAddColumn({ ...project_type, label: "Project" });
    }
    if (!board_done_column) {
      const done_type = ADDABLE_COLUMN_TYPES.find((type) => type.kind === "checkbox");
      if (done_type) void handleAddColumn({ ...done_type, label: "Done" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    active_view_type,
    board_id,
    view_tabs.active_view_id,
    board_status_column,
    board_member_column,
    board_date_column,
    board_priority_column,
    board_label_column,
    board_done_column,
  ]);

  // ── Calendar ── positioned by the board's first Date column (an optional
  // second Date column becomes the range's end); a card's day *is* its value
  // in that column, so dragging an event onto a new day is an ordinary cell
  // edit, same as Kanban's lane drag. ──
  const getCalendarRowRange = (row: BoardItemDto): BoardCalendarRange | null => {
    if (!board_date_column) return null;
    const start = row.values[String(board_date_column.id)];
    if (typeof start !== "string" || !start) return null;
    const end = board_date_end_column ? row.values[String(board_date_end_column.id)] : null;
    return { start, end: typeof end === "string" && end ? end : null };
  };

  /** Color shared by Calendar events and Gantt bars — the row's first Status column option, falling back to a neutral swatch blue. */
  const getDateRowColor = (row: BoardItemDto): string => {
    if (!board_status_column) return COLUMN_KIND_SWATCH.date.accent_color;
    const value = row.values[String(board_status_column.id)];
    const option = (board_status_column.config?.options ?? []).find((o) => o.id === value);
    return option?.color ?? "#c4c4c4";
  };

  const renderCalendarEvent = (row: BoardItemDto): React.ReactNode => {
    const member_ids = board_member_column ? asStringArray(row.values[String(board_member_column.id)]) : [];
    const members = board_member_column
      ? workspace_members.filter((member) => member_ids.includes(String(member.id)))
      : [];

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

  // ── Gantt ── bars are driven by the board's first `timeline` column (one
  // `{start, end}` value, not two separate Date columns — see
  // `board_timeline_column`'s own comment for why) and arrows/auto-reschedule
  // by its first `dependency` column. A row's position *is* its timeline
  // value, so dragging a bar is one atomic cell edit; a cascade reschedule
  // (see `GanttChart`'s `computeCascade`) is just more of the same edit
  // applied to whichever successor rows it pushed forward. ──
  /**
   * `Mar 4`, short label for the Gantt left panel. Goes through
   * `parseIsoDate` (local-component construction from the raw digits)
   * rather than `new Date(value)` directly — a bare `YYYY-MM-DD` string
   * parses as UTC midnight per the ISO 8601 spec, which `toLocaleDateString`
   * then renders as the *previous* day in any timezone behind UTC.
   */
  const formatGanttDate = (value: string): string => {
    const date = parseIsoDate(value);
    return !date ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getGanttRowRange = (row: BoardItemDto): BoardCalendarRange | null => {
    if (!board_timeline_column) return null;
    const raw = row.values[String(board_timeline_column.id)];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    if (!raw.start) return null;
    return { start: raw.start, end: raw.end ?? null };
  };

  const getGanttDependencyIds = (row: BoardItemDto): string[] => {
    if (!board_dependency_column) return [];
    return asStringArray(row.values[String(board_dependency_column.id)]);
  };

  const renderGanttRowLabel = (row: BoardItemDto): React.ReactNode => (
    <GanttRowLabel
      row={row}
      range={getGanttRowRange(row)}
      dependency_ids={getGanttDependencyIds(row)}
      dependency_candidates={board_dependency_column ? getDependencyCandidates(row, board_dependency_column.id) : []}
      onCommitDependencies={(value) =>
        board_dependency_column && handleUpdateCellValue(row.id, String(board_dependency_column.id), value)
      }
      formatDate={formatGanttDate}
    />
  );

  const handleMoveGanttRange = (row_id: string, new_start: string, new_end: string) => {
    if (!board_timeline_column) return;
    void handleUpdateCellValue(Number(row_id), String(board_timeline_column.id), { start: new_start, end: new_end });
  };

  /** Batch-writes the successor rows a drag/resize pushed forward to keep every Finish-to-Start dependency satisfied — see `GanttChart`'s `onCascadeReschedule`. */
  const handleGanttCascadeReschedule = (updates: { row_id: string; start: string; end: string }[]) => {
    if (!board_timeline_column) return;
    for (const update of updates) {
      void handleUpdateCellValue(Number(update.row_id), String(board_timeline_column.id), {
        start: update.start,
        end: update.end,
      });
    }
  };

  /**
   * A brand-new Gantt tab has no Timeline column yet — offer to add one
   * instead of showing an empty chart, mirroring `handleStartKanbanBoard`.
   */
  const handleStartGanttBoard = () => {
    const timeline_type = ADDABLE_COLUMN_TYPES.find((type) => type.kind === "timeline");
    if (!timeline_type) return;
    void handleAddColumn(timeline_type);
  };

  /** A Gantt tab with no Dependency column yet can't draw arrows — offers one instead of leaving that permanently unreachable from the Gantt tab itself. */
  const handleAddGanttDependencyColumn = () => {
    const dependency_type = ADDABLE_COLUMN_TYPES.find((type) => type.kind === "dependency");
    if (!dependency_type) return;
    void handleAddColumn(dependency_type);
  };

  // ── Kanban's own drawer — a literal reproduction of the mockup's single-panel
  // task drawer (see `KanbanItemDrawer`), not the richer tabbed `BoardItemDrawer`
  // every other view (Table/Calendar) keeps using. Every field still writes
  // through the exact same real persistence (`handleUpdateCellValue`/
  // `handleRenameItem`) as the card and the table cell it's mirrored from. ──
  const kanban_open_row = active_view_type === "kanban" ? items.find((item) => String(item.id) === drawer.open_row_id) ?? null : null;
  const kanban_open_row_member_ids = board_member_column && kanban_open_row ? asStringArray(kanban_open_row.values[String(board_member_column.id)]) : [];
  const kanban_open_row_label_ids = board_label_column && kanban_open_row ? asStringArray(kanban_open_row.values[String(board_label_column.id)]) : [];
  const kanban_open_row_detail = kanban_open_row ? item_detail_by_id[String(kanban_open_row.id)] : undefined;

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
        onChangeEmoji: handleChangeViewEmoji,
        onDeleteView: handleDeleteView,
        onPinView: handlePinView,
        onDuplicateView: handleDuplicateView,
        onLockView: handleLockView,
        getViewUrl: (tab) => (tab.id === view_tabs.tabs[0]?.id ? `/boards/${board_id}` : `/boards/${board_id}/views/${tab.id}`),
        onReorderPersonalTabs: handleReorderPersonalTabs,
      }}
      toolbar={
        // A Doc, Files Gallery or Chart tab has no items/columns of its own to
        // search, filter or sort — the item-grid toolbar would be pure noise
        // above any of them (Files Gallery and Chart render their own
        // dedicated toolbar/config panel instead).
        active_view_type === "doc" || active_view_type === "file_gallery" || active_view_type === "chart" ? undefined : (
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

      {active_view_type === "table" ? (
        <BoardTable
          embedded
          config={table_config}
          onCreateItem={handleCreateTableItem}
          onCreateSubitem={handleCreateTableSubitem}
          onCreateGroup={handleCreateTableGroup}
          onAddColumn={handleAddTableColumn}
          onDuplicateColumn={handleDuplicateTableColumn}
          onAddColumnRight={handleAddColumnRight}
          onRequestColumnFilter={handleRequestColumnFilter}
          onRequestGroupByColumn={handleRequestGroupByColumn}
        />
      ) : active_view_type === "kanban" ? (
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
            getRowColor={getDateRowColor}
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
      ) : active_view_type === "gantt" ? (
        board_timeline_column ? (
          <>
            {!board_dependency_column && (
              <div className="mb-3 flex items-center gap-2 rounded-[8px] border border-shell-border bg-shell-panel-alt px-3 py-2 text-[12.5px] text-shell-text-muted">
                No arrows yet — add a Dependency column to link items and auto-reschedule what follows them.
                <button
                  type="button"
                  onClick={handleAddGanttDependencyColumn}
                  className="font-semibold text-brand-500 hover:underline"
                >
                  Add Dependency column
                </button>
              </div>
            )}
            <GanttChart<BoardItemDto>
              groups={toolbar.groups}
              getRowId={(row) => String(row.id)}
              getRowRange={getGanttRowRange}
              getRowColor={getDateRowColor}
              renderRowLabel={renderGanttRowLabel}
              getBarLabel={(row) => row.name}
              onRowClick={handleRowClick}
              selectedRowId={drawer.open_row_id}
              onDateChange={handleMoveGanttRange}
              resizable
              getDependencyIds={board_dependency_column ? getGanttDependencyIds : undefined}
              onCascadeReschedule={board_dependency_column ? handleGanttCascadeReschedule : undefined}
            />
          </>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
              <GanttViewIcon size={26} />
            </span>
            <h2 className="text-lg font-semibold text-shell-text">Set up your Gantt view</h2>
            <p className="text-[13.5px] text-shell-text-muted">
              Gantt bars come from a Timeline column — add one to place items on the timeline.
            </p>
            <button
              type="button"
              onClick={handleStartGanttBoard}
              className="flex items-center gap-1.5 rounded-[7px] border border-shell-border px-2.5 py-1.5 text-[12.5px] font-medium text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
            >
              <PlusIcon size={13} />
              Add Timeline column
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
      ) : active_view_type === "chart" && view_tabs.active_view_id != null ? (
        <BoardChartView board_id={board_id} view_id={view_tabs.active_view_id} />
      ) : (
        <BoardComingSoonView view_type={active_view_type} />
      )}

      {active_view_type === "kanban" ? (
        <KanbanItemDrawer<BoardItemDto>
          drawer={{ ...drawer, close: handleDrawerClose }}
          title={kanban_open_row?.name ?? ""}
          onRenameTitle={(name) => kanban_open_row && handleRenameItem(kanban_open_row.id, name)}
          is_done={board_done_column && kanban_open_row ? kanban_open_row.values[String(board_done_column.id)] === true : false}
          created_by={
            kanban_open_row_detail?.creator
              ? {
                  id: String(kanban_open_row_detail.creator.id),
                  full_name: kanban_open_row_detail.creator.full_name,
                  profile_photo_url: kanban_open_row_detail.creator.profile_photo_url,
                }
              : null
          }
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
                  roster: workspace_members,
                  selected: workspace_members.filter((member) => kanban_open_row_member_ids.includes(String(member.id))),
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
                  onCreateOption: (option) => handleAddColumnOption(String(board_priority_column.id), option),
                  onEditOptions: makeOptionActions(String(board_priority_column.id)),
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
          properties={
            kanban_open_row
              ? {
                  columns: other_kanban_columns.map((column) => ({
                    id: String(column.id),
                    label: column.label,
                    kind: column.type,
                    options: column.config?.options,
                  })),
                  people: workspace_members,
                  getValue: (column_id) => kanban_open_row.values[column_id] ?? null,
                  onCommit: (column_id, value) => void handleUpdateCellValue(kanban_open_row.id, column_id, value),
                  onAddOption: (column_id, option) => handleAddColumnOption(column_id, option),
                  onEditOptions: (column_id) => makeOptionActions(column_id),
                  onAddProperty: (type) => void handleAddColumn(type),
                  onRemoveProperty: (column_id) => void handleRemoveKanbanProperty(column_id),
                }
              : undefined
          }
          checklist={
            kanban_open_row
              ? {
                  items: kanban_open_row_detail?.checklist_items ?? [],
                  loading: !kanban_open_row_detail,
                  onAdd: (label) => handleAddChecklistItem(String(kanban_open_row.id), label),
                  onToggle: (checklist_item_id) => handleToggleChecklistItem(String(kanban_open_row.id), checklist_item_id),
                  onRename: (checklist_item_id, label) =>
                    handleRenameChecklistItem(String(kanban_open_row.id), checklist_item_id, label),
                  onDelete: (checklist_item_id) => handleDeleteChecklistItem(String(kanban_open_row.id), checklist_item_id),
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
