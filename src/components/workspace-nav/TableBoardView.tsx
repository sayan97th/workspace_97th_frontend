"use client";
import { reorderByIds } from "@/components/board/cells/optionOrder";
import { countryName, docCellTitle, formatHour, formatWeekRange, timeZoneCity } from "@/components/board/table/columnValueFormats";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ADDABLE_COLUMN_TYPES,
  BOARD_DEFAULT_GROUP_BY_ID,
  BOARD_VIEW_TYPES,
  BoardCalendar,
  BoardChartView,
  BoardComingSoonView,
  BoardFormView,
  BoardDiscussionDrawer,
  BoardDocView,
  BoardFileGalleryView,
  BoardInviteModal,
  BoardItemDrawer,
  BoardKanban,
  BoardShell,
  BoardTable,
  BoardToolbar,
  ChangeBoardTypeModal,
  COLUMN_KIND_SWATCH,
  COLUMN_OPTION_PALETTE,
  TABLE_KIND_TO_ENGINE_KIND,
  presetConfigFor,
  DEFAULT_GANTT_BAR_COLOR,
  GanttChart,
  type BoardGanttColorBy,
  type BoardGanttConfig,
  type GanttLegendItem,
  type GanttRange,
  KANBAN_DEFAULT_LANE_OPTIONS,
  KanbanCardLabels,
  KanbanCardMembers,
  KanbanItemModal,
  type KanbanItemField,
  KanbanTaskCard,
  PersonAvatarStack,
  PresenceAvatarStack,
  SelectionActionBar,
  toIsoDate,
  useBoardDiscussionDrawer,
  useBoardItemDrawer,
  buildRuleFromRowValue,
  isRuleComplete,
  useBoardToolbar,
  type AddableColumnType,
  DEFAULT_EVENT_COLOR,
  type BoardCalendarColorBy,
  type BoardCalendarConfig,
  type BoardCalendarEntry,
  CalendarNewItemDialog,
  type CalendarNewItemField,
  type CalendarNewItemPayload,
  type BoardCellItemOption,
  type BoardCellOption,
  type BoardColumn,
  type BoardKanbanLane,
  type KanbanDueDateTone,
  type KanbanTaskPill,
  type BoardOptionActions,
  type BoardGroup as BoardGroupRow,
  type BoardHeaderInfo,
  type BoardItemDrawerConfig,
  type BoardPersonOption,
  type BoardTableGroup,
  type BoardTableItem,
  type BoardTableNode,
  type BoardToolbarConfig,
  type BoardAdvancedFilterRow,
  type BoardSavedFilterActions,
  type BoardTeamOption,
  type BoardToolbarExportOptions,
  type BoardToolbarViewActions,
  type BoardViewKind,
  type DrawerActivityEntry,
  type ColumnDef as TableColumnDef,
  type DependencyLinkInput,
  type ColumnKind as TableColumnKind,
  type ColumnScope as TableColumnScope,
  type PersonDef as TablePersonDef,
  type ReorderColumnsPayload as TableReorderColumnsPayload,
  type ReorderPayload as TableReorderPayload,
  type UseBoardTableConfig,
} from "@/components/board";
import { AVATAR_COLORS } from "@/components/board/TeamAvatars";
import type { ConnectColumnOptions, ConnectedBoardSummary, ConnectItemOption, ConnectSettings, LinkedItemDetail, LinkedItemField, LinkedItemRef } from "@/components/board/table/types";
import {
  buildBoardFilterFields,
  buildBoardGroupByOptions,
  buildBoardSortOptions,
  getValueDateRange,
  getValueIds,
  getValueNumber,
  isValueChecked,
  type BoardToolbarFieldSources,
} from "./boardToolbarFields";
import { NAME_COLUMN_ID, isFormulaSourceKind } from "@/components/board/table/formula/formulaEngine";
import { DEPENDENCY_MODE_OPTIONS } from "@/components/board/table/menus/DependencySetupDialog";
import { computeFormulaValue, legacyFormulaToExpression } from "@/components/board/table/formulaUtils";
import type { CellValue, FormulaSourceColumn } from "@/components/board/table/types";
import type { ButtonPressOutcome } from "@/components/board/table/useBoardTable";
import {
  CalendarViewIcon,
  GanttViewIcon,
  KanbanViewIcon,
  LinkIcon,
  PlusIcon,
} from "@/icons/board-icons";
import {
  ArchiveIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  DeleteIcon,
  DuplicateIcon,
  MoveToIcon,
  OpenInOverlayIcon,
  RenameIcon,
} from "@/icons/workspace-icons";
import type { ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast/ToastProvider";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import ColumnPermissionsModal from "@/components/board/ColumnPermissionsModal";
import {
  copyColumnValuesInTree,
  findItemInTree,
  insertItemBelowInTree,
  mapItemInTree,
  relocateItemInTree,
  removeItemFromTree,
  withGroupInTree,
} from "./boardItemTree";
import { useBoardViewTabs } from "@/hooks/useBoardViewTabs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getApiErrorMessage } from "@/lib/api-error";
import { useBoardFilterUrlState } from "@/hooks/useBoardFilterUrlState";
import { buildPageTitle } from "@/lib/page-title";
import { boardContentService } from "@/services/board-content.service";
import { boardAutomationService } from "@/services/board-automation.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { BoardAutomationDto, CreateBoardAutomationPayload, UpdateBoardAutomationPayload } from "@/types/board-automation";
import type { AutomationColumn } from "../board/automations/builder/automationCatalog";
import type { BoardActivityLogEntry } from "@/types/board-options";
import AutomationsModal from "../board/automations/AutomationsModal";
import ItemAutomationsPanel from "../board/automations/ItemAutomationsPanel";
import ItemDependenciesPanel from "../board/dependencies/ItemDependenciesPanel";
import { buildItemDependencySections } from "../board/dependencies/buildItemDependencySections";
import { countAutomationsByColumn } from "../board/automations/builder/automationColumns";
import IntegrationsModal from "../board/integrations/IntegrationsModal";
import { boardInvitationService } from "@/services/board-invitation.service";
import { boardDocService } from "@/services/board-doc.service";
import { boardItemCellFilesService } from "@/services/board-item-cell-files.service";
import { boardOptionsService } from "@/services/board-options.service";
import { personalService } from "@/services/personal.service";
import { peopleService } from "@/services/people.service";
import { notifyNavItemChanged, workspaceService } from "@/services/workspace.service";
import type {
  BoardCellFile,
  BoardColumnConfig,
  BoardColumnDto,
  BoardColumnScope,
  BoardLinkValue,
  BoardTimelineValue,
  BoardTimeTrackingValue,
  BoardGroupDto,
  UpdateBoardGroupPayload,
  BoardItemDetailDto,
  BoardItemDto,
  BoardItemValue,
  BoardSavedFilterDto,
  BoardTagDto,
  BoardViewDto,
  BoardViewPersonalStateDto,
  ReorderBoardItemsPayload,
} from "@/types/board-content";
import type { BoardAccessEntry } from "@/types/board-invitation";
import type { BoardDetail, BoardEditPermission, BoardType, WorkspaceMember } from "@/types/workspace";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { buildBoardPath } from "./helpers";

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

/** The viewer's IANA time zone, sent with server-side filters so timestamps turn into the days they see. */
const VIEWER_TIME_ZONE = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
})();
/** Synthetic, non-hideable column (like {@link ITEM_COLUMN_ID}) showing each row's comment count — mirrors Client Hub's static "chat" column. */
const CHAT_COLUMN_ID = "comments";

/** A multi-select cell's raw value, narrowed to the option/person ids it actually holds — `BoardItemValue`'s other array member, `BoardCellFile[]`, is only ever read by a `files` column's own file-list handling. */
const asStringArray = (value: BoardItemValue): string[] => (Array.isArray(value) ? (value as string[]) : []);

/**
 * The Table view's own `ColumnKind` enum (`@/components/board/table`) is
 * almost, but not quite, the engine's `BoardColumnType`: only `"long_text"`
 * here vs. `"longtext"` there differs in name.
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
  rating: "rating",
  vote: "vote",
  link: "link",
  files: "files",
  time_tracking: "time_tracking",
  auto_number: "auto_number",
  dependency: "dependency",
  formula: "formula",
  connect_board: "connect_board",
  mirror: "mirror",
  checklist: "checklist",
  button: "button",
  doc: "doc",
  world_clock: "world_clock",
  location: "location",
  creation_log: "creation_log",
  last_updated: "last_updated",
  item_number: "item_number",
  week: "week",
  country: "country",
  color_picker: "color_picker",
  hour: "hour",
  progress_tracking: "progress_tracking",
};

/** Real per-column option → the Table view's own option shape (`id`/`label`/`color`), used for status/label/dropdown/tags cells. */
const toTableOptions = (column: BoardColumnDto): TableColumnDef["options"] =>
  column.config?.options?.map((option) => ({
    id: option.id,
    label: option.label,
    color: option.color,
    is_active: option.is_active,
    description: option.description,
  }));

/** A Connect boards column's boards and settings, reading the single `linked_board_id` columns saved before several boards were allowed. */
const toConnectSettings = (column: BoardColumnDto): Pick<TableColumnDef, "linked_board_ids" | "connect"> => {
  const board_ids = column.config?.linked_board_ids ?? (column.config?.linked_board_id != null ? [column.config.linked_board_id] : []);
  const linked_board_ids = board_ids.map(String);
  return {
    linked_board_ids,
    connect: {
      linked_board_ids,
      allow_multiple_items: column.config?.allow_multiple_items ?? true,
      two_way: column.config?.two_way ?? false,
    },
  };
};

/** A Connect boards or Mirror column's linkage, with where each board opens. */
const toColumnLinkage = (linkage: NonNullable<BoardColumnDto["linkage"]>): TableColumnDef["linkage"] => ({
  boards: linkage.boards.map((board) => ({ id: String(board.id), name: board.name, href: buildBoardPath(board.id) })),
  hidden_board_count: linkage.hidden_board_count,
  mirrored_column: linkage.mirrored_column
    ? { label: linkage.mirrored_column.label, board_name: linkage.mirrored_column.board_name, board_href: buildBoardPath(linkage.mirrored_column.board_id) }
    : null,
});

/** Columns the linked item card leaves out: computed or action-only ones that need their own board loaded. */
const LINKED_ITEM_CARD_EXCLUDED_TYPES = new Set<BoardColumnDto["type"]>(["mirror", "formula", "button", "dependency"]);

/** Where a connected item opens: its board, on the tab that holds it. */
const connectItemHref = (board_id: number, item_id: number, view_id: number | null): string =>
  `${buildBoardPath(board_id)}/pulses/${item_id}${view_id ? `?view_id=${view_id}` : ""}`;

/** `null` for a column kind the Table view has no cell renderer for. Every `BoardColumnDto["type"]` currently has one, so this only ever matters for a type added to the engine before the Table view picks it up. */
const toTableColumnDef = (column: BoardColumnDto): TableColumnDef | null => {
  const kind = TABLE_COLUMN_KIND[column.type];
  if (!kind) return null;
  return {
    id: String(column.id),
    title: column.label,
    kind,
    width: column.width,
    is_restricted: column.view_restriction != null || column.edit_restriction != null,
    options: toTableOptions(column),
    // Only a people column's picker ever reads this, but setting it
    // regardless of `type` is harmless and matches `options` above.
    notify_on_assignment: column.config?.notify_on_assignment ?? true,
    // Formulas saved before expressions existed (`operation` + `source_column_ids`) are converted on read, so they keep their result.
    formula: (() => {
      const expression = column.config?.expression ?? legacyFormulaToExpression(column.config);
      return expression ? { expression } : undefined;
    })(),
    mirror:
      column.config?.source_column_id != null && column.config?.mirrored_column_id != null
        ? { source_column_id: String(column.config.source_column_id), mirrored_column_id: String(column.config.mirrored_column_id) }
        : undefined,
    linked_board_id: column.config?.linked_board_id != null ? String(column.config.linked_board_id) : undefined,
    ...(column.type === "connect_board" ? toConnectSettings(column) : {}),
    linkage: column.linkage ? toColumnLinkage(column.linkage) : undefined,
    description: column.config?.description?.trim() || undefined,
    button: column.type === "button" ? { label: column.config?.button_label || "Click me", color: column.config?.button_color ?? "#579bfc" } : undefined,
    validation: column.config?.validation,
    aggregation: column.config?.aggregation,
    hide_summary: column.config?.hide_summary === true || undefined,
    hour_format: column.type === "hour" ? column.config?.hour_format ?? "12" : undefined,
    rating_max: column.type === "rating" ? column.config?.rating_max : undefined,
    rating_icon: column.type === "rating" ? column.config?.rating_icon : undefined,
    progress_columns:
      column.type === "progress_tracking" && column.config?.progress_columns?.length
        ? column.config.progress_columns.map((entry) => ({ column_id: String(entry.column_id), weight: entry.weight }))
        : undefined,
    reminder: column.config?.reminder,
    dependency:
      column.type === "dependency"
        ? {
            date_column_id: column.config?.date_column_id != null ? String(column.config.date_column_id) : null,
            mode: column.config?.dependency_mode ?? "none",
            use_working_days: !!column.config?.use_working_days,
          }
        : undefined,
  };
};

/** Gives every Dependency column the Date and Timeline columns of its table it can schedule, hidden ones included. */
const attachDependencyDateColumns = (defs: TableColumnDef[]): TableColumnDef[] => {
  if (!defs.some((def) => def.kind === "dependency")) return defs;
  const date_columns = defs.filter((def) => def.kind === "date" || def.kind === "timeline").map(({ id, title, kind }) => ({ id, title, kind }));
  return defs.map((def) => (def.kind === "dependency" ? { ...def, dependency_date_columns: date_columns } : def));
};

/** Marks each Button column set up or not, so a cell without automations offers "Set up". `null` while unknown. */
const attachButtonSetUp = (defs: TableColumnDef[], set_up_ids: Set<string> | null): TableColumnDef[] => {
  if (!set_up_ids) return defs;
  return defs.map((def) => (def.kind === "button" && def.button ? { ...def, button: { ...def.button, is_set_up: set_up_ids.has(def.id) } } : def));
};

/**
 * Gives every formula column the list of columns its expression may read: all
 * the same-scope columns of a readable kind (hidden ones included, so hiding a
 * column never breaks a formula) plus the row's own name.
 */
const attachFormulaSources = (defs: TableColumnDef[], name_title: string): TableColumnDef[] => {
  if (!defs.some((def) => def.kind === "formula")) return defs;
  const sources: FormulaSourceColumn[] = [
    { id: NAME_COLUMN_ID, title: name_title, kind: "text" },
    ...defs.filter((def) => isFormulaSourceKind(def.kind)).map(({ id, title, kind, options }) => ({ id, title, kind, options })),
  ];
  return defs.map((def) => (def.kind === "formula" ? { ...def, formula_sources: sources } : def));
};

/** Every item of the tree (root items, then their subitems) as the `id` and `name` pairs a comment's `#` picker can link to. */
const listReferenceItems = (items: BoardItemDto[]): { id: string; name: string }[] =>
  items.flatMap((item) => [{ id: String(item.id), name: item.name }, ...listReferenceItems(item.children)]);

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
 * A Kanban card's due date, labeled the Asana way: "Today", "Tomorrow" and
 * "Yesterday" for the days around now, "Oct 14" for the rest of this year and
 * "Oct 14, 2027" otherwise. The tone paints it red once it's past due and
 * green when it's due today or tomorrow.
 *
 * A plain `YYYY-MM-DD` string parses as UTC midnight (`new Date(value)`), but
 * `toLocaleDateString()` reads it back in the local zone, so west of UTC a
 * stored "2026-08-06" would read as "Aug 5". Parsing the y/m/d digits into a
 * local `Date` sidesteps that round trip.
 */
const formatKanbanDueDate = (value: string): { label: string; tone: KanbanDueDateTone } => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  if (Number.isNaN(date.getTime())) return { label: value, tone: "default" };
  const today = new Date();
  const start_of_today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start_of_date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day_offset = Math.round((start_of_date.getTime() - start_of_today.getTime()) / (24 * 60 * 60 * 1000));
  const label =
    day_offset === 0
      ? "Today"
      : day_offset === 1
        ? "Tomorrow"
        : day_offset === -1
          ? "Yesterday"
          : date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
            });
  return { label, tone: day_offset < 0 ? "overdue" : day_offset <= 1 ? "soon" : "default" };
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

  // The Tags column's shared option list is board-wide, not per-tab (see
  // `BoardTag`'s own doc comment server-side) — fetched once per board,
  // mirroring `access` above rather than the columns/groups/items/views
  // fetch below, which re-runs on every tab switch.
  const [tags, setTags] = useState<BoardTagDto[]>([]);
  useEffect(() => {
    let cancelled = false;
    setTags([]);
    boardContentService
      .getTags(node.id)
      .then((data) => {
        if (!cancelled) setTags(data);
      })
      .catch(() => {
        // Tags cells just render with an empty palette; not worth a whole-board error state over.
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
  const [roster_members, setRosterMembers] = useState<WorkspaceMember[]>(() =>
    node.owners.map((owner) => ({
      id: owner.id,
      full_name: owner.full_name,
      profile_photo_url: owner.profile_photo_url,
      email: "",
      role: null,
      is_recent: false,
      invited_by: null,
      joined_at: null,
      is_creator: false,
    }))
  );
  useEffect(() => {
    let cancelled = false;
    workspaceService
      .getWorkspaceMembers(node.workspace.slug, { include_deactivated: true })
      .then((data) => {
        if (!cancelled) setRosterMembers(data);
      })
      .catch(() => {
        // Keep the `node.owners` seed on failure rather than clearing the roster.
      });
    return () => {
      cancelled = true;
    };
  }, [node.workspace.slug]);

  // Deactivated (disabled or deleted) accounts stay in `roster_members` so the items they were assigned to
  // still show them, faded. `workspace_members` is the subset that can be newly assigned or mentioned.
  const workspace_members = useMemo(() => roster_members.filter((member) => !member.is_deactivated), [roster_members]);

  const [loaded, setLoaded] = useState<{
    columns: BoardColumnDto[];
    groups: BoardGroupDto[];
    items: BoardItemDto[];
    views: BoardViewDto[];
    personal_order: number[] | null;
    personal_hidden_view_ids: number[];
    personal_default_view_id: number | null;
    personal_states: Record<string, BoardViewPersonalStateDto>;
    collapsed_group_ids: number[];
    /**
     * Ids of every group whose items are already present in `items` above —
     * every group for a non-`"table"` tab (Kanban/Calendar/Gantt still need
     * the whole tab up front for their own aggregation), or none yet for a
     * `"table"` tab, which loads each table's rows lazily instead (see
     * `GroupSection`). Threaded into `TableBoardBody` as
     * `initial_loaded_group_ids`.
     */
    loaded_group_ids: number[];
  } | null>(null);
  const [has_error, setHasError] = useState(false);
  const loader_router = useRouter();
  // The board whose "Set as my default view" preference was already applied.
  // Only the first load of a board opens the default view, so clicking the
  // primary tab afterwards still lands on the primary tab.
  const default_view_board_ref = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    setHasError(false);

    // Each tab (view) has its own independent columns/groups/items, so the
    // fetch is re-run on every tab switch, not just on board change — see
    // `active_view_id` in the dependency array below.
    //
    // `items` is deliberately NOT part of this first batch: a `"table"` tab
    // can hold 100+ tables (groups), and fetching every one's rows up front
    // is exactly the slow-load problem `GroupSection`'s lazy per-table
    // loading exists to avoid. Once `columns`/`groups`/`views` resolve, the
    // active tab's own `view_type` decides whether items are still fetched
    // eagerly here (every other view kind, which needs the full set for its
    // own board-wide aggregation) or left for `GroupSection` to request
    // table-by-table as the viewer scrolls.
    Promise.all([
      boardContentService.getColumns(node.id, active_view_id),
      boardContentService.getGroups(node.id, active_view_id),
      boardContentService.getViews(node.id),
    ])
      .then(async ([columns, groups_index, views]) => {
        if (cancelled) return;
        const is_first_load = default_view_board_ref.current !== node.id;
        default_view_board_ref.current = node.id;
        const default_view = views.views.find((view) => view.id === views.personal_default_view_id);
        // A link that carries its own view or filters wins over the default view.
        const has_explicit_target = active_view_id != null || window.location.search.length > 0;
        if (is_first_load && !has_explicit_target && default_view && !default_view.is_primary) {
          loader_router.replace(`/boards/${node.id}/views/${default_view.id}`);
          return;
        }

        const active_view =
          views.views.find((view) => view.id === active_view_id) ??
          views.views.find((view) => view.is_primary) ??
          views.views[0];
        const is_lazy_table_view = (active_view?.view_type ?? "table") === "table";
        const items = is_lazy_table_view ? [] : await boardContentService.getItems(node.id, active_view_id);

        if (!cancelled) {
          setLoaded({
            columns,
            groups: groups_index.groups,
            items,
            views: views.views,
            personal_order: views.personal_order,
            personal_hidden_view_ids: views.personal_hidden_view_ids,
            personal_default_view_id: views.personal_default_view_id,
            personal_states: views.personal_states,
            collapsed_group_ids: groups_index.collapsed_group_ids,
            loaded_group_ids: is_lazy_table_view ? [] : groups_index.groups.map((group) => group.id),
          });
        }
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [node.id, active_view_id, loader_router]);

  const handleChangeBoardType = async (next_board_type: BoardType) => {
    await import("@/services/workspace.service").then(({ workspaceService }) =>
      workspaceService.updateNavItem(workspace_slug, node.id, { board_type: next_board_type })
    );
    setBoardType(next_board_type);
    // The sidebar shows the type as a lock or share badge on the board icon.
    notifyNavItemChanged();
  };

  const info = buildBoardInfo(node, board_type, () => setIsChangeTypeOpen(true));

  // While the board's content loads there is no active view yet, so the tab shows just the
  // board name. `TableBoardBody` takes over (board and view, or the open item) once mounted.
  useDocumentTitle(loaded || has_error ? null : buildPageTitle(node.label));

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
        access={access}
        onAccessChange={setAccess}
        workspace_members={workspace_members}
        roster_members={roster_members}
        onInviteClick={() => setIsInviteOpen(true)}
        initial_tags={tags}
        initial_columns={loaded.columns}
        initial_groups={loaded.groups}
        initial_items={loaded.items}
        initial_loaded_group_ids={loaded.loaded_group_ids}
        initial_views={loaded.views}
        initial_active_view_id={active_view_id ?? null}
        initial_personal_order={loaded.personal_order}
        initial_hidden_view_ids={loaded.personal_hidden_view_ids}
        initial_default_view_id={loaded.personal_default_view_id}
        initial_personal_states={loaded.personal_states}
        initial_collapsed_group_ids={loaded.collapsed_group_ids}
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
  /** Full "who can access this board" roster, shared with `BoardInviteModal` — the board options menu's "Permissions" panel reads/mutates the same list. */
  access: BoardAccessEntry[];
  onAccessChange: (access: BoardAccessEntry[]) => void;
  /** The full workspace roster, assignable to People columns (Assignee row, People cells, Calendar members, etc), see the fetch in `TableBoardView`. */
  workspace_members: WorkspaceMember[];
  /** `workspace_members` plus the deactivated accounts, so items assigned to them still resolve their name and avatar. Not for pickers. */
  roster_members: WorkspaceMember[];
  /** The Tags column's board-wide option list — see the fetch in `TableBoardView` and `BoardTag`'s own doc comment server-side. */
  initial_tags: BoardTagDto[];
  initial_columns: BoardColumnDto[];
  initial_groups: BoardGroupDto[];
  initial_items: BoardItemDto[];
  /** Ids of every group whose items are already present in `initial_items` — see `loaded.loaded_group_ids`'s own doc comment in `TableBoardView`. */
  initial_loaded_group_ids: number[];
  initial_views: BoardViewDto[];
  initial_active_view_id: number | null;
  initial_personal_order: number[] | null;
  /** Tabs the viewer hid for themselves. */
  initial_hidden_view_ids: number[];
  /** The tab the viewer wants opened first, or null for the primary tab. */
  initial_default_view_id: number | null;
  /** The viewer's remembered, unsaved toolbar changes per view id ("Remember my filters"). */
  initial_personal_states: Record<string, BoardViewPersonalStateDto>;
  /** Ids of this tab's tables the viewer had collapsed the last time they visited — see `useBoardTable`'s `initial_collapsed_groups`. */
  initial_collapsed_group_ids: number[];
  initial_open_item_id: number | null;
};

/**
 * Column kinds the Calendar's New Item dialog lets the viewer fill in, the
 * ones a person types or picks. Computed and linked kinds (formula, mirror,
 * auto number, connect boards, files...) are left out, as in monday.com.
 */
const CALENDAR_NEW_ITEM_KINDS = new Set<BoardColumnDto["type"]>([
  "status",
  "label",
  "people",
  "date",
  "timeline",
  "dropdown",
  "text",
  "long_text",
  "number",
  "checkbox",
  "rating",
  "phone",
  "email",
  "link",
  "country",
  "week",
]);

/** Stable row accessors for the Calendar view, so its event list only rebuilds when the rows change. */
const getCalendarRowId = (row: BoardItemDto): string => String(row.id);
const getCalendarRowTitle = (row: BoardItemDto): string => row.name;

/**
 * Mounted only once the board's columns/groups/items/views have all loaded,
 * so `useBoardToolbar`'s lazy initial state (e.g. "which columns are
 * searchable by default") reads the real column list on its very first
 * render instead of an empty placeholder.
 */
const TableBoardBody: React.FC<TableBoardBodyProps> = ({
  node,
  breadcrumb,
  board_type,
  info,
  invite_count,
  onInviteClick,
  access,
  onAccessChange,
  workspace_members,
  roster_members,
  initial_tags,
  initial_columns,
  initial_groups,
  initial_items,
  initial_loaded_group_ids,
  initial_views,
  initial_active_view_id,
  initial_personal_order,
  initial_hidden_view_ids,
  initial_default_view_id,
  initial_personal_states,
  initial_collapsed_group_ids,
  initial_open_item_id,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const search_params = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const board_id = node.id;

  // ── Board options menu ("...") state — rename/archive both apply in place
  // (the board stays open; only its label/menu-row flip), so these live here
  // rather than as a `node` mutation. Delete instead navigates away — see
  // `handleDeleteBoard`. ──
  const [board_label, setBoardLabel] = useState(node.label);
  const [is_board_archived, setIsBoardArchived] = useState(node.is_archived);
  // Board permissions: only the mode shown in the Permissions dialog changes
  // locally, the owner changing it keeps full access either way.
  const [board_edit_permission, setBoardEditPermission] = useState(node.edit_permission ?? "everything");
  const [is_board_favorite, setIsBoardFavorite] = useState(node.is_favorite);

  const handleToggleFavorite = async () => {
    const next_value = !is_board_favorite;
    setIsBoardFavorite(next_value);
    try {
      await personalService.setFavorite(board_id, next_value);
    } catch {
      setIsBoardFavorite(!next_value);
    }
  };

  const handleEditPermissionChange = async (edit_permission: BoardEditPermission) => {
    const updated = await boardOptionsService.updateBoardPermission(board_id, edit_permission);
    setBoardEditPermission(updated.edit_permission);
  };

  const handleRenameBoard = async (label: string) => {
    await workspaceService.updateNavItem(node.workspace.slug, board_id, { label });
    setBoardLabel(label);
  };

  const handleDuplicateBoard = async () => {
    const copy = await workspaceService.duplicateNavItem(node.workspace.slug, board_id);
    router.push(`/boards/${copy.id}`);
  };

  const handleArchiveBoard = async () => {
    await boardOptionsService.archiveBoard(board_id);
    setIsBoardArchived(true);
  };

  const handleUnarchiveBoard = async () => {
    await boardOptionsService.unarchiveBoard(board_id);
    setIsBoardArchived(false);
  };

  const handleDeleteBoard = async () => {
    await workspaceService.deleteNavItem(node.workspace.slug, board_id);
    router.push("/workspace-home");
  };

  const [tags, setTags] = useState(initial_tags);
  const [columns, setColumns] = useState(initial_columns);
  // Column menu's "Column permissions" (board owners only).
  const [permissions_column_id, setPermissionsColumnId] = useState<number | null>(null);
  const [groups, setGroups] = useState(initial_groups);
  // The group whose "Delete group" is waiting on the confirmation dialog.
  const [group_pending_delete, setGroupPendingDelete] = useState<BoardGroupDto | null>(null);
  const [items, setItems] = useState(initial_items);
  // ── Automations ("Automate" header button) — table-view-scoped, so this
  // refetches whenever the active tab changes, mirroring `handleUpdateColumnFormula`'s
  // neighbors' own `board_id`/`view_tabs.active_view_id`-keyed fetches. ──
  const [automations, setAutomations] = useState<BoardAutomationDto[]>([]);
  // The tab whose automations `automations` holds, Button cells only offer "Set up" once they are known.
  const [automations_view_id, setAutomationsViewId] = useState<number | null | undefined>(undefined);
  const [is_automations_modal_open, setIsAutomationsModalOpen] = useState(false);
  // Set when another dialog asks the Automations center to open one automation in the builder.
  const [automation_edit_id, setAutomationEditId] = useState<number | null>(null);
  // Set by a column header's "Automate", the builder opens with a trigger for that column.
  const [automation_column_id, setAutomationColumnId] = useState<string | null>(null);
  // ── Integrations ("Integrate" header button) — connects Email and Slack. Slack's OAuth round
  // trip leaves the app, so the API sends the browser back to `integrations_return_path`, and the
  // `integrate` param reopens the dialog on arrival (see the effect below). ──
  const [is_integrations_modal_open, setIsIntegrationsModalOpen] = useState(false);
  const integrations_return_path = `${pathname}?integrate=slack`;

  useEffect(() => {
    if (search_params.get("integrate") === "slack") setIsIntegrationsModalOpen(true);
  }, [search_params]);

  const handleCloseIntegrations = () => {
    setIsIntegrationsModalOpen(false);
    if (!search_params.has("integrate")) return;
    const next_params = new URLSearchParams(search_params.toString());
    next_params.delete("integrate");
    const query = next_params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };
  // ── Item detail drawer's Activity tab — the board's own activity log
  // already carries an `item_id` in `meta` for the entries that concern one
  // specific item (restored, permanently deleted, an automation ran against
  // it), see `getActivityLog` below. Fetched once per board rather than
  // per-row, mirroring `automations`' own board-scoped fetch. ──
  const [activity_log_entries, setActivityLogEntries] = useState<BoardActivityLogEntry[]>([]);
  const [item_detail_by_id, setItemDetailById] = useState<Record<string, BoardItemDetailDto>>({});

  const [editing_item_id, setEditingItemId] = useState<number | null>(null);
  // ── Selection action bar — see `handleBulkDuplicate`/`handleBulkMove`/
  // `handleBulkArchive`/`handleBulkDelete` below for the actions themselves. ──
  const [selected_item_ids, setSelectedItemIds] = useState<number[]>([]);
  const [is_bulk_action_busy, setIsBulkActionBusy] = useState(false);
  // Bumped after every bulk action resolves (and on the bar's own "×") to
  // tell `BoardTable`'s internal `state.selected_map` to reset — see
  // `BoardTable`'s `clear_selection_signal` prop doc comment.
  const [selection_clear_signal, setSelectionClearSignal] = useState(0);
  const [item_column_label] = useState(node.item_column_label ?? "Item");
  const [item_column_width, setItemColumnWidth] = useState<number | null>(node.item_column_width ?? null);
  const [sub_item_column_width, setSubItemColumnWidth] = useState<number | null>(node.sub_item_column_width ?? null);
  // Keyed the same way `useBoardTable`'s own `collapsed_groups` state is
  // (`board_groups.id` as a string) — this whole component remounts on every
  // tab switch (see `TableBoardView`'s loading-spinner branch), so seeding
  // this once from `initial_collapsed_group_ids` is enough to pick up a
  // different tab's own saved collapse state without a separate resync effect.
  const [collapsed_group_map] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initial_collapsed_group_ids.map((id) => [String(id), true]))
  );
  const [adding_kanban_lane_id, setAddingKanbanLaneId] = useState<string | null>(null);
  // A Kanban card menu's "Archive" or "Delete", waiting on its confirm dialog.
  const [kanban_card_confirm, setKanbanCardConfirm] = useState<{ kind: "archive" | "delete"; row_id: string } | null>(null);

  const columns_by_id = useMemo(
    () => Object.fromEntries(columns.map((c) => [String(c.id), c])),
    [columns]
  );
  // Every root-item-scoped column — drives Kanban's structural lanes and the toolbar.
  const item_columns = useMemo(() => columns.filter((c) => c.scope === "item"), [columns]);
  // Every subitem-scoped column: the Table view's subitem rows, and the toolbar's "Filter subitems" fields.
  const subitem_columns = useMemo(() => columns.filter((c) => c.scope === "subitem"), [columns]);
  const people_names_by_id = useMemo(
    () => Object.fromEntries(roster_members.map((o) => [String(o.id), o.full_name])),
    [roster_members]
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
  // The board's first `dependency` column drives the Gantt view's arrows,
  // critical path and Finish to Start auto reschedule.
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
      // Not a real `board_columns` row (see `onResizeItemColumn`'s own doc
      // comment below), so it's absent from `item_columns`/`table_base_columns`
      // — `toolbar.pinned_column_ids` toggling this id would never match a
      // real column there, silently inflating `table_pinned_count` past the
      // columns actually pinned. It already always freezes on its own
      // (`ItemRow`'s leading sticky cells), so offering it as a pin toggle
      // would be a no-op at best.
      pinnable: false,
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
        is_priority: g.is_priority,
        rows: items.filter((item) => item.group_id === g.id),
      })),
    [groups, items]
  );

  const getColumnText = useCallback(
    (row: BoardItemDto, column_id: string): string => {
      if (column_id === ITEM_COLUMN_ID) return row.name;
      if (column_id === CHAT_COLUMN_ID) return String(row.comment_count);
      const column = columns_by_id[column_id];
      // Computed columns hold no value, their text comes from the item itself.
      if (column?.type === "creation_log") {
        const name = row.created_by_id != null ? people_names_by_id[String(row.created_by_id)] ?? "" : "";
        return `${name} ${formatDate(row.created_at ?? null)}`.trim();
      }
      if (column?.type === "last_updated") {
        const person_id = row.last_updated_by_id ?? row.created_by_id;
        const name = person_id != null ? people_names_by_id[String(person_id)] ?? "" : "";
        return `${name} ${formatDate(row.last_updated_at ?? row.created_at ?? null)}`.trim();
      }
      const value = row.values[column_id];
      if (value == null) return "";
      if (column?.type === "doc") return docCellTitle(value);
      if (column?.type === "country" && typeof value === "string") return countryName(value);
      if (column?.type === "world_clock" && typeof value === "string") return timeZoneCity(value);
      if (column?.type === "week" && typeof value === "string") return formatWeekRange(value);
      if (column?.type === "hour" && typeof value === "string") return formatHour(value, column.config?.hour_format === "24");
      if (column?.type === "people" && Array.isArray(value)) {
        return value.map((id) => people_names_by_id[String(id)] ?? String(id)).join(" ");
      }
      // `link`/`time_tracking`/`files` all store an object (or array of
      // objects) rather than a plain scalar/string[] — the generic
      // `Array.isArray`/`String()` fallback below would otherwise search/sort
      // against "[object Object]" for every row.
      if (column?.type === "link" && typeof value === "object" && !Array.isArray(value)) {
        const link = value as BoardLinkValue;
        return `${link.text ?? ""} ${link.url ?? ""}`.trim();
      }
      if (column?.type === "time_tracking" && typeof value === "object" && !Array.isArray(value)) {
        return String((value as BoardTimeTrackingValue).seconds ?? 0);
      }
      if (column?.type === "files" && Array.isArray(value)) {
        return value.map((file) => (typeof file === "object" && file ? file.file_name : "")).join(" ");
      }
      if (column?.type === "checklist" && Array.isArray(value)) {
        return (value as unknown[])
          .map((entry) => (typeof entry === "object" && entry && "text" in entry ? String((entry as { text: unknown }).text ?? "") : ""))
          .join(" ")
          .trim();
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
        avatar_url: member.profile_photo_url ?? undefined,
      })),
    [workspace_members]
  );

  // Sort, Group by and filter descriptions per column type, see `boardToolbarFields.ts`.
  const toolbar_field_sources: BoardToolbarFieldSources = useMemo(
    () => ({
      item_columns,
      subitem_columns,
      groups,
      tags,
      persons,
      people_names_by_id,
      item_column_id: ITEM_COLUMN_ID,
      item_column_label,
      getColumnText,
    }),
    [item_columns, subitem_columns, groups, tags, persons, people_names_by_id, item_column_label, getColumnText]
  );
  const sort_options = useMemo(() => buildBoardSortOptions(toolbar_field_sources), [toolbar_field_sources]);
  const group_by_options = useMemo(() => buildBoardGroupByOptions(toolbar_field_sources), [toolbar_field_sources]);
  const filter_fields = useMemo(() => buildBoardFilterFields(toolbar_field_sources), [toolbar_field_sources]);
  const current_person_id = user ? String(user.id) : null;

  // Account teams the Person filter can pick, each with its members who can see this board.
  const [board_teams, setBoardTeams] = useState<BoardTeamOption[]>([]);
  useEffect(() => {
    let is_cancelled = false;
    peopleService
      .listBoardTeams(board_id)
      .then((teams) => {
        if (is_cancelled) return;
        setBoardTeams(teams.map((team) => ({ id: String(team.id), name: team.name, member_ids: team.member_ids.map(String) })));
      })
      .catch(() => {});
    return () => {
      is_cancelled = true;
    };
  }, [board_id]);

  // Root item ids whose updates match the search, while "Search in updates" is on (see the effect below the toolbar).
  const [update_match_row_ids, setUpdateMatchRowIds] = useState<Set<string> | null>(null);

  const subitem_search_column_ids = useMemo(
    () => [ITEM_COLUMN_ID, ...subitem_columns.map((column) => String(column.id))],
    [subitem_columns]
  );

  // Formula results are computed while rendering, so an export computes them the same way the cells do.
  const formula_defs_by_id = useMemo(() => {
    const defs = attachFormulaSources(item_columns.map(toTableColumnDef).filter((c): c is TableColumnDef => c !== null), item_column_label);
    return new Map(defs.filter((def) => def.kind === "formula").map((def) => [def.id, def]));
  }, [item_columns, item_column_label]);
  // Option ids read as their labels in a spreadsheet: Status, Label and Dropdown options per column, Tags board wide.
  const export_option_labels = useMemo(() => {
    const tag_labels = new Map(tags.map((tag) => [String(tag.id), tag.label]));
    return new Map(
      item_columns.map((column) => [
        String(column.id),
        column.type === "tags" ? tag_labels : new Map((column.config?.options ?? []).map((option) => [option.id, option.label])),
      ])
    );
  }, [item_columns, tags]);
  const getExportText = useCallback(
    (row: BoardItemDto, column_id: string) => {
      const formula_def = formula_defs_by_id.get(column_id);
      if (formula_def) return computeFormulaValue(formula_def, row.values as Record<string, CellValue>, row.name);
      const column = columns_by_id[column_id];
      const value = row.values[column_id];
      switch (column?.type) {
        case "status":
        case "label":
        case "dropdown":
        case "tags": {
          const labels = export_option_labels.get(column_id);
          return getValueIds(column, value)
            .map((id) => labels?.get(id) ?? id)
            .join(", ");
        }
        case "timeline": {
          const range = getValueDateRange(column, value);
          return range ? (range.start === range.end ? range.start : `${range.start} to ${range.end}`) : "";
        }
        case "checkbox":
          return isValueChecked(value) ? "Yes" : "";
        case "time_tracking": {
          const hours = getValueNumber(column, value);
          return hours === null ? "" : `${hours} h`;
        }
        default:
          return getColumnText(row, column_id);
      }
    },
    [formula_defs_by_id, columns_by_id, export_option_labels, getColumnText]
  );

  const toolbar_config: BoardToolbarConfig<BoardItemDto> = useMemo(
    () => ({
      columns: board_columns,
      default_groups,
      getRowId: (row) => String(row.id),
      getColumnText,
      persons,
      getPersonIds,
      current_person_id,
      sort_options,
      group_by_options,
      filter_fields,
      getSubRows: (row) => row.children ?? [],
      subitem_search_column_ids,
      person_field_ids: people_column_ids,
      teams: board_teams,
      update_match_row_ids,
      can_search_updates: true,
      recent_search_storage_key: `board_recent_searches_${board_id}`,
      getExportText,
    }),
    [
      board_columns,
      default_groups,
      getColumnText,
      persons,
      getPersonIds,
      current_person_id,
      sort_options,
      group_by_options,
      filter_fields,
      subitem_search_column_ids,
      people_column_ids,
      board_teams,
      update_match_row_ids,
      board_id,
      getExportText,
    ]
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
    initial_hidden_view_ids,
    initial_default_view_id,
    initial_personal_states,
    toolbar,
    can_auto_save_view: node.can_edit,
    onAutoSaveError: (error) => toast.error(getApiErrorMessage(error, "Couldn't save your filters to this view. Please try again.")),
    onViewActivated: (view) => router.push(buildViewUrl(view)),
  });

  // Unsaved filter/sort/group-by state lives in `?filters=...`, so a filtered board can be shared as a link.
  useBoardFilterUrlState({
    toolbar,
    active_view: view_tabs.active_view,
    active_view_id: view_tabs.active_view_id,
    is_view_applied: view_tabs.is_view_applied,
    current_filter_state: view_tabs.current_filter_state,
  });

  const handleAddView = (view_type?: BoardViewKind) => view_tabs.addView(view_type);
  const handleRenameView = (id: number | string, label: string) => view_tabs.renameView(Number(id), label);
  const handlePinView = (id: number | string) => view_tabs.pinView(Number(id));
  const handleDuplicateView = (id: number | string) => view_tabs.duplicateView(Number(id));
  const handleLockView = (id: number | string) => view_tabs.lockView(Number(id));
  // The hook already rolls the order back when the save fails.
  const handleReorderPersonalTabs = (ordered_ids: Array<number | string>) =>
    void view_tabs.reorderPersonalTabs(ordered_ids).catch(() => {});
  const handleChangeViewEmoji = (id: number | string, emoji: string | null) => view_tabs.changeViewEmoji(Number(id), emoji);
  const handleDeleteView = (id: number | string) => view_tabs.deleteView(Number(id));
  const handleResetPersonalTabOrder = () => void view_tabs.resetPersonalTabOrder().catch(() => {});
  const handleToggleHiddenView = (id: number | string) => void view_tabs.toggleHiddenView(Number(id)).catch(() => {});
  const handleSetDefaultView = (id: number | string | null) =>
    void view_tabs.setDefaultView(id === null ? null : Number(id)).catch(() => {});
  const handleChangeViewDescription = (id: number | string, description: string | null) =>
    view_tabs.changeViewDescription(Number(id), description);

  useEffect(() => {
    let cancelled = false;
    boardAutomationService
      .getAutomations(board_id, view_tabs.active_view_id)
      .then((data) => {
        if (cancelled) return;
        setAutomations(data);
        setAutomationsViewId(view_tabs.active_view_id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [board_id, view_tabs.active_view_id]);

  useEffect(() => {
    let cancelled = false;
    boardOptionsService
      .getActivityLog(board_id)
      .then((data) => { if (!cancelled) setActivityLogEntries(data); })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [board_id]);

  const handleCreateAutomation = async (payload: Omit<CreateBoardAutomationPayload, "view_id">) => {
    if (view_tabs.active_view_id == null) return;
    const created = await boardAutomationService.createAutomation(board_id, { ...payload, view_id: view_tabs.active_view_id });
    setAutomations((current) => [created, ...current]);
  };

  const handleToggleAutomation = async (automation_id: number, is_enabled: boolean) => {
    const updated = await boardAutomationService.updateAutomation(board_id, automation_id, { is_enabled });
    setAutomations((current) => current.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleUpdateAutomation = async (automation_id: number, payload: UpdateBoardAutomationPayload) => {
    const updated = await boardAutomationService.updateAutomation(board_id, automation_id, payload);
    setAutomations((current) => current.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleSaveAutomationTemplate = async (automation_id: number, name: string) => {
    await boardAutomationService.saveAsTemplate(board_id, automation_id, { name });
  };

  const openAutomationCenter = (edit_automation_id?: number, column_id?: string) => {
    setAutomationEditId(edit_automation_id ?? null);
    setAutomationColumnId(column_id ?? null);
    setIsAutomationsModalOpen(true);
    // Runs happen in the background (other people's changes, scheduled triggers), so the run counts are read again.
    boardAutomationService
      .getAutomations(board_id, view_tabs.active_view_id)
      .then(setAutomations)
      .catch(() => {});
  };

  // `?automation=<id>`, a link from the account wide Automations center, opens that automation in
  // the builder, `?automation=center` only the Automations center. Once per link.
  const automation_param = search_params.get("automation");
  const opened_automation_param = useRef<string | null>(null);
  useEffect(() => {
    if (!automation_param || opened_automation_param.current === automation_param) return;
    opened_automation_param.current = automation_param;
    const automation_id = Number(automation_param);
    openAutomationCenter(Number.isInteger(automation_id) && automation_id > 0 ? automation_id : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automation_param]);

  const clearAutomationParam = () => {
    if (!search_params.has("automation")) return;
    opened_automation_param.current = null;
    const next_params = new URLSearchParams(search_params.toString());
    next_params.delete("automation");
    const query = next_params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleDuplicateAutomation = async (automation_id: number) => {
    const copy = await boardAutomationService.duplicateAutomation(board_id, automation_id);
    setAutomations((current) => [copy, ...current]);
  };

  const handleDeleteAutomation = async (automation_id: number) => {
    await boardAutomationService.deleteAutomation(board_id, automation_id);
    setAutomations((current) => current.filter((a) => a.id !== automation_id));
  };

  // ── Lazy per-table item loading (Table view only) — see `GroupSection`'s
  // `IntersectionObserver` and `loaded.loaded_group_ids`'s own doc comment
  // in `TableBoardView`. `loaded_group_ids` is the set of groups whose rows
  // are already merged into `items`; `loading_group_ids_ref` is a ref (not
  // state) purely to de-dupe in-flight requests without forcing a re-render
  // per request. ──
  const [loaded_group_ids, setLoadedGroupIds] = useState<Set<number>>(() => new Set(initial_loaded_group_ids));
  const loading_group_ids_ref = useRef<Set<number>>(new Set());
  const is_all_items_loaded = useMemo(
    () => groups.length > 0 && groups.every((group) => loaded_group_ids.has(group.id)),
    [groups, loaded_group_ids]
  );

  /** Merges freshly-fetched rows into `items` by id — shared by `requestGroupItems` (one table) and `loadAllRemainingGroups` (several at once). */
  const mergeFetchedItems = useCallback((fetched: BoardItemDto[]) => {
    setItems((current) => {
      const by_id = new Map(current.map((item) => [item.id, item]));
      fetched.forEach((item) => by_id.set(item.id, item));
      return Array.from(by_id.values());
    });
  }, []);

  /** `useBoardTable`'s `onRequestGroupItems` — fired by a table's own `GroupSection` once it scrolls near the viewport. No-ops if that table is already loaded or has a fetch in flight. */
  const requestGroupItems = useCallback(
    (group_key: string) => {
      const group_id = Number(group_key);
      if (loaded_group_ids.has(group_id) || loading_group_ids_ref.current.has(group_id)) return;
      loading_group_ids_ref.current.add(group_id);
      boardContentService
        .getItems(board_id, view_tabs.active_view_id, undefined, [group_id])
        .then((fetched) => {
          mergeFetchedItems(fetched);
          setLoadedGroupIds((current) => new Set(current).add(group_id));
        })
        .catch(() => {})
        .finally(() => loading_group_ids_ref.current.delete(group_id));
    },
    [board_id, view_tabs.active_view_id, loaded_group_ids, mergeFetchedItems]
  );

  /**
   * Correctness fallback for search/sort/filter/"group by column" — those
   * are computed client-side over `items` by `useBoardToolbar`, which
   * silently under-counts any table `GroupSection` hasn't lazy-loaded yet.
   * Fetches every remaining not-yet-loaded table in one request the moment
   * any of those features becomes active (see the effect below), so results
   * are always computed over the whole tab rather than whatever happened to
   * have scrolled into view.
   */
  const loadAllRemainingGroups = useCallback(() => {
    const missing_ids = groups
      .map((group) => group.id)
      .filter((id) => !loaded_group_ids.has(id) && !loading_group_ids_ref.current.has(id));
    if (!missing_ids.length) return;
    missing_ids.forEach((id) => loading_group_ids_ref.current.add(id));
    boardContentService
      .getItems(board_id, view_tabs.active_view_id, undefined, missing_ids)
      .then((fetched) => {
        mergeFetchedItems(fetched);
        setLoadedGroupIds((current) => {
          const next = new Set(current);
          missing_ids.forEach((id) => next.add(id));
          return next;
        });
      })
      .catch(() => {})
      .finally(() => missing_ids.forEach((id) => loading_group_ids_ref.current.delete(id)));
  }, [groups, loaded_group_ids, board_id, view_tabs.active_view_id, mergeFetchedItems]);

  /**
   * Board options menu's "More actions" > "Import items" — fired once the
   * wizard has actually written rows. A bulk import can create new columns,
   * a brand-new table, and/or many items in one go, so rather than trying to
   * patch all of that into local state piecemeal, this just re-fetches
   * `columns`/`groups` outright and force-refetches the target table's own
   * items (bypassing `requestGroupItems`'s "already loaded" guard, which
   * would otherwise no-op for a table the viewer already had open).
   */
  const handleImportItems = useCallback(
    (result: { group_id: number }) => {
      boardContentService.getColumns(board_id, view_tabs.active_view_id).then(setColumns).catch(() => {});
      boardContentService
        .getGroups(board_id, view_tabs.active_view_id)
        .then((groups_index) => setGroups(groups_index.groups))
        .catch(() => {});
      boardContentService
        .getItems(board_id, view_tabs.active_view_id, undefined, [result.group_id])
        .then((fetched) => {
          mergeFetchedItems(fetched);
          setLoadedGroupIds((current) => new Set(current).add(result.group_id));
        })
        .catch(() => {});
    },
    [board_id, view_tabs.active_view_id, mergeFetchedItems]
  );

  /** The board's trash panel restored an archived group: refetch the tab's groups so it shows up again (its rows lazy-load as usual). */
  const handleGroupsRestored = useCallback(() => {
    boardContentService
      .getGroups(board_id, view_tabs.active_view_id)
      .then((groups_index) => setGroups(groups_index.groups))
      .catch(() => {});
  }, [board_id, view_tabs.active_view_id]);

  // Sort, "group by column" and the open Quick filters panel (whose live
  // counts are computed over every row) need every table's rows, so they
  // trigger the load-everything fallback above. Plain filtering does not:
  // it is answered by the server-side filter query below.
  const is_quick_filter_panel_open = toolbar.active_panel === "filter" && toolbar.filter_mode === "quick";
  // The Person panel's per person counts are computed over every row too.
  const is_person_panel_open = toolbar.active_panel === "person";
  // The server search only reads item names and values, so matching subitems or updates is answered client-side over every row.
  const is_wide_search = toolbar.search_query.trim() !== "" && (toolbar.search_include_subitems || toolbar.search_include_updates);
  useEffect(() => {
    const needs_every_row =
      toolbar.sort_rules.some((rule) => rule.sort_option_id) ||
      toolbar.group_by_option_id !== BOARD_DEFAULT_GROUP_BY_ID ||
      is_quick_filter_panel_open ||
      is_person_panel_open ||
      is_wide_search;
    if (needs_every_row) loadAllRemainingGroups();
  }, [toolbar.sort_rules, toolbar.group_by_option_id, is_quick_filter_panel_open, is_person_panel_open, is_wide_search, loadAllRemainingGroups]);

  // "Search in updates": which root items have an update or reply containing the query.
  const update_search_query = toolbar.search_include_updates ? toolbar.search_query.trim() : "";
  useEffect(() => {
    if (!update_search_query) {
      setUpdateMatchRowIds(null);
      return;
    }
    let is_cancelled = false;
    const timeout = window.setTimeout(() => {
      boardContentService
        .getUpdateMatchItemIds(board_id, update_search_query, view_tabs.active_view_id)
        .then((item_ids) => {
          if (!is_cancelled) setUpdateMatchRowIds(new Set(item_ids.map(String)));
        })
        .catch(() => {});
    }, 300);
    return () => {
      is_cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [update_search_query, board_id, view_tabs.active_view_id]);

  /**
   * Server-side filtering (`BoardItemFilterService::applyFilterState()`): while
   * any Person, Quick or Advanced filter applies, one request returns every
   * matching row across all tables, instead of downloading every table first.
   * The client-side filter still runs on top, so rows loaded earlier that no
   * longer match stay hidden, and a condition the server cannot evaluate
   * (it passes those through) is still applied. `server_filter_key` marks
   * which filter the merged rows answer, so tables count as loaded for it,
   * the same way an active search does.
   */
  const server_filter = useMemo(() => {
    const isSent = (rule: BoardAdvancedFilterRow) => !rule.is_disabled && isRuleComplete(rule);
    const filter_state = {
      selected_person_ids: toolbar.selected_person_ids,
      selected_team_ids: toolbar.selected_team_ids,
      person_column_ids: toolbar.person_column_ids,
      quick_filter_selections: toolbar.quick_filter_selections,
      quick_filter_exclusions: toolbar.quick_filter_exclusions,
      advanced_filter_rows: toolbar.advanced_filter_rows.filter(isSent),
      advanced_filter_groups: toolbar.advanced_filter_groups
        .map((group) => ({ ...group, rules: group.rules.filter(isSent) }))
        .filter((group) => group.rules.length > 0),
      advanced_filter_operator: toolbar.advanced_filter_operator,
      include_subitems: toolbar.include_subitems,
    };
    const hasPicks = (selections: Record<string, string[]>) => Object.values(selections).some((ids) => ids.length > 0);
    const is_active =
      filter_state.selected_person_ids.length > 0 ||
      filter_state.selected_team_ids.length > 0 ||
      hasPicks(filter_state.quick_filter_selections) ||
      hasPicks(filter_state.quick_filter_exclusions) ||
      filter_state.advanced_filter_rows.length > 0 ||
      filter_state.advanced_filter_groups.length > 0;
    if (!is_active) return null;
    const payload = { filter_state, today: toolbar.filter_context.today, timezone: VIEWER_TIME_ZONE };
    return { payload, key: JSON.stringify(payload) };
  }, [
    toolbar.selected_person_ids,
    toolbar.selected_team_ids,
    toolbar.person_column_ids,
    toolbar.quick_filter_selections,
    toolbar.quick_filter_exclusions,
    toolbar.advanced_filter_rows,
    toolbar.advanced_filter_groups,
    toolbar.advanced_filter_operator,
    toolbar.include_subitems,
    toolbar.filter_context.today,
  ]);
  const [server_filter_key, setServerFilterKey] = useState<string | null>(null);
  const is_server_filter_loaded = server_filter !== null && server_filter.key === server_filter_key;

  useEffect(() => {
    if (!server_filter || is_all_items_loaded) return;
    let is_cancelled = false;
    const timeout = window.setTimeout(() => {
      boardContentService
        .getItems(board_id, view_tabs.active_view_id, undefined, undefined, server_filter.payload)
        .then((fetched) => {
          if (is_cancelled) return;
          mergeFetchedItems(fetched);
          setServerFilterKey(server_filter.key);
        })
        .catch(() => {
          // Fall back to loading every table, so the filter is still correct.
          if (!is_cancelled) loadAllRemainingGroups();
        });
    }, 300);
    return () => {
      is_cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [server_filter, is_all_items_loaded, board_id, view_tabs.active_view_id, mergeFetchedItems, loadAllRemainingGroups]);

  /**
   * Real server-side search (`BoardItemFilterService::applySearch()`, which
   * matches the item name OR any column's value, not scoped to specific
   * columns) — replaces fetching the entire tab just to filter it
   * client-side. `deriveBoardRows`'s existing client-side `matchesSearch`
   * still runs on top of this, over the much smaller server-narrowed set:
   * that's also how "search only these columns" keeps working despite the
   * backend not supporting column-scoping, the server call is always the
   * broad superset, narrowed further client-side. Debounced so each
   * keystroke doesn't fire its own request.
   */
  useEffect(() => {
    const query = toolbar.search_query.trim();
    if (!query) return;
    const timeout = window.setTimeout(() => {
      boardContentService
        .getItems(board_id, view_tabs.active_view_id, query)
        .then(mergeFetchedItems)
        .catch(() => {});
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [toolbar.search_query, board_id, view_tabs.active_view_id, mergeFetchedItems]);

  // Ctrl/Cmd+F opens (or refocuses) the board's own search box instead of the
  // browser's in-page find, so the Table view's Ctrl/Cmd+F match navigation
  // (`active_search_match_grid` above) is what the shortcut actually reaches.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        toolbar.openSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toolbar.openSearch]);

  // Item-detail deep link (`/boards/{id}/pulses/{item_id}`) into a table
  // that hasn't lazy-loaded yet: the drawer-sync effect below (which reads
  // `items` via `findItemInTree`) would otherwise silently never open it
  // until that table happens to scroll into view on its own. Resolving the
  // item directly tells us which table it belongs to, so that one table can
  // be requested immediately regardless of where it sits in the tab.
  const requested_deep_link_item_ref = useRef<number | null>(null);
  useEffect(() => {
    if (!initial_open_item_id || is_all_items_loaded) return;
    if (requested_deep_link_item_ref.current === initial_open_item_id) return;
    if (findItemInTree(items, initial_open_item_id)) return;
    requested_deep_link_item_ref.current = initial_open_item_id;
    boardContentService
      .getItem(board_id, initial_open_item_id)
      .then((detail) => requestGroupItems(String(detail.group_id)))
      .catch(() => {});
  }, [initial_open_item_id, is_all_items_loaded, items, board_id, requestGroupItems]);

  // ── Rename item — used by Kanban's card-title inline editor. Only the name
  // field is merged back in (not the whole server item) so a stale
  // `comment_count`/`values` response can't clobber what's already known
  // client-side. ──
  const handleRenameItem = async (item_id: number, name: string) => {
    const updated = await boardContentService.updateItem(board_id, item_id, { name });
    setItems((current) => mapItemInTree(current, item_id, (item) => ({ ...item, name: updated.name })));
    setEditingItemId(null);
  };

  /** "Move to" target list for the selection action bar — every table (group) in the active tab. */
  const selection_move_targets = useMemo(() => groups.map((g) => ({ id: String(g.id), label: g.name })), [groups]);

  // ── Selection action bar — bulk actions on the Table view's checked root
  // items. Deliberately scoped to root items only (see `BoardTable`'s
  // `onSelectionChange` doc comment): a subitem's `group_id` is denormalized
  // from its parent, so moving/archiving/deleting it independently isn't a
  // supported operation on its own. ──
  const handleBulkDuplicate = async () => {
    if (!selected_item_ids.length || is_bulk_action_busy) return;
    setIsBulkActionBusy(true);
    try {
      const duplicates = await boardContentService.duplicateItems(board_id, selected_item_ids);
      setItems((current) => [...current, ...duplicates]);
      setSelectionClearSignal((n) => n + 1);
    } finally {
      setIsBulkActionBusy(false);
    }
  };

  const handleBulkMove = async (target_group_id: string) => {
    if (!selected_item_ids.length || is_bulk_action_busy) return;
    setIsBulkActionBusy(true);
    try {
      const moved = await boardContentService.moveItems(board_id, selected_item_ids, Number(target_group_id));
      const moved_by_id = new Map(moved.map((item) => [item.id, item]));
      // Merges only the fields the move actually changed (`group_id`/`position`)
      // rather than replacing the whole item — `bulkMove`'s response doesn't
      // eager-load `childrenRecursive`, so a wholesale replace would wipe out
      // any subitems already known locally (mirrors `handleRenameItem`'s own
      // merge-not-replace, just above).
      setItems((current) =>
        current.map((item) => {
          const update = moved_by_id.get(item.id);
          return update ? { ...item, group_id: update.group_id, position: update.position } : item;
        })
      );
      setSelectionClearSignal((n) => n + 1);
    } finally {
      setIsBulkActionBusy(false);
    }
  };

  const handleBulkEditColumn = async (column_id: string, value: BoardItemValue) => {
    if (!selected_item_ids.length || is_bulk_action_busy) return;
    setIsBulkActionBusy(true);
    try {
      await boardContentService.bulkSetColumnValue(board_id, selected_item_ids, Number(column_id), value);
      setItems((current) =>
        current.map((item) =>
          selected_item_ids.includes(item.id) ? { ...item, values: { ...item.values, [column_id]: value } } : item
        )
      );
      setSelectionClearSignal((n) => n + 1);
    } finally {
      setIsBulkActionBusy(false);
    }
  };

  const handleBulkArchive = async () => {
    if (!selected_item_ids.length || is_bulk_action_busy) return;
    setIsBulkActionBusy(true);
    try {
      await boardContentService.archiveItems(board_id, selected_item_ids);
      setItems((current) => selected_item_ids.reduce((acc, id) => removeItemFromTree(acc, id), current));
      setSelectionClearSignal((n) => n + 1);
    } finally {
      setIsBulkActionBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selected_item_ids.length || is_bulk_action_busy) return;
    setIsBulkActionBusy(true);
    try {
      await boardContentService.deleteItems(board_id, selected_item_ids);
      setItems((current) => selected_item_ids.reduce((acc, id) => removeItemFromTree(acc, id), current));
      setSelectionClearSignal((n) => n + 1);
    } finally {
      setIsBulkActionBusy(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedItemIds([]);
    setSelectionClearSignal((n) => n + 1);
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

  /**
   * Inserts a freshly created (or duplicated) column into local state at its
   * backend-assigned `position`, shifting every other same-scope column
   * whose `position` moved up to make room — mirrors the shift
   * `BoardColumnController::store`/`duplicate` already apply server-side.
   * Without this, `columns` (whose array order — not `position` — drives
   * render order, see `handleReorderTableItems`'s doc comment below for the
   * same convention on `items`) would just get the new column appended, so
   * it always rendered last regardless of where the backend actually placed
   * it. When `created` has the next free position (a plain append, no
   * `after_column_id`), no sibling qualifies for the shift and this is
   * equivalent to the old `[...current, created]`.
   */
  const insertColumnAtPosition = (current: BoardColumnDto[], created: BoardColumnDto): BoardColumnDto[] => {
    const shifted = current.map((column) =>
      column.scope === created.scope && column.position >= created.position
        ? { ...column, position: column.position + 1 }
        : column
    );
    const insert_index = shifted.findIndex(
      (column) => column.scope === created.scope && column.position > created.position
    );
    return insert_index === -1
      ? [...shifted, created]
      : [...shifted.slice(0, insert_index), created, ...shifted.slice(insert_index)];
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
    setColumns((current) => insertColumnAtPosition(current, created));
    return String(created.id);
  };

  // ── Add column — the Table view's own "+" gallery (`ColumnPicker`, main or
  // subitem header) speaks the Table package's own `ColumnKind` vocabulary
  // (e.g. "longtext"), not the engine's `BoardColumnKind` ("long_text")
  // `handleAddColumn` above expects — see `TABLE_COLUMN_KIND`'s doc comment
  // for why the two differ. `TABLE_KIND_TO_ENGINE_KIND` (the reverse of
  // `TABLE_COLUMN_KIND`) bridges that, so `BoardTable`'s `onAddColumn` prop
  // can hand this straight to `handleAddColumn` without the Table package
  // ever needing to know the engine's own type vocabulary. ──
  // A preset (Priority, a Status column with priority labels) brings its own starting labels.
  const handleAddTableColumn = (_group_key: string, scope: TableColumnScope, kind: TableColumnKind, label: string, width: number) =>
    handleAddColumn({ kind: TABLE_KIND_TO_ENGINE_KIND[kind], label, default_width: width }, scope === "sub" ? "subitem" : "item", presetConfigFor(kind, label));

  // ── Column-header menu — "Duplicate column"/"Add column to the right" both
  // create a new column id, so (like `handleAddTableColumn` above) they await
  // the real API call and let the resync effect off `table_config.initial_groups`
  // bring the new column in, rather than mutating `BoardTable`'s local state. ──
  const handleDuplicateTableColumn = async (_group_key: string, _scope: TableColumnScope, column_id: string, with_values: boolean) => {
    const created = await boardContentService.duplicateColumn(board_id, Number(column_id), with_values);
    setColumns((current) => insertColumnAtPosition(current, created));
    // "Column and cell values": the API copied every cell server side, mirror that on the rows already loaded.
    if (with_values) setItems((current) => copyColumnValuesInTree(current, column_id, String(created.id)));
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
    return handleAddColumn(
      { kind: TABLE_KIND_TO_ENGINE_KIND[kind], label, default_width: width },
      scope === "sub" ? "subitem" : "item",
      presetConfigFor(kind, label),
      after ? after.position + 1 : undefined
    );
  };

  // ── Column-header menu's "Filter"/"Group by" rows — bridge into the
  // toolbar's own Filter/Group-by state, which `BoardTable` (a sibling of the
  // toolbar, not a descendant) has no access to on its own. ──
  // ── Filter panel's personal "Saved filters": private to the viewer, independent from the shared views ──
  const [saved_filters, setSavedFilters] = useState<BoardSavedFilterDto[]>([]);
  useEffect(() => {
    let is_cancelled = false;
    boardContentService
      .getSavedFilters(board_id)
      .then((data) => {
        if (!is_cancelled) setSavedFilters(data);
      })
      .catch(() => {});
    return () => {
      is_cancelled = true;
    };
  }, [board_id]);

  const saved_filter_actions: BoardSavedFilterActions = {
    saved_filters,
    saveCurrentFilter: async (name) => {
      // The search box is not part of a saved filter, it stays whatever the viewer is typing.
      const { search_query: _search_query, search_column_ids: _search_column_ids, ...filter_state } = view_tabs.current_filter_state;
      const created = await boardContentService.createSavedFilter(board_id, {
        name,
        filter_state: { ...filter_state, search_query: "", search_column_ids: [] },
      });
      setSavedFilters((current) => [...current, created]);
      toast.success(`Saved "${created.name}"`);
    },
    renameSavedFilter: async (id, name) => {
      const updated = await boardContentService.updateSavedFilter(board_id, id, { name });
      setSavedFilters((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    },
    deleteSavedFilter: async (id) => {
      await boardContentService.deleteSavedFilter(board_id, id);
      setSavedFilters((current) => current.filter((entry) => entry.id !== id));
    },
  };

  // ── "..." menu's export of exactly the rows and columns the board shows ──
  const export_options: BoardToolbarExportOptions = {
    board_name: view_tabs.active_view && !view_tabs.active_view.is_primary ? `${board_label} ${view_tabs.active_view.label}` : board_label,
    is_ready: is_all_items_loaded,
    onPrepare: loadAllRemainingGroups,
    onExportError: (message) => toast.showToast({ variant: "error", title: "Export failed", description: message }),
  };

  // ── Title pill: how many items the active filters leave, even while the chips bar is collapsed ──
  const is_board_filtered =
    toolbar.active_filter_count > 0 ||
    toolbar.selected_person_ids.length > 0 ||
    toolbar.selected_team_ids.length > 0 ||
    toolbar.search_query.trim() !== "";
  const filtered_title_badge = is_board_filtered ? (
    <button
      type="button"
      onClick={() => toolbar.openPanel("filter")}
      title="Open filters"
      className="flex h-6 flex-none items-center rounded-full bg-boardtree-accent/15 px-2.5 text-[12px] font-semibold text-boardtree-accent transition-colors hover:bg-boardtree-accent/25"
    >
      Filtered: {toolbar.visible_row_count} of {toolbar.total_row_count}
    </button>
  ) : undefined;

  // ── Toolbar panels' "Save to this view"/"Save as new view" ──
  const toolbar_view_actions: BoardToolbarViewActions = {
    has_personal_state: view_tabs.has_personal_state,
    resetToView: view_tabs.resetToView,
    can_save: node.can_edit && view_tabs.active_view !== null,
    // Changes save to the view on their own, and a locked tab keeps its saved filters,
    // so "Save to this view" never shows; "Save as new view" is still offered.
    is_dirty: false,
    active_view_label: view_tabs.active_view?.label ?? null,
    saveToActiveView: async () => {
      try {
        await view_tabs.saveActiveView();
        toast.success(`Saved to "${view_tabs.active_view?.label ?? "this view"}"`);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Couldn't save this view. Please try again."));
      }
    },
    saveAsNewView: async () => {
      try {
        const created = await view_tabs.saveAsNewView();
        if (created) toast.success(`Created "${created.label}" with the current filters`);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Couldn't create the new view. Please try again."));
      }
    },
  };

  // ── Right-click a cell > "Filter by this value" / "Exclude this value" ──
  // Adds an Advanced filters rule for the cell's own value (see
  // `buildRuleFromRowValue`) without opening the panel; the rule shows up as a
  // chip in the toolbar's summary bar, where it can be edited or removed.
  const handleFilterByCellValue = (item_id: string, column_id: string, exclude: boolean) => {
    const field = filter_fields.find((candidate) => candidate.id === (column_id === "__name" ? ITEM_COLUMN_ID : column_id));
    const row = items.find((item) => String(item.id) === item_id);
    if (!field || !row) return;
    toolbar.addAdvancedFilterRule(buildRuleFromRowValue(field, row, exclude));
  };

  const handleRequestColumnFilter = (column_id: string) => {
    toolbar.setFilterMode("advanced");
    toolbar.addAdvancedFilterRowForColumn(column_id === "__name" ? ITEM_COLUMN_ID : column_id);
    toolbar.openPanel("filter");
  };

  const handleRequestGroupByColumn = (column_id: string) => {
    toolbar.setGroupByOptionId(column_id);
  };

  // ── Grid column-header sort arrow — bridges into the toolbar's own
  // `sort_rules` (the same state the Sort panel reads/writes) instead of
  // `useBoardTable`'s local `state.sort`, so the two never disagree. The
  // item-title column's synthetic `"__name"` id (see `GroupColumnHeaderRow`)
  // maps to the toolbar's real `ITEM_COLUMN_ID`. ──
  const handleRequestColumnSort = (column_id: string, direction: "asc" | "desc" | null) => {
    toolbar.setSingleSort(direction ? (column_id === "__name" ? ITEM_COLUMN_ID : column_id) : null, direction);
  };
  const active_sort_rule = toolbar.sort_rules[0];
  const active_sort_column_id = active_sort_rule ? (active_sort_rule.sort_option_id === ITEM_COLUMN_ID ? "__name" : active_sort_rule.sort_option_id) : null;
  const active_sort_direction = active_sort_rule?.sort_option_id ? active_sort_rule.direction : null;

  // ── Remove a property from the Kanban drawer's generic "Properties"
  // section — deletes the backing column outright (and its values on every
  // item). ──
  const handleRemoveKanbanProperty = async (column_id: string) => {
    await boardContentService.deleteColumn(board_id, Number(column_id));
    setColumns((current) => current.filter((c) => String(c.id) !== column_id));
  };

  // ── Applies rows the server just saved: their values and dependency links.
  // Used for the items a date change moved through the Dependency column, see
  // the API's BoardDependencyScheduler. Rows not loaded here are skipped. ──
  const applyServerItems = useCallback((saved_items: BoardItemDto[]) => {
    if (saved_items.length === 0) return;
    setItems((current) =>
      saved_items.reduce(
        (acc, saved) => mapItemInTree(acc, saved.id, (item) => ({ ...item, values: saved.values, dependency_links: saved.dependency_links ?? item.dependency_links })),
        current
      )
    );
  }, []);

  // ── Inline cell edit: optimistically writes the new value, then persists it,
  // reverting the whole item list if the request fails. Items whose dates
  // moved because they depend on this one come back with the response. ──
  const handleUpdateCellValue = async (item_id: number, column_id: string, value: BoardItemValue) => {
    const previous = items;
    setItems((current) =>
      mapItemInTree(current, item_id, (item) => ({ ...item, values: { ...item.values, [column_id]: value } }))
    );
    try {
      const { item, moved_items } = await boardContentService.updateItemValuesWithMoves(board_id, item_id, { [column_id]: value });
      // Only the links of the edited row: its values stay as typed, a later keystroke may already be in flight.
      setItems((current) => mapItemInTree(current, item_id, (row) => ({ ...row, dependency_links: item.dependency_links ?? row.dependency_links })));
      applyServerItems(moved_items);
    } catch {
      setItems(previous);
    }
  };

  // ── Dependency cell's popover: saves the cell's links (predecessors, and
  // each one's type and lag). The server moves this item's date and every
  // item after it, and sends all of them back. ──
  const handleSetDependencyLinks = async (item_id: number, column_id: string, links: DependencyLinkInput[]) => {
    const previous = items;
    const ids = links.map((link) => link.predecessor_id);
    setItems((current) => mapItemInTree(current, item_id, (item) => ({ ...item, values: { ...item.values, [column_id]: ids.length ? ids : null } })));
    try {
      const { item, moved_items } = await boardContentService.updateItemDependencies(
        board_id,
        item_id,
        Number(column_id),
        links.map((link) => ({ predecessor_id: Number(link.predecessor_id), type: link.type, lag_days: link.lag_days }))
      );
      applyServerItems([item, ...moved_items]);
    } catch (error) {
      setItems(previous);
      toast.error(getApiErrorMessage(error, "Couldn't save the dependency. Please try again."));
    }
  };

  // ── Add option to a status/dropdown column, inline from its cell picker —
  // persists the option to the column's config and resolves to it (with its
  // generated id) so the cell can select it right away. ──
  const handleAddColumnOption = async (
    column_id: string,
    option: { label: string; color: string }
  ): Promise<BoardCellOption | null> => {
    const new_option: BoardCellOption = { id: `opt_${Date.now()}`, label: option.label, color: option.color };
    const updated = await patchColumnOptions(column_id, (options) => [...options, new_option]);
    return updated ? new_option : null;
  };

  // ── Edit Labels (rename/recolor/delete/deactivate/describe). Every action
  // is a read-modify-write over the column's `config.options` array, so they
  // all funnel through this one persistence helper.
  //
  // Writes to the same column run one at a time, and each reads the options
  // left by the previous write (`latest_columns_ref`), not this render's
  // `columns_by_id`. Otherwise a rename committed on blur followed right away
  // by a recolor/delete click on another label would send two PATCHes built
  // from the same stale array, and whichever landed last would undo the other. ──
  const latest_columns_ref = useRef(columns);
  latest_columns_ref.current = columns;
  const column_options_queue_ref = useRef(new Map<string, Promise<unknown>>());

  const patchColumnOptions = useCallback(
    (column_id: string, updater: (options: BoardCellOption[]) => BoardCellOption[]) => {
      const previous_write = column_options_queue_ref.current.get(column_id) ?? Promise.resolve();
      const write = previous_write.then(async () => {
        const column = latest_columns_ref.current.find((c) => String(c.id) === column_id);
        if (!column) return null;
        const next_config = { ...(column.config ?? {}), options: updater(column.config?.options ?? []) };
        const replaceColumn = (next_column: typeof column) => {
          latest_columns_ref.current = latest_columns_ref.current.map((c) => (c.id === next_column.id ? next_column : c));
          setColumns((current) => current.map((c) => (c.id === next_column.id ? next_column : c)));
        };
        // Optimistic, so a grid re-sync before the API answers keeps the new labels.
        replaceColumn({ ...column, config: next_config });
        try {
          const updated = await boardContentService.updateColumn(board_id, Number(column_id), { config: next_config });
          replaceColumn(updated);
          return updated;
        } catch (error) {
          replaceColumn(column);
          toast.error(getApiErrorMessage(error, "Couldn't save the labels. Please try again."));
          return null;
        }
      });
      column_options_queue_ref.current.set(column_id, write);
      return write;
    },
    [board_id]
  );

  // ── People cell picker's bottom toggle — flips whether assigning someone
  // on this column notifies them, persisted to the column's own
  // `config.notify_on_assignment` the same read-modify-write way as
  // `patchColumnOptions` above. ──
  const handleToggleColumnNotifyOnAssignment = useCallback(
    async (column_id: string) => {
      const column = columns_by_id[column_id];
      if (!column) return;
      const next_value = !(column.config?.notify_on_assignment ?? true);
      const updated = await boardContentService.updateColumn(board_id, Number(column_id), {
        config: { ...(column.config ?? {}), notify_on_assignment: next_value },
      });
      setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    },
    [board_id, columns_by_id]
  );

  // ── Formula/Connect-board/Mirror settings modals' "Save" — same
  // read-modify-write shape as `handleToggleColumnNotifyOnAssignment`. ──
  const handleUpdateColumnFormula = useCallback(
    async (column_id: string, formula: { expression: string }) => {
      const column = columns_by_id[column_id];
      if (!column) return;
      // The legacy operation/source columns pair is dropped: the expression replaces it.
      const { operation: _operation, source_column_ids: _source_column_ids, ...rest_config } = column.config ?? {};
      const updated = await boardContentService.updateColumn(board_id, Number(column_id), {
        config: { ...rest_config, expression: formula.expression },
      });
      setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    },
    [board_id, columns_by_id]
  );

  // The Connect boards "Boards settings" dialog. Rejects so the dialog can show the API's message
  // (a two-way connection needs permission to add a column on the other board).
  const handleUpdateConnectSettings = useCallback(
    async (column_id: string, settings: ConnectSettings) => {
      const updated = await boardContentService.updateConnectSettings(board_id, Number(column_id), {
        linked_board_ids: settings.linked_board_ids.map(Number),
        allow_multiple_items: settings.allow_multiple_items,
        two_way: settings.two_way,
      });
      setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c)));
      // Connecting the board to itself both ways adds the other side's column right here.
      if (settings.two_way && settings.linked_board_ids[0] === String(board_id)) {
        boardContentService.getColumns(board_id, view_tabs.active_view_id).then(setColumns).catch(() => {});
      }
    },
    [board_id, view_tabs.active_view_id]
  );

  const handleUpdateColumnMirror = useCallback(
    async (column_id: string, mirror: { source_column_id: string; mirrored_column_id: string }) => {
      const column = columns_by_id[column_id];
      if (!column) return;
      const updated = await boardContentService.updateColumn(board_id, Number(column_id), {
        config: { ...(column.config ?? {}), source_column_id: Number(mirror.source_column_id), mirrored_column_id: Number(mirror.mirrored_column_id) },
      });
      setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    },
    [board_id, columns_by_id]
  );

  // ── Tags column's option list: the board's own tags plus the account's
  // public tags (see `TagCatalog` server-side). Unlike Status/Dropdown/Label's
  // per-column `patchColumnOptions`, these act on the board, not on a column.
  // Update responses carry no `usage_count`, so the known count is kept. ──
  const mergeTag = useCallback(
    (updated: BoardTagDto) => setTags((current) => current.map((t) => (t.id === updated.id ? { ...updated, usage_count: t.usage_count } : t))),
    []
  );

  const handleCreateTagDef = useCallback(
    async (label: string) => {
      // On a main board the API hands back an existing public tag with the same label instead of a duplicate.
      const created = await boardContentService.createTag(board_id, { label, color: COLUMN_OPTION_PALETTE[tags.length % COLUMN_OPTION_PALETTE.length] });
      setTags((current) => (current.some((t) => t.id === created.id) ? current : current.concat({ ...created, usage_count: created.usage_count ?? 0 })));
      return { id: String(created.id), label: created.label, color: created.color };
    },
    [board_id, tags.length]
  );

  const handleRecolorTagDef = useCallback(
    (tag_id: string, color: string) => {
      void boardContentService.updateTag(board_id, Number(tag_id), { color }).then(mergeTag);
    },
    [board_id, mergeTag]
  );

  const handleRenameTagDef = useCallback(
    (tag_id: string, label: string) => {
      void boardContentService
        .updateTag(board_id, Number(tag_id), { label })
        .then(mergeTag)
        // A label already taken on the tag's board is rejected, so the list goes back to the saved name.
        .catch(() => setTags((current) => current.slice()));
    },
    [board_id, mergeTag]
  );

  const handleDeleteTagDef = useCallback(
    (tag_id: string) => {
      void boardContentService.deleteTag(board_id, Number(tag_id)).then(() => setTags((current) => current.filter((t) => t.id !== Number(tag_id))));
    },
    [board_id]
  );

  // ── Connect boards column: its connected boards for the cells and the "Choose items"
  // picker (fetched once per column, see `UseBoardTableConfig.onFetchConnectOptions`), and the
  // picker's "+ Add item", which creates the item on the connected board. ──
  const handleFetchConnectOptions = useCallback(
    async (column_id: string): Promise<ConnectColumnOptions> => {
      const response = await boardContentService.getConnectItems(board_id, Number(column_id));
      return {
        hidden_board_count: response.hidden_board_count,
        boards: response.boards.map((board) => ({
          id: String(board.id),
          name: board.name,
          can_add_items: board.can_add_items,
          groups: board.groups.map((group) => ({ id: String(group.id), name: group.name, color: group.color })),
          columns: board.columns.filter((column) => column.is_searchable).map((column) => ({ id: String(column.id), label: column.label, type: column.type })),
          items: board.items.map((item) => ({
            id: String(item.id),
            board_id: String(board.id),
            name: item.name,
            group_id: item.group_id != null ? String(item.group_id) : null,
            color: item.color,
            href: connectItemHref(board.id, item.id, item.view_id),
            view_id: item.view_id != null ? String(item.view_id) : null,
            created_at: item.created_at,
            texts: item.texts,
            values: item.values ?? {},
          })),
          mirrored_columns: (board.mirrored_columns ?? []).map((mirrored) => ({
            id: String(mirrored.id),
            label: mirrored.label,
            type: mirrored.type,
            options: mirrored.options.map((option) => ({ id: option.id, label: option.label, color: option.color, is_active: option.is_active, description: option.description })),
          })),
        })),
      };
    },
    [board_id]
  );

  const handleFetchConnectedBoards = useCallback(
    async (column_id: string): Promise<ConnectedBoardSummary[]> => {
      const response = await boardContentService.getConnectSettings(board_id, Number(column_id));
      return response.boards.map((board) => ({ ...board, id: String(board.id) }));
    },
    [board_id]
  );

  // This board's rows, for naming the items a Dependency field links when the card shows one of them.
  const card_items_ref = useRef(items);
  card_items_ref.current = items;

  // The linked item card: the connected item, its board's item columns (in the tab holding it)
  // and, for its own Connect boards fields, the names of the items they link. An item of this
  // board (opened from the Dependency picker) also lists its Dependency fields.
  const handleFetchLinkedItem = useCallback(async (ref: LinkedItemRef): Promise<LinkedItemDetail> => {
    const linked_board_id = Number(ref.board_id);
    const is_own_board = linked_board_id === board_id;
    const view_id = ref.view_id ? Number(ref.view_id) : null;
    const [item, linked_columns] = await Promise.all([
      boardContentService.getItem(linked_board_id, Number(ref.item_id)),
      boardContentService.getColumns(linked_board_id, view_id),
    ]);
    const card_columns = linked_columns
      .filter((column) => column.scope === "item" && (!LINKED_ITEM_CARD_EXCLUDED_TYPES.has(column.type) || (is_own_board && column.type === "dependency")))
      .sort((a, b) => a.position - b.position);

    const connect_names = new Map<number, { name: string; color: string | null }[]>();
    await Promise.all(
      card_columns
        .filter((column) => column.type === "connect_board" && Array.isArray(item.values[String(column.id)]))
        .map(async (column) => {
          const linked_ids = (item.values[String(column.id)] as unknown[]).map(String);
          const options = await boardContentService.getConnectItems(linked_board_id, column.id).catch(() => null);
          const by_id = new Map((options?.boards ?? []).flatMap((board) => board.items).map((linked) => [String(linked.id), linked]));
          connect_names.set(column.id, linked_ids.flatMap((id) => (by_id.has(id) ? [{ name: by_id.get(id)!.name, color: by_id.get(id)!.color }] : [])));
        })
    );

    const dependencyNames = (value: unknown): { name: string; color: string | null }[] =>
      (Array.isArray(value) ? value : []).flatMap((id) => {
        const linked = findItemInTree(card_items_ref.current, Number(id));
        return linked ? [{ name: linked.name, color: null }] : [];
      });

    const fields: LinkedItemField[] = card_columns.map((column) => ({
      id: String(column.id),
      label: column.label,
      type: column.type,
      description:
        column.config?.description?.trim() ||
        (column.type === "dependency" ? DEPENDENCY_MODE_OPTIONS.find((option) => option.mode === (column.config?.dependency_mode ?? "none"))?.hint ?? null : null),
      options: (column.config?.options ?? []).map((option) => ({ id: option.id, label: option.label, color: option.color, is_active: option.is_active })),
      value: (item.values[String(column.id)] ?? null) as LinkedItemField["value"],
      linked_items:
        column.type === "dependency"
          ? dependencyNames(item.values[String(column.id)])
          : connect_names.get(column.id),
      rating_max: column.config?.rating_max,
      rating_icon: column.config?.rating_icon,
    }));

    return {
      board_id: ref.board_id,
      board_name: ref.board_name,
      board_href: buildBoardPath(linked_board_id),
      item_id: ref.item_id,
      name: item.name,
      href: connectItemHref(linked_board_id, item.id, view_id),
      group: { name: item.group.name, color: item.group.accent_color },
      fields,
    };
  }, [board_id]);

  const handleCreateConnectItem = useCallback(async (linked_board_id: string, group_id: string, name: string): Promise<ConnectItemOption> => {
    const created = await boardContentService.createItem(Number(linked_board_id), { name, group_id: Number(group_id) });
    return {
      id: String(created.id),
      board_id: linked_board_id,
      name: created.name,
      group_id,
      color: null,
      href: connectItemHref(created.board_id, created.id, null),
      view_id: null,
      created_at: created.created_at ?? new Date().toISOString(),
      texts: {},
      values: {},
    };
  }, []);

  // A Button cell's press runs the automations watching it on the server, then the item (and its
  // parent, which "set the parent's column" writes) is read again so their cells show the result.
  const handlePressButton = useCallback(
    async (node_id: string, column_id: string): Promise<ButtonPressOutcome> => {
      try {
        const result = await boardAutomationService.pressButton(board_id, Number(node_id), Number(column_id));
        const pressed = await boardContentService.getItem(board_id, Number(node_id));
        const parent = pressed.parent_id ? await boardContentService.getItem(board_id, pressed.parent_id) : null;
        setItems((current) => {
          let next = mapItemInTree(current, pressed.id, (item) => ({ ...item, name: pressed.name, values: pressed.values }));
          if (parent) next = mapItemInTree(next, parent.id, (item) => ({ ...item, name: parent.name, values: parent.values }));
          return next;
        });
        if (result.is_board_paused) return { message: "Automations on this board are paused.", needs_set_up: false };
        return { message: result.message, needs_set_up: result.automations_run === 0 };
      } catch (failure) {
        return { message: apiErrorMessage(failure, "The button could not run its automations."), needs_set_up: false };
      }
    },
    [board_id]
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
    onReorder: (ordered_ids) => void patchColumnOptions(column_id, (options) => reorderByIds(options, ordered_ids)),
  });

  // ── Item detail drawer ──
  const current_user: BoardPersonOption = user
    ? {
        id: String(user.id),
        name: user.full_name,
        initials: getInitials(user.full_name),
        avatar_seed: 0,
        avatar_url: user.profile_photo_url ?? undefined,
      }
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

  const ACTIVITY_ACCENT_COLOR_BY_ACTION: Record<string, string> = {
    item_restored: "#00c875",
    item_deleted: "#e2445c",
    automation_ran: "#579bfc",
  };

  const getActivityLog = useCallback(
    (row: BoardItemDto): DrawerActivityEntry[] =>
      activity_log_entries
        .filter((entry) => entry.meta?.item_id === row.id)
        .map((entry) => ({
          id: String(entry.id),
          actor: entry.user
            ? { id: String(entry.user.id), name: entry.user.full_name, initials: getInitials(entry.user.full_name), avatar_seed: entry.user.id, avatar_url: entry.user.profile_photo_url ?? undefined, is_deactivated: entry.user.is_deactivated }
            : { id: "0", name: "Someone", initials: "?", avatar_seed: 0 },
          verb: entry.description,
          occurred_at: formatDate(entry.created_at),
          occurred_at_iso: entry.created_at,
          accent_color: ACTIVITY_ACCENT_COLOR_BY_ACTION[entry.action] ?? "#676879",
        })),
    [activity_log_entries]
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

  // ── Item drawer's "…" menu actions, each one mirrors the selection action
  // bar's equivalent bulk handler (see `handleBulkMove`/`handleBulkArchive`/
  // `handleBulkDelete`) but for the single open item, and rejects on failure so
  // the drawer can report it. Closing the drawer afterwards is up to the
  // drawer itself (it needs the router-aware `handleDrawerClose`). ──
  const handleDrawerMoveItemToGroup = async (item_id: string, group_id: string) => {
    const [moved] = await boardContentService.moveItems(board_id, [Number(item_id)], Number(group_id));
    // A subitem's `group_id` is denormalized from its parent, so the whole
    // subtree takes the new group, mirroring the backend's own cascade. The
    // table renders a group's rows in `items` array order, so a root item that
    // lands at the end of its new table is also moved to the end of the array.
    setItems((current) => {
      const target = findItemInTree(current, Number(item_id));
      if (!target) return current;
      const relocated = { ...withGroupInTree(target, moved.group_id), position: moved.position };
      return target.parent_id === null
        ? [...removeItemFromTree(current, target.id), relocated]
        : mapItemInTree(current, target.id, () => relocated);
    });
  };

  const handleDrawerMoveItemToBoard = async (item_id: string, target_board_id: number, target_group_id: number) => {
    await boardContentService.moveItemToBoard(board_id, Number(item_id), { target_board_id, target_group_id });
    setItems((current) => removeItemFromTree(current, Number(item_id)));
  };

  const handleDrawerArchiveItem = async (item_id: string) => {
    await boardContentService.archiveItems(board_id, [Number(item_id)]);
    setItems((current) => removeItemFromTree(current, Number(item_id)));
  };

  const handleDrawerDeleteItem = async (item_id: string) => {
    await boardContentService.deleteItem(board_id, Number(item_id));
    setItems((current) => removeItemFromTree(current, Number(item_id)));
  };

  // The drawer's Automations tab reads the latest automations through this ref, since they (and the
  // builder context) are set up further down than the drawer config.
  const item_automations_render_ref = useRef<(row_id: string) => React.ReactNode>(() => null);
  // Same for the Dependencies tab, which edits links through handlers declared further down.
  const item_dependencies_render_ref = useRef<(row_id: string) => React.ReactNode>(() => null);

  const drawer_config: BoardItemDrawerConfig<BoardItemDto> = useMemo(
    () => ({
      getRowId: (row) => String(row.id),
      getRowTitle: (row) => row.name,
      eyebrow_label: `${node.label} · Item`,
      current_user,
      mentionable_people: persons,
      getInitialComments: () => [],
      board_id,
      reference_items: listReferenceItems(items),
      getInfoBoxes,
      getActivityLog,
      getDescription: (row) => row.description ?? "",
      onDescriptionChange: handleUpdateItemDescription,
      resolveRow: (row) => findItemInTree(items, row.id) ?? row,
      getRowGroupId: (row) => String(row.group_id),
      isTopLevelRow: (row) => row.parent_id === null,
      move_group_options: selection_move_targets,
      onMoveItemToGroup: handleDrawerMoveItemToGroup,
      onMoveItemToBoard: handleDrawerMoveItemToBoard,
      onArchiveItem: handleDrawerArchiveItem,
      onDeleteItem: handleDrawerDeleteItem,
      can_edit: node.can_edit,
      renderDependenciesTab: (row_id) => item_dependencies_render_ref.current(row_id),
      renderAutomationsTab: (row_id) => item_automations_render_ref.current(row_id),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.label, node.can_edit, current_user.id, persons, board_id, getInfoBoxes, getActivityLog, items, selection_move_targets]
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
    can_edit: node.can_edit,
  });

  // `/boards/{id}?update={comment_id}` (a copied link to a board update) opens the discussion drawer, which then scrolls to that update.
  const discussion_update_param = search_params.get("update");
  const opened_discussion_param_ref = useRef<string | null>(null);
  useEffect(() => {
    if (!discussion_update_param || opened_discussion_param_ref.current === discussion_update_param) return;
    opened_discussion_param_ref.current = discussion_update_param;
    discussion_drawer.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discussion_update_param]);

  // Browser tab title: the open item wins, then the board updates panel, then the active view.
  // "Launch plan | Client Hub | Workspace 97th", "Client Hub | Main table | Workspace 97th".
  useDocumentTitle(
    drawer.is_open
      ? buildPageTitle(drawer.open_row_title, node.label)
      : discussion_drawer.is_open
        ? buildPageTitle("Board updates", node.label)
        : buildPageTitle(node.label, view_tabs.active_view?.label)
  );

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
  // `board_priority_column`/`board_done_column`/`board_date_column` are
  // declared earlier in this component (right after `columns_by_id`), see the
  // comment there.
  // A freshly-loaded board (no active view yet) opens on the Table ("Main
  // table") view, mirroring monday.com's own default.
  const active_view_type: BoardViewKind = view_tabs.active_view?.view_type ?? "table";
  const active_doc_view = view_tabs.active_view;
  // monday's "Collapse header" on a Doc tab, per visit.
  const [is_doc_header_collapsed, setIsDocHeaderCollapsed] = useState(false);
  const filtered_rows = useMemo(() => toolbar.groups.flatMap((g) => g.rows), [toolbar.groups]);


  // Active people first, so their avatar colors do not shift when someone is deactivated.
  const table_people: TablePersonDef[] = useMemo(
    () =>
      [...roster_members.filter((member) => !member.is_deactivated), ...roster_members.filter((member) => member.is_deactivated)].map(
        (member, index) => ({
          id: String(member.id),
          name: member.full_name,
          initials: getInitials(member.full_name),
          color: AVATAR_COLORS[index % AVATAR_COLORS.length],
          avatar_url: member.profile_photo_url,
          job_title: member.job_title,
          is_deactivated: member.is_deactivated,
        })
      ),
    [roster_members]
  );
  // Bulk edit and automations only ever assign people, so they never see the deactivated ones.
  const assignable_table_people = useMemo(() => table_people.filter((person) => !person.is_deactivated), [table_people]);

  // Automations read every column of the tab, hidden ones and subitem ones included, since hiding a
  // column never turns off the automations that use it. Tags columns take the board wide tag list.
  const automation_columns = useMemo<AutomationColumn[]>(() => {
    const tag_options = tags.map((tag) => ({ id: String(tag.id), label: tag.label, color: tag.color }));
    return columns.flatMap((column): AutomationColumn[] => {
      const def = toTableColumnDef(column);
      if (!def) return [];
      return [{ ...def, options: column.type === "tags" ? tag_options : def.options, scope: column.scope === "subitem" ? "subitem" : "item" }];
    });
  }, [columns, tags]);

  item_automations_render_ref.current = (row_id: string) =>
    active_view_type === "table" ? (
      <ItemAutomationsPanel
        key={row_id}
        board_id={board_id}
        item_id={Number(row_id)}
        automations={automations}
        context={automation_context}
        can_edit={node.can_edit}
        onOpenAutomation={(automation_id) => openAutomationCenter(automation_id)}
      />
    ) : (
      <div className="px-6 py-5 text-[13px] text-shell-text-muted">Automations belong to the table views of this board. Open the item from a table to see them.</div>
    );

  // The board's form views, for the "form is submitted" trigger, and the loaded items of this
  // table a test run can use.
  const automation_forms = useMemo(
    () => view_tabs.views.filter((view) => view.view_type === "form").map((view) => ({ id: String(view.id), label: view.label })),
    [view_tabs.views]
  );
  const automation_test_items = useMemo(
    () => listReferenceItems(items).slice(0, 500).map((item) => ({ id: item.id, label: item.name })),
    [items]
  );
  const reloadAutomations = async () => {
    const data = await boardAutomationService.getAutomations(board_id, view_tabs.active_view_id);
    setAutomations(data);
  };

  // "Automate" in a column header: how many automations already use each column, and a builder
  // prefilled with a trigger for the column.
  const column_automation = useMemo(
    () => ({ counts: countAutomationsByColumn(automations), onOpen: (column_id: string) => openAutomationCenter(undefined, column_id) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [automations]
  );

  const automation_context = useMemo(
    () => ({
      board_id,
      columns: automation_columns,
      groups: selection_move_targets,
      people: assignable_table_people,
      board_targets: [],
      slack_channels: [],
      is_slack_connected: false,
    }),
    [board_id, automation_columns, selection_move_targets, assignable_table_people]
  );

  // Hide/Pin columns come from the board toolbar (`toolbar.hidden_column_ids`/
  // `pinned_column_ids`) — hidden columns are dropped and pinned ones moved
  // to the front (right after the Item column), matching monday.com's own
  // "freeze to the left" behavior. Every row/header component downstream
  // (`ItemRow`, `GroupColumnHeaderRow`, `layoutUtils.mainGridTemplate`, ...)
  // renders columns by iterating this array in order with no pin-specific
  // logic of its own, so reordering here is all pinning needs.
  // Button columns some automation watches, null until this tab's automations are loaded.
  const set_up_button_key = useMemo(() => {
    if (automations_view_id !== view_tabs.active_view_id) return null;
    return automations
      .filter((automation) => automation.trigger_type === "button_clicked" && automation.trigger_column_id != null)
      .map((automation) => String(automation.trigger_column_id))
      .sort()
      .join(",");
  }, [automations, automations_view_id, view_tabs.active_view_id]);

  const { table_base_columns, table_pinned_count } = useMemo(() => {
    const set_up_button_ids = set_up_button_key === null ? null : new Set(set_up_button_key.split(","));
    const all = attachButtonSetUp(
      attachDependencyDateColumns(attachFormulaSources(item_columns.map(toTableColumnDef).filter((c): c is TableColumnDef => c !== null), item_column_label)),
      set_up_button_ids
    );
    const visible = all.filter((c) => !toolbar.hidden_column_ids.includes(c.id));
    const pinned = visible.filter((c) => toolbar.pinned_column_ids.includes(c.id));
    const rest = visible.filter((c) => !toolbar.pinned_column_ids.includes(c.id));
    // `pinned.length` (not `toolbar.pinned_column_ids.length`) is the real
    // freeze count: a pinned column that's also hidden (or no longer exists)
    // is already dropped from `visible` above, so counting the raw id list
    // instead would freeze one extra, unrelated column past the real pinned
    // set — the first column of `rest` — since every row/header downstream
    // just slices the leading `pinned_column_count` columns off this array.
    return { table_base_columns: [...pinned, ...rest], table_pinned_count: pinned.length };
  }, [item_columns, item_column_label, toolbar.hidden_column_ids, toolbar.pinned_column_ids, set_up_button_key]);
  const table_sub_base_columns = useMemo(
    () =>
      attachButtonSetUp(
        attachDependencyDateColumns(attachFormulaSources(subitem_columns.map(toTableColumnDef).filter((c): c is TableColumnDef => c !== null), "Subitem")),
        set_up_button_key === null ? null : new Set(set_up_button_key.split(","))
      ),
    [subitem_columns, set_up_button_key]
  );

  const adaptTableNode = (item: BoardItemDto): BoardTableNode => ({
    id: String(item.id),
    name: item.name,
    values: item.values,
    dependency_links: item.dependency_links,
    comment_count: item.comment_count,
    is_priority: item.is_priority,
    recurrence: item.recurrence,
    created_by_id: item.created_by_id != null ? String(item.created_by_id) : null,
    created_at: item.created_at ?? null,
    last_updated_by_id: item.last_updated_by_id != null ? String(item.last_updated_by_id) : null,
    last_updated_at: item.last_updated_at ?? null,
  });
  // While subitem filters apply, only the subitems that match stay under their parent.
  const adaptTableItem = (item: BoardItemDto): BoardTableItem => {
    const visible_sub_ids = toolbar.visible_subitem_ids?.[String(item.id)];
    const subs = visible_sub_ids ? item.children.filter((child) => visible_sub_ids.includes(String(child.id))) : item.children;
    return { ...adaptTableNode(item), subs: subs.map(adaptTableNode) };
  };

  // Looked up (rather than threaded through `toolbar.groups`'s generic,
  // Kanban/Calendar-shared `BoardGroup<TRow>` type) so `is_items_loaded`/
  // `item_count` stay a Table-view-only concern — see `groups_by_id` below.
  const groups_by_id = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const table_groups: BoardTableGroup[] = useMemo(
    () =>
      toolbar.groups.map((g) => {
        const group_id = Number(g.id);
        // `is_all_items_loaded` covers both the eager (non-`"table"` view,
        // or a filter/sort/group-by fallback) case and a "group by column"
        // bucket, whose synthetic `g.id` isn't a real group id at all — at
        // that point every table's rows are already loaded anyway (see
        // `loadAllRemainingGroups`'s effect), so this is always `true` by
        // the time it would matter. An active search also counts as loaded
        // for every group (not just matched ones): a group with zero matches
        // should render as empty, not sit behind a perpetual skeleton
        // waiting for a real lazy-load that a search never triggers.
        const is_items_loaded =
          is_all_items_loaded || loaded_group_ids.has(group_id) || toolbar.search_query.trim() !== "" || is_server_filter_loaded;
        return {
          key: g.id,
          title: g.name,
          color: g.accent_color,
          tint: g.accent_color,
          is_priority: !!g.is_priority,
          item_title: item_column_label,
          sub_title: "Subitem",
          base_columns: table_base_columns,
          sub_base_columns: table_sub_base_columns,
          custom_columns: [],
          sub_custom_columns: [],
          items: g.rows.map(adaptTableItem),
          is_items_loaded,
          item_count: groups_by_id.get(group_id)?.item_count ?? g.rows.length,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toolbar.groups, toolbar.visible_subitem_ids, table_base_columns, table_sub_base_columns, item_column_label, is_all_items_loaded, loaded_group_ids, toolbar.search_query, is_server_filter_loaded, groups_by_id]
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
   * Column-header drag-and-drop reordering — persists the Table view's own
   * column drag-and-drop (`useBoardTable`'s `onColumnDragEnd`) to
   * `board_columns.position` via the reorder endpoint. Mirrors
   * `handleReorderTableItems`'s own optimistic-reorder-then-rollback shape:
   * `columns` is physically reordered (not just its `position` fields
   * patched) so the new order survives an unrelated re-render, since
   * `table_base_columns`/`table_sub_base_columns` render columns in
   * `columns`' own array order, not sorted by `position`.
   */
  const handleReorderTableColumns = (payload: TableReorderColumnsPayload) => {
    const previous_columns = columns;
    const engine_scope: BoardColumnScope = payload.scope === "sub" ? "subitem" : "item";
    const ordered_ids = payload.ordered_ids.map(Number);

    setColumns((current) => {
      const by_id = new Map(current.map((column) => [column.id, column]));
      const reordered = ordered_ids.map((id) => by_id.get(id)).filter((column): column is BoardColumnDto => Boolean(column));
      let cursor = 0;
      return current.map((column) =>
        column.scope === engine_scope && ordered_ids.includes(column.id) ? { ...reordered[cursor++], position: cursor - 1 } : column
      );
    });

    void boardContentService
      .reorderColumns(board_id, { scope: engine_scope, view_id: view_tabs.active_view_id ?? undefined, ordered_ids })
      .catch(() => setColumns(previous_columns));
  };

  /**
   * A row menu edit the table already applied locally (priority, recurrence)
   * that the server then refused: tells the viewer and hands the table a fresh
   * copy of `items`, which re-syncs its local state back to what was saved.
   */
  const handleRowMenuSaveError = (error: unknown, fallback: string) => {
    toast.error(getApiErrorMessage(error, fallback));
    setItems((current) => [...current]);
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
  /** Translates the toolbar's active search match (real column ids, `"name"` for the item title) into the grid's own virtual-column convention (`"__name"`) — see `table_config`'s `active_search_match` field below. */
  const active_search_match_grid = useMemo(() => {
    const match = toolbar.search_matches[toolbar.active_match_index];
    if (!match) return null;
    return { node_id: match.row_id, column_id: match.column_id === ITEM_COLUMN_ID ? "__name" : match.column_id };
  }, [toolbar.search_matches, toolbar.active_match_index]);

  // ── Group menu. Every action changes `groups` first (which flows back into the
  // table as `initial_groups`) and then persists, so the table never shows a state
  // the server has not agreed to: a failure puts the change back and raises a toast.
  // A group key that is not a real group id (a "group by column" bucket) is ignored. ──

  /** Puts a group back after a failed archive, at the slot its `position` says. */
  const reinsertTableGroup = (removed: BoardGroupDto) => {
    setGroups((current) =>
      current.some((group) => group.id === removed.id) ? current : [...current, removed].sort((a, b) => a.position - b.position)
    );
  };

  /** Rename, "Change group color" and "Mark as priority client": one optimistic PATCH of the changed field, rolled back field by field on failure. */
  const patchTableGroup = (group_key: string, patch: Pick<UpdateBoardGroupPayload, "name" | "accent_color" | "is_priority">, fallback_message: string) => {
    const group_id = Number(group_key);
    const original = groups.find((group) => group.id === group_id);
    if (!original) return;

    const previous: Partial<BoardGroupDto> = {};
    (Object.keys(patch) as (keyof typeof patch)[]).forEach((field) => Object.assign(previous, { [field]: original[field] }));

    setGroups((current) => current.map((group) => (group.id === group_id ? { ...group, ...patch } : group)));
    void boardContentService.updateGroup(board_id, group_id, patch).catch((error) => {
      setGroups((current) => current.map((group) => (group.id === group_id ? { ...group, ...previous } : group)));
      toast.error(getApiErrorMessage(error, fallback_message));
    });
  };

  /**
   * "Move group". `ordered_group_keys` is the table order after the move; the
   * server wants the moved group's slot among the tab's groups, which is one
   * past the group now sitting right above it (or 0 when it landed on top).
   * The server answers with every resequenced position, which are applied so
   * the local order and the saved one cannot drift apart.
   */
  const handleMoveTableGroup = (group_key: string, ordered_group_keys: string[]) => {
    const group_id = Number(group_key);
    const moved = groups.find((group) => group.id === group_id);
    if (!moved) return;

    const previous_groups = groups;
    const remaining = groups.filter((group) => group.id !== group_id);
    const above_key = ordered_group_keys[ordered_group_keys.indexOf(group_key) - 1];
    const position = above_key === undefined ? 0 : remaining.findIndex((group) => String(group.id) === above_key) + 1;

    setGroups([...remaining.slice(0, position), moved, ...remaining.slice(position)].map((group, index) => ({ ...group, position: index })));
    void boardContentService
      .moveGroup(board_id, group_id, position)
      .then(({ groups: saved }) => {
        const saved_positions = new Map(saved.map((group) => [group.id, group.position]));
        setGroups((current) =>
          current.map((group) => ({ ...group, position: saved_positions.get(group.id) ?? group.position })).sort((a, b) => a.position - b.position)
        );
      })
      .catch((error) => {
        setGroups(previous_groups);
        toast.error(getApiErrorMessage(error, "Couldn't move the group. Please try again."));
      });
  };

  /** "Archive group": hides the table right away, restorable from the board's archive panel. */
  const handleArchiveTableGroup = (group_key: string) => {
    const group_id = Number(group_key);
    const archived = groups.find((group) => group.id === group_id);
    if (!archived) return;

    setGroups((current) => current.filter((group) => group.id !== group_id));
    void boardContentService
      .archiveGroup(board_id, group_id)
      .then(() => toast.success(`"${archived.name}" archived. Restore it from the board's archive.`))
      .catch((error) => {
        reinsertTableGroup(archived);
        toast.error(getApiErrorMessage(error, "Couldn't archive the group. Please try again."));
      });
  };

  /** "Delete group" is confirmed first (see `ConfirmActionModal` below), the group is only removed once the server has deleted it. */
  const handleConfirmDeleteTableGroup = async () => {
    if (!group_pending_delete) return;
    await boardContentService.deleteGroup(board_id, group_pending_delete.id);
    const deleted_id = group_pending_delete.id;
    setGroups((current) => current.filter((group) => group.id !== deleted_id));
  };

  // ── Board and column permissions (see `BoardEditGate` and
  // `ColumnPermissionService` server-side). The server enforces both, these
  // callbacks only keep the grid from offering edits that would be refused.
  // They read through refs so the table's action guards stay stable while
  // rows and columns change underneath them.
  const permission_items_ref = useRef(items);
  permission_items_ref.current = items;
  const permission_columns_ref = useRef(columns_by_id);
  permission_columns_ref.current = columns_by_id;
  const is_assigned_only = node.permission_level === "assigned";

  const canEditTableNode = useCallback(
    (node_id: string) => {
      const current_user_id = user ? Number(user.id) : null;
      if (current_user_id === null) return false;

      const isAssigned = (item: BoardItemDto | undefined) =>
        !!item &&
        Object.entries(item.values).some(([column_id, value]) => {
          const column = permission_columns_ref.current[column_id];
          return column?.type === "people" && Array.isArray(value) && value.map(Number).includes(current_user_id);
        });

      for (const item of permission_items_ref.current) {
        if (String(item.id) === node_id) return isAssigned(item);
        const child = item.children?.find((candidate) => String(candidate.id) === node_id);
        if (child) return isAssigned(child) || isAssigned(item);
      }
      return false;
    },
    [user]
  );

  const canEditTableColumn = useCallback(
    (column_id: string) => permission_columns_ref.current[column_id]?.can_edit_values ?? true,
    []
  );

  item_dependencies_render_ref.current = (row_id: string) => {
    const row = findItemInTree(items, Number(row_id));
    if (!row) return null;
    const can_edit_row = node.can_edit && (!is_assigned_only || canEditTableNode(row_id));
    return (
      <ItemDependenciesPanel
        sections={buildItemDependencySections(row, items, columns, canEditTableColumn)}
        can_edit={can_edit_row}
        onChangeLinks={(column_id, links) => void handleSetDependencyLinks(row.id, column_id, links)}
        onOpenItem={(item_id) => {
          const target = findItemInTree(items, Number(item_id));
          if (target) handleRowClick(target);
        }}
      />
    );
  };

  const table_config: UseBoardTableConfig = useMemo(
    () => ({
      initial_groups: table_groups,
      people: table_people,
      // Tags is board-wide, never per-column, so this maps straight off `tags`
      // rather than anything scoped to `columns`. Tags living on another board
      // are the account's public tags shared with this one.
      tag_defs: tags.map((tag) => ({
        id: String(tag.id),
        label: tag.label,
        color: tag.color,
        usage_count: tag.usage_count,
        is_shared: tag.board_id !== board_id,
      })),
      onCreateTagDef: handleCreateTagDef,
      onRecolorTagDef: handleRecolorTagDef,
      onRenameTagDef: handleRenameTagDef,
      onDeleteTagDef: handleDeleteTagDef,
      onFetchConnectOptions: handleFetchConnectOptions,
      onFetchConnectedBoards: handleFetchConnectedBoards,
      onFetchLinkedItem: handleFetchLinkedItem,
      onDeleteLinkedItem: (linked_board_id, item_id) => boardContentService.deleteItem(Number(linked_board_id), Number(item_id)),
      // A Mirror cell edits the mirrored value on the connected item itself, on its own board.
      onUpdateLinkedItemValue: async (linked_board_id, item_id, column_id, value) => {
        await boardContentService.updateItemValues(Number(linked_board_id), Number(item_id), { [column_id]: value as BoardItemValue });
      },
      // "Add a mirror column" in the Connect boards settings: a Mirror right after the column, reading through it.
      onAddMirrorColumn: (connect_column_id) => {
        const connect_column = columns_by_id[connect_column_id];
        if (!connect_column) return Promise.resolve(undefined);
        return handleAddColumn({ kind: "mirror", label: "Mirror", default_width: 160 }, connect_column.scope, { source_column_id: connect_column.id }, connect_column.position + 1);
      },
      onCreateConnectItem: handleCreateConnectItem,
      // Declared further down with the other table row handlers, so it is only read once called.
      onCreateNamedItem: (group_key, parent_id, name) => handleCreateNamedTableItem(group_key, parent_id, name),
      onSubmitFeedback: (message) => boardOptionsService.submitFeedback(message, board_id),
      board_ref: { board_id: String(board_id), board_name: board_label, view_id: view_tabs.active_view_id != null ? String(view_tabs.active_view_id) : null },
      onPressButton: handlePressButton,
      // A Button cell's "Set up" opens monday's Button builder on top of the Automations center.
      onSetUpButton: node.can_edit && active_view_type === "table" ? (column_id: string) => openAutomationCenter(undefined, column_id) : undefined,
      initial_item_column_width: item_column_width,
      // Like `item_column_label`, the item-title column isn't a real `board_columns`
      // row, so its resized width persists on the board itself (`item_column_width`)
      // rather than through `onUpdateColumnSettings`.
      onResizeItemColumn: (width) => {
        setItemColumnWidth(width);
        void workspaceService.updateNavItem(node.workspace.slug, board_id, { item_column_width: width });
      },
      initial_sub_column_width: sub_item_column_width,
      onResizeSubColumn: (width) => {
        setSubItemColumnWidth(width);
        void workspaceService.updateNavItem(node.workspace.slug, board_id, { sub_item_column_width: width });
      },
      // Item height + Conditional coloring are owned entirely by the board
      // toolbar (`OverflowControl`/`ConditionalColoringPanel`) — `BoardTable`
      // only reads them to render, it never mutates them back.
      row_height: toolbar.row_height,
      header_height: toolbar.header_height,
      row_colors: toolbar.row_colors,
      cell_colors: toolbar.cell_colors,
      // Same read-only pattern: "Choose columns to pin" (`PinColumnsControl`)
      // already reorders pinned columns to the front of `table_base_columns`
      // above, so all `BoardTable` needs is how many of those leading columns
      // to actually freeze on screen — `table_pinned_count`, not the raw
      // `toolbar.pinned_column_ids.length` (see `table_base_columns`'s own
      // doc comment for why those two can differ).
      pinned_column_count: table_pinned_count,
      // Ctrl/Cmd+F jump-navigation, same read-only toolbar-owned pattern as
      // `row_height`/`row_colors`/`cell_colors` above — `"name"` is the
      // toolbar's real column id for the item title (`ITEM_COLUMN_ID`), the
      // grid's own virtual id for that same column is `"__name"` (see the
      // sort-arrow bridge below for the identical translation).
      active_search_match: active_search_match_grid,
      search_query: toolbar.search_query,
      // A workspace `viewer` (e.g. a board-invited guest) can open and
      // browse the table but never edit it — see `BoardEditGate` server-side.
      read_only: !node.can_edit,
      can_edit_structure: node.can_edit_structure ?? true,
      can_create_items: !is_assigned_only,
      // "Group by" a column shows value buckets, not the board's own groups, so there is no saved order to drag.
      can_reorder_groups: toolbar.group_by_option_id === BOARD_DEFAULT_GROUP_BY_ID,
      canEditNode: is_assigned_only ? canEditTableNode : undefined,
      canEditColumn: canEditTableColumn,
      current_user_id: user ? String(user.id) : undefined,
      onUploadCellFiles: (node_id, column_id, files) =>
        boardItemCellFilesService.uploadCellFiles(board_id, Number(node_id), Number(column_id), files),
      onAddCellFileLink: (node_id, column_id, url, text, source) =>
        boardItemCellFilesService.addCellFileLink(board_id, Number(node_id), Number(column_id), url, text, source),
      onAddCellFileDoc: (node_id, column_id) => boardItemCellFilesService.addCellFileDoc(board_id, Number(node_id), Number(column_id)),
      onDeleteCellFile: (node_id, column_id, file_id) =>
        boardItemCellFilesService.deleteCellFile(board_id, Number(node_id), Number(column_id), file_id),
      initial_collapsed_groups: collapsed_group_map,
      // Tables (groups) are scoped per tab, so the viewer's collapsed set is
      // saved against the active tab rather than the board as a whole — see
      // `BoardGroupController::updateCollapsedState`.
      onCollapsedGroupsChange: (collapsed_group_keys) => {
        void boardContentService.updateGroupCollapseState(board_id, {
          view_id: view_tabs.active_view_id ?? undefined,
          collapsed_group_ids: collapsed_group_keys.map(Number),
        });
      },
      onRenameNode: (node_id, name) => void handleRenameItem(Number(node_id), name),
      onCellValueChange: (node_id, column_id, value) =>
        void handleUpdateCellValue(Number(node_id), column_id, (value ?? null) as BoardItemValue),
      onSetDependencyLinks: (node_id, column_id, links) => void handleSetDependencyLinks(Number(node_id), column_id, links),
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
      // Status cell's inline Edit Labels: deactivate, describe and drag to reorder.
      // The order of `config.options` is the order every picker shows.
      onToggleColumnOptionActive: (column_id, option_id) =>
        void patchColumnOptions(column_id, (options) =>
          options.map((o) => (o.id === option_id ? { ...o, is_active: o.is_active === false } : o))
        ),
      onSetColumnOptionDescription: (column_id, option_id, description) =>
        void patchColumnOptions(column_id, (options) => options.map((o) => (o.id === option_id ? { ...o, description } : o))),
      onReorderColumnOptions: (column_id, ordered_ids) =>
        void patchColumnOptions(column_id, (options) => reorderByIds(options, ordered_ids)),
      onToggleColumnNotifyOnAssignment: (column_id) => void handleToggleColumnNotifyOnAssignment(column_id),
      onUpdateColumnFormula: (column_id, formula) => void handleUpdateColumnFormula(column_id, formula),
      onUpdateConnectSettings: handleUpdateConnectSettings,
      onUpdateColumnMirror: (column_id, mirror) => void handleUpdateColumnMirror(column_id, mirror),
      // The row menu's "Delete" is optimistic: the row disappears right away and
      // comes back, with a toast, if the server refuses.
      onDeleteNode: (node_id) => {
        const previous_items = items;
        setItems((current) => removeItemFromTree(current, Number(node_id)));
        void boardContentService.deleteItem(board_id, Number(node_id)).catch((error) => {
          setItems(previous_items);
          toast.error(getApiErrorMessage(error, "Couldn't delete the row. Please try again."));
        });
      },
      getNodeLink: (node_id) => `${window.location.origin}/boards/${board_id}/pulses/${node_id}`,
      onReorderItems: handleReorderTableItems,
      onReorderColumns: handleReorderTableColumns,
      onRenameGroup: (group_key, name) => patchTableGroup(group_key, { name }, "Couldn't rename the group. Please try again."),
      onChangeGroupColor: (group_key, accent_color) => patchTableGroup(group_key, { accent_color }, "Couldn't change the group color. Please try again."),
      onToggleGroupPriority: (group_key, is_priority) => patchTableGroup(group_key, { is_priority }, "Couldn't update the group. Please try again."),
      onMoveGroup: handleMoveTableGroup,
      onArchiveGroup: handleArchiveTableGroup,
      onRequestRemoveGroup: (group_key) => {
        const group = groups.find((g) => String(g.id) === group_key);
        if (group) setGroupPendingDelete(group);
      },
      onToggleNodePriority: (node_id, is_priority) => {
        void boardContentService
          .updateItem(board_id, Number(node_id), { is_priority })
          .then((updated) => setItems((current) => mapItemInTree(current, Number(node_id), (item) => ({ ...item, is_priority: updated.is_priority }))))
          .catch((error) => handleRowMenuSaveError(error, "Couldn't update the priority. Please try again."));
      },
      onSetItemRecurrence: (node_id, recurrence) => {
        void boardContentService
          .setItemRecurrence(board_id, Number(node_id), recurrence)
          .then((saved) => setItems((current) => mapItemInTree(current, Number(node_id), (item) => ({ ...item, recurrence: saved }))))
          .catch((error) => handleRowMenuSaveError(error, "Couldn't save the recurrence. Please try again."));
      },
      onClearItemRecurrence: (node_id) => {
        void boardContentService
          .clearItemRecurrence(board_id, Number(node_id))
          .then(() => setItems((current) => mapItemInTree(current, Number(node_id), (item) => ({ ...item, recurrence: null }))))
          .catch((error) => handleRowMenuSaveError(error, "Couldn't stop the recurrence. Please try again."));
      },
      onRenameColumn: (_group_key, _scope, column_id, title) =>
        void boardContentService
          .updateColumn(board_id, Number(column_id), { label: title })
          .then((updated) => setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c)))),
      onDeleteColumn: (_group_key, _scope, column_id) => void handleRemoveKanbanProperty(column_id),
      // `validation`/`aggregation` live under the column's own `config` JSON
      // server-side (like `formula`/`mirror`), unlike `width`/`hideable`/
      // `pinnable`, which are real top-level `board_columns` fields — so they
      // need the same read-modify-write merge `handleUpdateColumnFormula` uses,
      // rather than being forwarded to `updateColumn` as-is.
      onUpdateColumnSettings: (_group_key, _scope, column_id, { validation, aggregation, reminder, button, dependency, description, hide_summary, hour_format, rating_max, rating_icon, progress_columns, ...rest }) => {
        const column = columns_by_id[column_id];
        const config_patch: Partial<BoardColumnConfig> = {};
        if (description !== undefined) config_patch.description = description?.trim() || null;
        if (validation !== undefined) config_patch.validation = validation;
        if (aggregation !== undefined) config_patch.aggregation = aggregation;
        if (hide_summary !== undefined) config_patch.hide_summary = hide_summary;
        if (hour_format !== undefined) config_patch.hour_format = hour_format;
        if (rating_max !== undefined) config_patch.rating_max = rating_max;
        if (rating_icon !== undefined) config_patch.rating_icon = rating_icon;
        if (progress_columns !== undefined) {
          config_patch.progress_columns = progress_columns?.map((entry) => ({ column_id: Number(entry.column_id), weight: entry.weight })) ?? null;
        }
        if (reminder !== undefined) config_patch.reminder = reminder;
        if (dependency !== undefined) {
          config_patch.date_column_id = dependency.date_column_id != null ? Number(dependency.date_column_id) : null;
          config_patch.dependency_mode = dependency.mode;
          config_patch.use_working_days = dependency.use_working_days;
        }
        if (button !== undefined) {
          config_patch.button_label = button.label;
          config_patch.button_color = button.color;
        }
        const body = Object.keys(config_patch).length > 0 ? { ...rest, config: { ...(column?.config ?? {}), ...config_patch } } : rest;
        void boardContentService
          .updateColumn(board_id, Number(column_id), body)
          .then((updated) => setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c))));
      },
      onChangeColumnKind: (_group_key, _scope, column_id, kind, default_width) =>
        void boardContentService
          .updateColumn(board_id, Number(column_id), { type: TABLE_KIND_TO_ENGINE_KIND[kind], width: default_width })
          .then((updated) => setColumns((current) => current.map((c) => (c.id === updated.id ? updated : c)))),
      // The row's message-icon button only knows its own node id — look the
      // real row (item or subitem) up in the tree and reuse the same
      // `handleRowClick` every other view's row click already goes through,
      // so opening comments from the Table view stays in sync with the
      // drawer's URL/deep-link handling instead of duplicating it. The row's
      // own hover-reveal expand button (`onOpenItem`) opens the same drawer
      // through the same lookup, it just isn't limited to the message icon.
      onOpenComments: (node_id) => {
        const row = findItemInTree(items, Number(node_id));
        if (row) handleRowClick(row);
      },
      onOpenItem: (node_id) => {
        const row = findItemInTree(items, Number(node_id));
        if (row) handleRowClick(row);
      },
      onRequestGroupItems: requestGroupItems,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      table_groups,
      table_people,
      tags,
      handleCreateTagDef,
      handleRecolorTagDef,
      handleRenameTagDef,
      handleDeleteTagDef,
      handleFetchConnectOptions,
      handleFetchConnectedBoards,
      handleCreateConnectItem,
      columns_by_id,
      board_id,
      items,
      item_column_width,
      sub_item_column_width,
      collapsed_group_map,
      view_tabs.active_view_id,
      node.workspace.slug,
      toolbar.row_height,
      toolbar.header_height,
      toolbar.row_colors,
      toolbar.cell_colors,
      active_search_match_grid,
      toolbar.search_query,
      node.can_edit,
      node.can_edit_structure,
      toolbar.group_by_option_id,
      is_assigned_only,
      canEditTableNode,
      canEditTableColumn,
      table_pinned_count,
      user,
      requestGroupItems,
      board_label,
    ]
  );

  const handleCreateTableItem = async (group_key: string): Promise<string> => {
    const created = await boardContentService.createItem(board_id, { name: "New item", group_id: Number(group_key) });
    setItems((current) => [...current, created]);
    return String(created.id);
  };

  // The Dependency picker's "Type to find or create item": the typed name, next to the row it is picked from.
  const handleCreateNamedTableItem = async (group_key: string, parent_id: string | null, name: string): Promise<string> => {
    if (parent_id) {
      const created = await boardContentService.createItem(board_id, { name, parent_id: Number(parent_id) });
      setItems((current) => mapItemInTree(current, Number(parent_id), (item) => ({ ...item, children: [...item.children, created] })));
      return String(created.id);
    }
    const created = await boardContentService.createItem(board_id, { name, group_id: Number(group_key) });
    setItems((current) => [...current, created]);
    return String(created.id);
  };

  const handleCreateTableSubitem = async (item_id: string): Promise<string> => {
    const created = await boardContentService.createItem(board_id, { name: "New subitem", parent_id: Number(item_id) });
    setItems((current) => mapItemInTree(current, Number(item_id), (item) => ({ ...item, children: [...item.children, created] })));
    return String(created.id);
  };

  /**
   * Inserts a freshly created group into local state at its backend-assigned
   * `position`, shifting every other group whose `position` moved up to make
   * room — mirrors the shift `BoardGroupController::store()` already applies
   * server-side (see `insertColumnAtPosition` above for the same convention
   * on columns). Without this, `groups` (whose array order — not `position`
   * — drives render order) would just get the new group appended, so it
   * always rendered last regardless of where the backend actually placed it.
   * When `created` has the next free position (a plain append, no
   * `after_group_key`), no sibling qualifies for the shift and this is
   * equivalent to the old `[...current, created]`.
   */
  const insertGroupAtPosition = (current: BoardGroupDto[], created: BoardGroupDto): BoardGroupDto[] => {
    const shifted = current.map((group) =>
      group.position >= created.position ? { ...group, position: group.position + 1 } : group
    );
    const insert_index = shifted.findIndex((group) => group.position > created.position);
    return insert_index === -1
      ? [...shifted, created]
      : [...shifted.slice(0, insert_index), created, ...shifted.slice(insert_index)];
  };

  // ── Group menu's "Add group" — `after_group_key` is the group whose "..."
  // menu the row was clicked from, so the new table is persisted right after
  // it (rather than always at the end): the backend shifts every group at or
  // past that position to make room (see `BoardGroupController::store()`),
  // and `insertGroupAtPosition` mirrors that locally. Omitted (the toolbar's
  // own "Add new group" button), it just appends as before. ──
  const handleCreateTableGroup = async (after_group_key?: string): Promise<{ key: string; title: string }> => {
    const after = after_group_key ? groups.find((group) => String(group.id) === after_group_key) : undefined;
    const created = await boardContentService.createGroup(board_id, {
      view_id: view_tabs.active_view_id as number,
      name: "New group",
      position: after ? after.position + 1 : undefined,
    });
    setGroups((current) => insertGroupAtPosition(current, created));
    // A freshly created table has no rows yet — nothing to lazy-load.
    setLoadedGroupIds((current) => new Set(current).add(created.id));
    return { key: String(created.id), title: created.name };
  };

  // ── Group menu's "Duplicate this group" — like `handleDuplicateTableColumn`
  // above, awaits the real API call rather than mutating `BoardTable`'s local
  // state, since a locally-fabricated copy's items would carry fake ids that
  // 404 the moment a cell edit tries to persist against them. The duplicate
  // response only carries the new group itself, so a `with_items` duplicate
  // needs a follow-up scoped `getItems` (just this one new group, consistent
  // with the lazy per-table loading model — not a whole-tab refetch) to pick
  // up the copied rows under their real backend ids. ──
  const handleDuplicateTableGroup = async (group_key: string, with_items: boolean) => {
    try {
      const created = await boardContentService.duplicateGroup(board_id, Number(group_key), with_items);
      // The copy lands right below the original and the server shifted every later group down, see `handleCreateTableGroup`.
      setGroups((current) => insertGroupAtPosition(current, created));
      if (with_items) {
        const fetched = await boardContentService.getItems(board_id, view_tabs.active_view_id, undefined, [created.id]);
        mergeFetchedItems(fetched);
      }
      setLoadedGroupIds((current) => new Set(current).add(created.id));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't duplicate the group. Please try again."));
    }
  };

  // ── Row menu's own single-item "Duplicate" (an item or a subitem, with or
  // without its own subitems) — same "await the real call" reasoning as
  // `handleDuplicateTableGroup` above. Branches on the response's own
  // `parent_id` rather than the caller's `node_id` context, since that's the
  // one place both root-item and subitem duplication are already handled
  // the same way `handleCreateTableItem`/`handleCreateTableSubitem` are. ──
  const handleDuplicateTableNode = async (node_id: string, with_subs: boolean) => {
    try {
      const [duplicate] = await boardContentService.duplicateItems(board_id, [Number(node_id)], with_subs);
      if (!duplicate) return;
      setItems((current) =>
        duplicate.parent_id == null
          ? [...current, duplicate]
          : mapItemInTree(current, duplicate.parent_id, (item) => ({ ...item, children: [...item.children, duplicate] }))
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't duplicate the row. Please try again."));
    }
  };

  // ── Row menu's remaining structural actions. Each one awaits the real API
  // call and only then updates `items`, which flows back into the table as
  // `initial_groups`, so a row is never shown in a place the server doesn't
  // agree with. A failure is reported as a toast and leaves the table as it was. ──

  /** "Create new item/subitem below": persists the row as the next sibling of `node_id` and resolves with its real id, or null when it couldn't be created. */
  const handleCreateTableBelow = async (node_id: string): Promise<string | null> => {
    const reference = findItemInTree(items, Number(node_id));
    if (!reference) return null;
    try {
      const created = await boardContentService.createItem(board_id, {
        name: reference.parent_id === null ? "New item" : "New subitem",
        after_item_id: reference.id,
      });
      setItems((current) => insertItemBelowInTree(current, reference, created));
      return String(created.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't create the row. Please try again."));
      return null;
    }
  };

  /** "Move to group" for a root item. */
  const handleMoveTableItemToGroup = async (item_id: string, group_key: string) => {
    try {
      await handleDrawerMoveItemToGroup(item_id, group_key);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't move the item. Please try again."));
    }
  };

  /**
   * "Convert to subitem" (`parent_id` is the item it now hangs under), "Convert
   * to item" (`parent_id` is null, the row lands at the end of its own table)
   * and a subitem's "Move to item". The response only carries the row's new
   * placement and its re-keyed cell values (see `updateItemParent`), so the
   * rest of the row, its counts included, is kept from the local copy.
   */
  const handleChangeTableNodeParent = async (node_id: string, parent_id: string | null) => {
    const node = findItemInTree(items, Number(node_id));
    if (!node) return;
    try {
      const updated = await boardContentService.updateItemParent(
        board_id,
        node.id,
        parent_id === null ? { parent_id: null, group_id: node.group_id } : { parent_id: Number(parent_id) }
      );
      setItems((current) => relocateItemInTree(current, node, updated));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't convert the row. Please try again."));
    }
  };

  /** "Archive": hides the row from the board, it stays restorable from the board's archive panel. */
  const handleArchiveTableNode = async (node_id: string) => {
    try {
      await boardContentService.archiveItems(board_id, [Number(node_id)]);
      setItems((current) => removeItemFromTree(current, Number(node_id)));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't archive the row. Please try again."));
    }
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

  const isKanbanRowDone = (row: BoardItemDto): boolean =>
    board_done_column ? row.values[String(board_done_column.id)] === true : false;

  /** A card's "..." menu: open, complete, rename, move to another lane, duplicate, copy link, archive and delete. */
  const getKanbanCardMenuSections = (row: BoardItemDto): ActionMenuSection[] => {
    const row_id = String(row.id);
    const is_done = isKanbanRowDone(row);
    const current_lane_id = board_status_column ? row.values[String(board_status_column.id)] ?? "__none__" : null;
    const move_targets = kanban_lanes.filter((lane) => lane.id !== current_lane_id && lane.id !== "__none__");
    return [
      {
        key: "open",
        items: [
          { key: "open", label: "Open task details", icon: <OpenInOverlayIcon size={14} />, onClick: () => handleRowClick(row) },
          ...(board_done_column
            ? [
                {
                  key: "complete",
                  label: is_done ? "Mark incomplete" : "Mark complete",
                  icon: <CheckCircleIcon size={14} />,
                  onClick: () => void handleUpdateCellValue(row.id, String(board_done_column.id), !is_done),
                },
              ]
            : []),
          { key: "rename", label: "Rename", icon: <RenameIcon size={14} />, onClick: () => setEditingItemId(row.id) },
        ],
      },
      {
        key: "organize",
        items: [
          ...(move_targets.length > 0
            ? [
                {
                  key: "move",
                  label: "Move to lane",
                  icon: <MoveToIcon size={14} />,
                  submenu: move_targets.map((lane) => ({
                    key: lane.id,
                    label: lane.label,
                    icon: <span className="h-3 w-3 rounded-[4px]" style={{ background: lane.color }} />,
                    onClick: () => handleMoveKanbanCard(row_id, lane.id),
                  })),
                },
              ]
            : []),
          { key: "duplicate", label: "Duplicate", icon: <DuplicateIcon size={14} />, onClick: () => void handleDuplicateTableNode(row_id, true) },
          { key: "copy-link", label: "Copy task link", icon: <LinkIcon size={14} />, onClick: () => void handleCopyKanbanCardLink(row) },
        ],
      },
      {
        key: "remove",
        items: [
          { key: "archive", label: "Archive", icon: <ArchiveIcon size={14} />, onClick: () => setKanbanCardConfirm({ kind: "archive", row_id }) },
          { key: "delete", label: "Delete", icon: <DeleteIcon size={14} />, danger: true, onClick: () => setKanbanCardConfirm({ kind: "delete", row_id }) },
        ],
      },
    ];
  };

  const renderKanbanCard = (row: BoardItemDto): React.ReactNode => {
    const label_ids = board_label_column ? asStringArray(row.values[String(board_label_column.id)]) : [];
    const member_ids = board_member_column ? asStringArray(row.values[String(board_member_column.id)]) : [];
    const members = board_member_column ? roster_members.filter((member) => member_ids.includes(String(member.id))) : [];

    const priority_value = board_priority_column ? row.values[String(board_priority_column.id)] : null;
    const priority_option =
      board_priority_column && typeof priority_value === "string"
        ? (board_priority_column.config?.options ?? []).find((option) => option.id === priority_value) ?? null
        : null;
    const pills: KanbanTaskPill[] = priority_option
      ? [{ key: "priority", label: priority_option.label, color: priority_option.color, solid: true }]
      : [];

    const due_date_value = board_date_column ? row.values[String(board_date_column.id)] : null;

    return (
      <KanbanTaskCard
        title={row.name}
        is_done={isKanbanRowDone(row)}
        onToggleDone={
          board_done_column ? () => void handleUpdateCellValue(row.id, String(board_done_column.id), !isKanbanRowDone(row)) : undefined
        }
        is_editing_title={editing_item_id === row.id}
        onStartEditTitle={() => setEditingItemId(row.id)}
        onCommitTitle={(name) => handleRenameItem(row.id, name)}
        onCancelEditTitle={() => setEditingItemId(null)}
        description={row.description?.trim() || null}
        pills={pills}
        labels_slot={
          board_label_column && label_ids.length > 0 ? (
            <KanbanCardLabels
              options={board_label_column.config?.options ?? []}
              selected_ids={label_ids}
              onToggle={(option_id) => {
                const next = label_ids.includes(option_id) ? label_ids.filter((id) => id !== option_id) : [...label_ids, option_id];
                void handleUpdateCellValue(row.id, String(board_label_column.id), next.length ? next : null);
              }}
              onCreateOption={(option) => handleAddColumnOption(String(board_label_column.id), option)}
              onEditOptions={makeOptionActions(String(board_label_column.id))}
            />
          ) : null
        }
        checklist={row.checklist_total_count > 0 ? { done: row.checklist_done_count, total: row.checklist_total_count } : null}
        due_date={typeof due_date_value === "string" && due_date_value ? formatKanbanDueDate(due_date_value) : null}
        members_slot={
          board_member_column ? (
            <KanbanCardMembers
              people={roster_members}
              selected={members}
              onSave={(person_ids) => {
                void handleUpdateCellValue(row.id, String(board_member_column.id), person_ids.length ? person_ids : null);
              }}
            />
          ) : null
        }
        subitem_count={row.subitem_count || row.children.length}
        comment_count={row.comment_count}
        attachment_count={row.attachment_count}
        menu_sections={getKanbanCardMenuSections(row)}
      />
    );
  };

  const handleCopyKanbanCardLink = async (row: BoardItemDto) => {
    const suffix = view_tabs.active_view && !view_tabs.active_view.is_primary ? `?view_id=${view_tabs.active_view.id}` : "";
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/boards/${board_id}/pulses/${row.id}${suffix}`);
      toast.success("Task link copied.");
    } catch {
      toast.error("Couldn't copy the link. Please try again.");
    }
  };

  /** Runs a card menu's confirmed "Archive" or "Delete". Throwing keeps the confirm dialog open with the message. */
  const handleConfirmKanbanCardAction = async () => {
    if (!kanban_card_confirm) return;
    const { kind, row_id } = kanban_card_confirm;
    try {
      if (kind === "archive") await handleDrawerArchiveItem(row_id);
      else await handleDrawerDeleteItem(row_id);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, kind === "archive" ? "Couldn't archive the task. Please try again." : "Couldn't delete the task. Please try again."));
    }
    if (drawer.open_row_id === row_id) handleDrawerClose();
    setKanbanCardConfirm(null);
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
   * Persists a lane's new card order after a drag. Lanes are a Kanban only
   * concept while `position` lives per table (group), so each table that holds
   * cards of this lane keeps its other rows where they are and only has this
   * lane's rows re-sequenced in its slots. Every touched table is saved through
   * the transactional reorder endpoint, one call per table.
   */
  const handleReorderKanbanCards = (_lane_id: string, ordered_row_ids: string[]) => {
    const lane_order = new Map(ordered_row_ids.map((id, index) => [id, index]));
    const root_items_by_group = new Map<number, BoardItemDto[]>();
    for (const item of [...items].sort((a, b) => a.position - b.position)) {
      if (item.parent_id !== null) continue;
      const list = root_items_by_group.get(item.group_id) ?? [];
      list.push(item);
      root_items_by_group.set(item.group_id, list);
    }

    const next_position_by_id = new Map<number, number>();
    const payloads: ReorderBoardItemsPayload[] = [];
    for (const [group_id, group_items] of root_items_by_group) {
      const lane_rows = group_items.filter((item) => lane_order.has(String(item.id)));
      if (lane_rows.length === 0) continue;
      const reordered_lane_rows = [...lane_rows].sort(
        (a, b) => (lane_order.get(String(a.id)) ?? 0) - (lane_order.get(String(b.id)) ?? 0)
      );
      let cursor = 0;
      const next_order = group_items.map((item) => (lane_order.has(String(item.id)) ? reordered_lane_rows[cursor++] : item));
      const has_changed = next_order.some((item, index) => item.id !== group_items[index].id || item.position !== index);
      if (!has_changed) continue;
      next_order.forEach((item, index) => next_position_by_id.set(item.id, index));
      payloads.push({
        scope: "root",
        moved_item_id: reordered_lane_rows[0].id,
        target_group_id: group_id,
        target_ordered_ids: next_order.map((item) => item.id),
      });
    }
    if (payloads.length === 0) return;

    const previous = items;
    setItems((current) =>
      current.map((item) => {
        const position = next_position_by_id.get(item.id);
        return position === undefined ? item : { ...item, position };
      })
    );
    Promise.all(payloads.map((payload) => boardContentService.reorderItems(board_id, payload))).catch((error) => {
      setItems(previous);
      toast.error(getApiErrorMessage(error, "Couldn't save the new card order. Please try again."));
    });
  };

  /** Creates a task in a lane. The composer stays open so several tasks can be typed in a row. */
  const handleSubmitNewKanbanCard = async (lane_id: string, title: string) => {
    try {
      const target_group = await ensureBoardGroup();
      if (!target_group) return;
      const values =
        board_status_column && lane_id !== "__none__" ? { [String(board_status_column.id)]: lane_id } : undefined;
      const created = await boardContentService.createItem(board_id, { name: title, group_id: target_group.id, values });
      setItems((current) => [...current, created]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't create the task. Please try again."));
    }
  };

  const handleAddKanbanLane = (label: string) => {
    if (!board_status_column) return;
    const next_index = board_status_column.config?.options?.length ?? 0;
    void handleAddColumnOption(String(board_status_column.id), {
      label,
      color: COLUMN_OPTION_PALETTE[next_index % COLUMN_OPTION_PALETTE.length],
    });
  };

  const handleRenameKanbanLane = (lane_id: string, label: string) => {
    if (!board_status_column) return;
    makeOptionActions(String(board_status_column.id)).onRename(lane_id, label);
  };

  const handleRecolorKanbanLane = (lane_id: string, color: string) => {
    if (!board_status_column) return;
    makeOptionActions(String(board_status_column.id)).onRecolor(lane_id, color);
  };

  /** Removes the lane's status option. Its cards keep existing and show up in the "No status" lane. */
  const handleDeleteKanbanLane = (lane_id: string) => {
    if (!board_status_column) return;
    makeOptionActions(String(board_status_column.id)).onDelete(lane_id);
  };

  const handleReorderKanbanLanes = (ordered_lane_ids: string[]) => {
    if (!board_status_column) return;
    makeOptionActions(String(board_status_column.id)).onReorder?.(ordered_lane_ids);
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

  // ── Calendar ── like monday.com's Calendar view, every Date and Timeline
  // column can place items (the view's settings pick which ones). An event's
  // day *is* its value in that column, so dragging it is an ordinary cell
  // edit, same as Kanban's lane drag. ──
  const calendar_config: BoardCalendarConfig = view_tabs.active_view?.calendar_config ?? {};
  const calendar_date_sources = useMemo(
    () =>
      item_columns
        .filter((c) => c.type === "date" || c.type === "timeline")
        .map((c) => ({ id: String(c.id), label: c.label, kind: c.type === "timeline" ? ("timeline" as const) : ("date" as const) })),
    [item_columns]
  );
  // Saved ids of columns deleted since (or remapped by a duplicate) are dropped, falling back to every column.
  const calendar_active_source_ids = useMemo(() => {
    const saved_ids = calendar_config.date_column_ids ?? null;
    const kept_ids = saved_ids ? calendar_date_sources.filter((source) => saved_ids.includes(source.id)).map((source) => source.id) : [];
    return kept_ids.length > 0 ? kept_ids : calendar_date_sources.map((source) => source.id);
  }, [calendar_config.date_column_ids, calendar_date_sources]);
  const calendar_color_sources = useMemo(
    () => item_columns.filter((c) => c.type === "status").map((c) => ({ id: String(c.id), label: c.label })),
    [item_columns]
  );
  const calendar_color_by: BoardCalendarColorBy =
    calendar_config.color_by === "group" || calendar_config.color_by === "none"
      ? calendar_config.color_by
      : calendar_color_sources.some((source) => source.id === calendar_config.color_by)
        ? (calendar_config.color_by as string)
        : (calendar_color_sources[0]?.id ?? "none");
  const calendar_groups = useMemo(
    () => groups.map((group) => ({ id: group.id, label: group.name, color: group.accent_color })),
    [groups]
  );
  const calendar_rows = useMemo(() => {
    const hidden_group_ids = new Set(calendar_config.hidden_group_ids ?? []);
    return hidden_group_ids.size === 0 ? filtered_rows : filtered_rows.filter((row) => !hidden_group_ids.has(row.group_id));
  }, [filtered_rows, calendar_config.hidden_group_ids]);
  const can_edit_calendar_settings = node.can_edit && view_tabs.active_view !== null && !view_tabs.active_view.is_locked;

  const getCalendarRowEntries = useCallback(
    (row: BoardItemDto): BoardCalendarEntry[] =>
      calendar_active_source_ids.flatMap((source_id): BoardCalendarEntry[] => {
        const source = calendar_date_sources.find((candidate) => candidate.id === source_id);
        const raw = row.values[source_id];
        if (!source || !raw) return [];
        if (source.kind === "date") return typeof raw === "string" ? [{ source_id, kind: "date", value: raw }] : [];
        if (typeof raw !== "object" || Array.isArray(raw)) return [];
        // A Timeline source guarantees the object is a `BoardTimelineValue`.
        const range = raw as BoardTimelineValue;
        return range.start ? [{ source_id, kind: "timeline", start: range.start, end: range.end ?? null }] : [];
      }),
    [calendar_active_source_ids, calendar_date_sources]
  );

  // Memoized so the calendar's event list and event component keep their identity between unrelated renders.
  const getCalendarRowColor = useCallback(
    (row: BoardItemDto): string => {
      if (calendar_color_by === "none") return DEFAULT_EVENT_COLOR;
      if (calendar_color_by === "group") return groups.find((group) => group.id === row.group_id)?.accent_color ?? DEFAULT_EVENT_COLOR;
      const status_column = item_columns.find((c) => String(c.id) === calendar_color_by);
      if (!status_column) return DEFAULT_EVENT_COLOR;
      const option = (status_column.config?.options ?? []).find((o) => o.id === row.values[String(status_column.id)]);
      return option?.color ?? "#c4c4c4";
    },
    [calendar_color_by, groups, item_columns]
  );

  const calendar_shows_people = calendar_config.show_people !== false;
  const renderCalendarEvent = useCallback(
    (row: BoardItemDto): React.ReactNode => {
      const member_ids = board_member_column && calendar_shows_people ? asStringArray(row.values[String(board_member_column.id)]) : [];
      const members = member_ids.length > 0 ? roster_members.filter((member) => member_ids.includes(String(member.id))) : [];

      return (
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate">{row.name}</span>
          {members.length > 0 && <PersonAvatarStack people={members} size={16} max_visible={3} />}
        </div>
      );
    },
    [board_member_column, calendar_shows_people, roster_members]
  );

  const handleChangeCalendarEntry = (row_id: string, source_id: string, value: string | BoardTimelineValue) => {
    void handleUpdateCellValue(Number(row_id), source_id, value);
  };

  // ── Calendar "+ Add" ── opens monday's New Item dialog with the clicked
  // day prefilled in the first column the calendar shows; nothing is saved
  // until "Create Task". ──
  const [calendar_new_item, setCalendarNewItem] = useState<{ key: string; date: string } | null>(null);
  const calendar_new_item_fields: CalendarNewItemField[] = useMemo(
    () =>
      item_columns
        .filter((c) => CALENDAR_NEW_ITEM_KINDS.has(c.type))
        .map((c) => ({
          id: String(c.id),
          label: c.label,
          kind: c.type,
          icon_kind: TABLE_COLUMN_KIND[c.type] ?? null,
          options: c.config?.options,
          description: c.config?.description ?? null,
        })),
    [item_columns]
  );
  const calendar_new_item_source = calendar_date_sources.find((candidate) => candidate.id === calendar_active_source_ids[0]) ?? null;
  const calendar_new_item_values: Record<string, BoardItemValue> = {};
  if (calendar_new_item && calendar_new_item_source) {
    const day = calendar_new_item.date.slice(0, 10);
    calendar_new_item_values[calendar_new_item_source.id] =
      calendar_new_item_source.kind === "timeline" ? { start: day, end: day } : calendar_new_item.date;
  }
  const calendar_new_item_group_id = groups.find((group) => !(calendar_config.hidden_group_ids ?? []).includes(group.id))?.id ?? groups[0]?.id ?? null;

  const closeCalendarNewItem = useCallback(() => setCalendarNewItem(null), []);

  const handleRequestCalendarItem = async (date: string) => {
    // The dialog needs a group to pick, a Calendar tab that never opened its table gets one silently.
    if (groups.length === 0 && !(await ensureBoardGroup())) return;
    setCalendarNewItem({ key: `${date}:${Date.now()}`, date });
  };

  const handleCreateCalendarItem = async ({ name, group_id, values }: CalendarNewItemPayload) => {
    try {
      const created = await boardContentService.createItem(board_id, { name, group_id, values: values as Record<string, BoardItemValue> });
      setItems((current) => [...current, created]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't create the item. Please try again."));
      throw error;
    }
  };

  const handleChangeCalendarConfig = (next: BoardCalendarConfig) => {
    const view_id = view_tabs.active_view_id;
    if (view_id == null) return;
    view_tabs.updateCalendarConfig(view_id, next).catch((error) => {
      toast.error(getApiErrorMessage(error, "Couldn't save the calendar settings. Please try again."));
    });
  };

  /**
   * A brand-new Calendar tab has no Date column yet, so offer to add one
   * instead of showing an empty grid, mirroring `handleStartKanbanBoard`.
   */
  const handleStartCalendarBoard = () => {
    const date_type = ADDABLE_COLUMN_TYPES.find((type) => type.kind === "date");
    if (!date_type) return;
    void handleAddColumn(date_type);
  };

  // ── Gantt ── like monday.com's Gantt view, bars come from a Timeline column
  // (or a Date column, one day bars) picked in the view's settings, colored by
  // group by default, with arrows from the board's first Dependency column. A
  // bar's position is its cell value, so dragging it is one cell edit and a
  // cascade reschedule (see `GanttChart`'s `computeCascade`) is more of the
  // same edit applied to the successors it pushed forward. ──
  const gantt_config: BoardGanttConfig = view_tabs.active_view?.gantt_config ?? {};
  const gantt_source =
    calendar_date_sources.find((source) => source.id === gantt_config.date_column_id) ??
    calendar_date_sources.find((source) => source.kind === "timeline") ??
    calendar_date_sources[0] ??
    null;
  const gantt_color_by: BoardGanttColorBy =
    gantt_config.color_by === "none" || gantt_config.color_by === "group"
      ? gantt_config.color_by
      : calendar_color_sources.some((source) => source.id === gantt_config.color_by)
        ? (gantt_config.color_by as string)
        : "group";
  const can_edit_gantt_settings = can_edit_calendar_settings;

  // The funnel hides whole groups, the board toolbar's own filters already ran on `toolbar.groups`.
  const gantt_groups = useMemo(() => {
    const hidden_group_ids = new Set(gantt_config.hidden_group_ids ?? []);
    if (hidden_group_ids.size === 0) return toolbar.groups;
    return toolbar.groups
      .map((group) => ({ ...group, rows: group.rows.filter((row) => !hidden_group_ids.has(row.group_id)) }))
      .filter((group) => group.rows.length > 0 || !hidden_group_ids.has(Number(group.id)));
  }, [toolbar.groups, gantt_config.hidden_group_ids]);

  const getGanttRowRange = useCallback(
    (row: BoardItemDto): GanttRange | null => {
      if (!gantt_source) return null;
      const raw = row.values[gantt_source.id];
      if (!raw) return null;
      if (gantt_source.kind === "date") return typeof raw === "string" ? { start: raw.slice(0, 10), end: null } : null;
      if (typeof raw !== "object" || Array.isArray(raw)) return null;
      // A Timeline source guarantees the object is a `BoardTimelineValue`.
      const range = raw as BoardTimelineValue;
      return range.start ? { start: range.start, end: range.end ?? null } : null;
    },
    [gantt_source]
  );

  const getGanttRowColor = useCallback(
    (row: BoardItemDto): string => {
      if (gantt_color_by === "none") return DEFAULT_GANTT_BAR_COLOR;
      if (gantt_color_by === "group") return groups.find((group) => group.id === row.group_id)?.accent_color ?? DEFAULT_GANTT_BAR_COLOR;
      const status_column = item_columns.find((c) => String(c.id) === gantt_color_by);
      const option = (status_column?.config?.options ?? []).find((o) => o.id === row.values[gantt_color_by]);
      return option?.color ?? "#c4c4c4";
    },
    [gantt_color_by, groups, item_columns]
  );

  /** The legend under the chart: the groups shown (alphabetically, like monday.com), or the status labels in use. */
  const gantt_legend_items: GanttLegendItem[] = useMemo(() => {
    if (gantt_color_by === "none") return [];
    if (gantt_color_by === "group") {
      const shown_group_ids = new Set(gantt_groups.flatMap((group) => group.rows.map((row) => row.group_id)));
      return groups
        .filter((group) => shown_group_ids.has(group.id))
        .map((group) => ({ key: String(group.id), label: group.name, color: group.accent_color }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    const status_column = item_columns.find((c) => String(c.id) === gantt_color_by);
    const used_option_ids = new Set(gantt_groups.flatMap((group) => group.rows.map((row) => row.values[gantt_color_by])));
    return (status_column?.config?.options ?? [])
      .filter((option) => used_option_ids.has(option.id))
      .map((option) => ({ key: option.id, label: option.label || "Blank", color: option.color }));
  }, [gantt_color_by, gantt_groups, groups, item_columns]);

  const gantt_group_options = useMemo(
    () => groups.map((group) => ({ id: group.id, label: group.name, color: group.accent_color })),
    [groups]
  );

  const getGanttDependencyIds = useCallback(
    (row: BoardItemDto): string[] => (board_dependency_column ? asStringArray(row.values[String(board_dependency_column.id)]) : []),
    [board_dependency_column]
  );

  /** Writes a bar's new dates to the source column, a Date column keeps the time it already had. */
  const writeGanttRange = (row_id: string, new_start: string, new_end: string) => {
    if (!gantt_source) return;
    if (gantt_source.kind === "timeline") {
      void handleUpdateCellValue(Number(row_id), gantt_source.id, { start: new_start, end: new_end });
      return;
    }
    const row = findItemInTree(items, Number(row_id));
    const previous = row?.values[gantt_source.id];
    const time_suffix = typeof previous === "string" && previous.length > 10 ? previous.slice(10) : "";
    void handleUpdateCellValue(Number(row_id), gantt_source.id, `${new_start}${time_suffix}`);
  };

  // A Dependency column scheduling this same column moves the successors on
  // the server (and returns them), so the chart must not push them a second time.
  const is_gantt_scheduled_by_server =
    !!board_dependency_column &&
    !!gantt_source &&
    String(board_dependency_column.config?.date_column_id ?? "") === gantt_source.id &&
    (board_dependency_column.config?.dependency_mode ?? "none") !== "none";

  /** Batch writes the successor rows a drag pushed forward to keep every Finish to Start dependency satisfied. */
  const handleGanttCascadeReschedule = (updates: { row_id: string; start: string; end: string }[]) => {
    for (const update of updates) writeGanttRange(update.row_id, update.start, update.end);
  };

  const handleChangeGanttDependencies = (row_id: string, predecessor_ids: string[] | null) => {
    if (!board_dependency_column) return;
    void handleUpdateCellValue(Number(row_id), String(board_dependency_column.id), predecessor_ids);
  };

  /** The row menu's "Delete item", optimistic like the table's own row menu. */
  const handleDeleteGanttRow = (row_id: string) => {
    const previous_items = items;
    setItems((current) => removeItemFromTree(current, Number(row_id)));
    void boardContentService.deleteItem(board_id, Number(row_id)).catch((error) => {
      setItems(previous_items);
      toast.error(getApiErrorMessage(error, "Couldn't delete the item. Please try again."));
    });
  };

  const handleChangeGanttConfig = (next: BoardGanttConfig) => {
    const view_id = view_tabs.active_view_id;
    if (view_id == null) return;
    view_tabs.updateGanttConfig(view_id, next).catch((error) => {
      toast.error(getApiErrorMessage(error, "Couldn't save the Gantt settings. Please try again."));
    });
  };

  /**
   * A brand-new Gantt tab has no Timeline column yet, so offer to add one
   * instead of showing an empty chart, mirroring `handleStartKanbanBoard`.
   */
  const handleStartGanttBoard = () => {
    const timeline_type = ADDABLE_COLUMN_TYPES.find((type) => type.kind === "timeline");
    if (!timeline_type) return;
    void handleAddColumn(timeline_type);
  };

  /** Offered by the Gantt settings when the board has no Dependency column to draw arrows from. */
  const handleAddGanttDependencyColumn = () => {
    const dependency_type = ADDABLE_COLUMN_TYPES.find((type) => type.kind === "dependency");
    if (!dependency_type) return;
    void handleAddColumn(dependency_type);
  };

  // ── Kanban's own item card (see `KanbanItemModal`), a centered monday
  // style modal instead of the tabbed `BoardItemDrawer` every other view
  // (Table/Calendar) keeps using. Every field still writes through the exact
  // same persistence (`handleUpdateCellValue`/`handleRenameItem`) as the
  // card and the table cell it is mirrored from. ──
  const kanban_open_row = active_view_type === "kanban" ? items.find((item) => String(item.id) === drawer.open_row_id) ?? null : null;
  const kanban_open_row_detail = kanban_open_row ? item_detail_by_id[String(kanban_open_row.id)] : undefined;
  // The columns the Kanban view relies on come first in a fixed order and stay on every card, every other column follows in board order.
  const kanban_core_columns = [board_status_column, board_member_column, board_date_column, board_priority_column, board_label_column].filter(
    (column): column is NonNullable<typeof column> => column != null
  );
  const kanban_item_fields: KanbanItemField[] = [
    ...kanban_core_columns.map((column) => ({ column, is_removable: false })),
    ...other_kanban_columns.map((column) => ({ column, is_removable: true })),
  ].map(({ column, is_removable }) => ({
    id: String(column.id),
    label: column.label,
    kind: column.type,
    options: column.config?.options,
    is_removable,
  }));
  // Previous and next card in the order the lanes show them, for the card's arrows.
  const kanban_ordered_rows = kanban_lanes.flatMap((lane) => lane.rows);
  const kanban_open_row_index = kanban_open_row ? kanban_ordered_rows.findIndex((row) => row.id === kanban_open_row.id) : -1;
  const kanban_previous_row = kanban_open_row_index > 0 ? kanban_ordered_rows[kanban_open_row_index - 1] : null;
  const kanban_next_row =
    kanban_open_row_index >= 0 && kanban_open_row_index < kanban_ordered_rows.length - 1 ? kanban_ordered_rows[kanban_open_row_index + 1] : null;

  return (
    <BoardShell
      // A Doc tab lays out its own toolbar and scroll area edge to edge, and can fold the title row away.
      fill_body={active_view_type === "doc" && !!active_doc_view}
      is_header_collapsed={active_view_type === "doc" && is_doc_header_collapsed}
      header={{
        title: board_label,
        is_favorite: is_board_favorite,
        onToggleFavorite: () => void handleToggleFavorite(),
        invite_count,
        board_id,
        current_user,
        info,
        onInviteClick,
        onBoardUpdatesClick: discussion_drawer.open,
        board_updates_count: discussion_drawer.comment_count,
        board_updates_unseen: discussion_drawer.has_unseen_comments,
        onIntegrateClick: () => setIsIntegrationsModalOpen(true),
        onAutomateClick: active_view_type === "table" ? () => openAutomationCenter() : undefined,
        automation_count: automations.filter((a) => a.is_enabled).length,
        options_menu: {
          board_id,
          board_label,
          board_type,
          is_archived: is_board_archived,
          can_manage: node.can_manage,
          view_id: view_tabs.active_view_id,
          view_label: view_tabs.active_view?.label ?? null,
          view_type: view_tabs.active_view?.view_type ?? null,
          edit_permission: board_edit_permission,
          is_owner: node.is_owner ?? node.can_manage,
          onEditPermissionChange: handleEditPermissionChange,
          access,
          onAccessChange,
          onBoardUpdatesClick: discussion_drawer.open,
          onChangeBoardTypeClick: () => info.onChangeBoardType?.(),
          onRename: handleRenameBoard,
          onDuplicate: handleDuplicateBoard,
          onArchive: handleArchiveBoard,
          onUnarchive: handleUnarchiveBoard,
          onDelete: handleDeleteBoard,
          onImportItems: handleImportItems,
          onGroupsRestored: handleGroupsRestored,
        },
        presence: active_view_type === "table" ? <PresenceAvatarStack board_id={board_id} /> : undefined,
        title_badge: filtered_title_badge,
      }}
      tabs={{
        tabs: view_tabs.tabs,
        active_view_id: view_tabs.active_view_id,
        onSelectView: view_tabs.selectView,
        // Adding, renaming, deleting and duplicating views changes the
        // board's structure, so those are only offered with structure access.
        onAddView: node.can_edit_structure ? handleAddView : undefined,
        view_type_options: BOARD_VIEW_TYPES,
        onRenameView: node.can_edit_structure ? handleRenameView : undefined,
        onChangeEmoji: handleChangeViewEmoji,
        onDeleteView: node.can_edit_structure ? handleDeleteView : undefined,
        onPinView: handlePinView,
        onDuplicateView: node.can_edit_structure ? handleDuplicateView : undefined,
        onLockView: handleLockView,
        getViewUrl: (tab) => (tab.is_primary ? `/boards/${board_id}` : `/boards/${board_id}/views/${tab.id}`),
        onReorderPersonalTabs: handleReorderPersonalTabs,
        has_personal_order: view_tabs.has_personal_order,
        onResetPersonalTabOrder: handleResetPersonalTabOrder,
        onToggleHiddenView: handleToggleHiddenView,
        onSetDefaultView: handleSetDefaultView,
        // A description is part of the board's structure, like the tab's name.
        onChangeDescription: node.can_edit_structure ? handleChangeViewDescription : undefined,
      }}
      toolbar={
        // A Doc, Files Gallery or Chart tab has no items/columns of its own to
        // search, filter or sort — the item-grid toolbar would be pure noise
        // above any of them (Files Gallery and Chart render their own
        // dedicated toolbar/config panel instead).
        active_view_type === "doc" || active_view_type === "file_gallery" || active_view_type === "chart" || active_view_type === "form" ? undefined : (
          <BoardToolbar
            toolbar={toolbar}
            onNewItem={handleNewItemAtTop}
            view_actions={toolbar_view_actions}
            saved_filter_actions={saved_filter_actions}
            export_options={export_options}
            onSubmitFeedback={(message) => boardOptionsService.submitFeedback(message, board_id)}
          />
        )
      }
      selectionBar={
        active_view_type === "table" && node.can_edit ? (
          <SelectionActionBar
            selected_count={selected_item_ids.length}
            groups={selection_move_targets}
            columns={table_base_columns}
            people={assignable_table_people}
            is_busy={is_bulk_action_busy}
            onDuplicate={handleBulkDuplicate}
            onMove={handleBulkMove}
            onEditColumn={(column_id, value) => void handleBulkEditColumn(column_id, value as BoardItemValue)}
            onArchive={handleBulkArchive}
            onDelete={handleBulkDelete}
            onClose={handleClearSelection}
          />
        ) : undefined
      }
    >
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
          onDuplicateGroup={handleDuplicateTableGroup}
          onDuplicateNode={handleDuplicateTableNode}
          onCreateBelow={handleCreateTableBelow}
          onMoveItemToGroup={handleMoveTableItemToGroup}
          onChangeNodeParent={handleChangeTableNodeParent}
          onArchiveNode={handleArchiveTableNode}
          onAddColumn={handleAddTableColumn}
          onDuplicateColumn={handleDuplicateTableColumn}
          onAddColumnRight={handleAddColumnRight}
          onRequestColumnFilter={handleRequestColumnFilter}
          onFilterByCellValue={handleFilterByCellValue}
          onRequestColumnPermissions={node.is_owner ? (column_id) => setPermissionsColumnId(Number(column_id)) : undefined}
          column_automation={node.can_edit ? column_automation : undefined}
          onRequestGroupByColumn={handleRequestGroupByColumn}
          onRequestColumnSort={handleRequestColumnSort}
          active_sort_column_id={active_sort_column_id}
          active_sort_direction={active_sort_direction}
          onSelectionChange={(ids) => setSelectedItemIds(ids.map(Number))}
          clear_selection_signal={selection_clear_signal}
        />
      ) : active_view_type === "kanban" ? (
        board_status_column ? (
          <>
            <BoardKanban<BoardItemDto>
              lanes={kanban_lanes}
              getRowId={(row) => String(row.id)}
              getRowTitle={(row) => row.name}
              renderCard={renderKanbanCard}
              isRowDone={isKanbanRowDone}
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
              onRecolorLane={handleRecolorKanbanLane}
              onDeleteLane={handleDeleteKanbanLane}
              onReorderLanes={handleReorderKanbanLanes}
              storage_key={`${board_id}:${view_tabs.active_view_id ?? "primary"}`}
            />
            <ConfirmActionModal
              is_open={kanban_card_confirm !== null}
              title={kanban_card_confirm?.kind === "delete" ? "Delete task" : "Archive task"}
              description={
                kanban_card_confirm?.kind === "delete"
                  ? "Are you sure you want to delete this task? Its subitems will be deleted too."
                  : "This task and its subitems will be hidden from the board. You can restore it later from the board's archive."
              }
              confirm_label={kanban_card_confirm?.kind === "delete" ? "Delete" : "Archive"}
              variant={kanban_card_confirm?.kind === "delete" ? "danger" : "neutral"}
              onClose={() => setKanbanCardConfirm(null)}
              onConfirm={handleConfirmKanbanCardAction}
            />
          </>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
              <KanbanViewIcon size={26} />
            </span>
            <h2 className="text-lg font-semibold text-shell-text">Set up your Kanban board</h2>
            <p className="text-[13.5px] text-shell-text-muted">
              Kanban lanes come from a Status column. Add one to start grouping cards into lanes.
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
        calendar_date_sources.length > 0 ? (
          <>
            <BoardCalendar<BoardItemDto>
              title={view_tabs.active_view?.label ?? "Calendar"}
              rows={calendar_rows}
              getRowId={getCalendarRowId}
              getRowTitle={getCalendarRowTitle}
              getRowEntries={getCalendarRowEntries}
              getRowColor={getCalendarRowColor}
              renderEvent={renderCalendarEvent}
              onSelectEvent={handleRowClick}
              selectedRowId={drawer.open_row_id}
              onChangeEntry={node.can_edit ? handleChangeCalendarEntry : undefined}
              onAddItem={node.can_edit ? (date) => void handleRequestCalendarItem(date) : undefined}
              pending_add_date={calendar_new_item?.date ?? null}
              config={calendar_config}
              onConfigChange={can_edit_calendar_settings ? handleChangeCalendarConfig : undefined}
              date_sources={calendar_date_sources}
              active_source_ids={calendar_active_source_ids}
              color_sources={calendar_color_sources}
              active_color_by={calendar_color_by}
              groups={calendar_groups}
              storage_key={`${board_id}:${view_tabs.active_view_id ?? "primary"}`}
            />
            <CalendarNewItemDialog
              draft_key={calendar_new_item?.key ?? null}
              groups={calendar_groups}
              initial_group_id={calendar_new_item_group_id}
              fields={calendar_new_item_fields}
              initial_values={calendar_new_item_values}
              people={roster_members}
              people_picker={{
                people: table_people,
                getNotifyOnAssignment: (column_id) => columns_by_id[column_id]?.config?.notify_on_assignment ?? true,
                onToggleNotifyOnAssignment: (column_id) => void handleToggleColumnNotifyOnAssignment(column_id),
              }}
              onAddOption={(column_id, option) => handleAddColumnOption(column_id, option)}
              onEditOptions={(column_id) => makeOptionActions(column_id)}
              onClose={closeCalendarNewItem}
              onCreate={handleCreateCalendarItem}
            />
          </>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
              <CalendarViewIcon size={26} />
            </span>
            <h2 className="text-lg font-semibold text-shell-text">Set up your Calendar</h2>
            <p className="text-[13.5px] text-shell-text-muted">
              Items land on the calendar through a Date or Timeline column. Add one to start placing items.
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
        gantt_source ? (
          <GanttChart<BoardItemDto>
            title={view_tabs.active_view?.label ?? "Gantt"}
            groups={gantt_groups}
            getRowId={getCalendarRowId}
            getRowName={getCalendarRowTitle}
            getRowRange={getGanttRowRange}
            getRowColor={getGanttRowColor}
            legend_items={gantt_legend_items}
            onRowClick={handleRowClick}
            selectedRowId={drawer.open_row_id}
            onDateChange={node.can_edit ? writeGanttRange : undefined}
            onRemoveDates={node.can_edit ? (row_id) => void handleUpdateCellValue(Number(row_id), gantt_source.id, null) : undefined}
            onDeleteRow={node.can_edit ? handleDeleteGanttRow : undefined}
            resizable={gantt_source.kind === "timeline"}
            getDependencyIds={board_dependency_column ? getGanttDependencyIds : undefined}
            getDependencyCandidates={board_dependency_column ? (row) => getDependencyCandidates(row, board_dependency_column.id) : undefined}
            onChangeDependencies={board_dependency_column && node.can_edit ? handleChangeGanttDependencies : undefined}
            onCascadeReschedule={board_dependency_column && node.can_edit && !is_gantt_scheduled_by_server ? handleGanttCascadeReschedule : undefined}
            config={gantt_config}
            onConfigChange={can_edit_gantt_settings ? handleChangeGanttConfig : undefined}
            date_sources={calendar_date_sources}
            active_source_id={gantt_source.id}
            color_sources={calendar_color_sources}
            active_color_by={gantt_color_by}
            group_options={gantt_group_options}
            onAddDependencyColumn={node.can_edit_structure ?? node.can_edit ? handleAddGanttDependencyColumn : undefined}
            current_user_name={current_user.name}
            storage_key={`${board_id}:${view_tabs.active_view_id ?? "primary"}`}
          />
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
              <GanttViewIcon size={26} />
            </span>
            <h2 className="text-lg font-semibold text-shell-text">Set up your Gantt view</h2>
            <p className="text-[13.5px] text-shell-text-muted">
              Gantt bars come from a Timeline or Date column. Add a Timeline column to start placing items on the timeline.
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
          board_id={board_id}
          onSaveDocContent={(doc_content) => view_tabs.updateDocContent(active_doc_view.id, doc_content)}
          onRenameView={node.can_edit_structure ? (label) => view_tabs.renameView(active_doc_view.id, label) : undefined}
          comments={discussion_drawer}
          share={{
            board_type,
            workspace_name: node.workspace.name,
            can_manage: node.can_manage,
            members: workspace_members,
            access,
            onAccessChange,
            edit_permission: board_edit_permission,
            onEditPermissionChange: (edit_permission) => setBoardEditPermission(edit_permission),
          }}
          is_header_collapsed={is_doc_header_collapsed}
          onToggleHeaderCollapsed={() => setIsDocHeaderCollapsed((current) => !current)}
          onUploadFile={(file) => boardDocService.uploadFile(board_id, file)}
          members={workspace_members}
          editable={node.permission_level === "full" || node.permission_level === "content"}
        />
      ) : active_view_type === "file_gallery" && active_doc_view ? (
        <BoardFileGalleryView board_id={board_id} view_id={active_doc_view.id} />
      ) : active_view_type === "chart" && view_tabs.active_view_id != null ? (
        <BoardChartView board_id={board_id} view_id={view_tabs.active_view_id} />
      ) : active_view_type === "form" && view_tabs.active_view_id != null ? (
        <BoardFormView board_id={board_id} view_id={view_tabs.active_view_id} can_edit={node.can_edit_structure ?? node.can_edit} />
      ) : (
        <BoardComingSoonView view_type={active_view_type} />
      )}

      {active_view_type === "kanban" ? (
        <KanbanItemModal<BoardItemDto>
          drawer={{ ...drawer, close: handleDrawerClose }}
          board_label={node.label}
          title={kanban_open_row?.name ?? ""}
          onRenameTitle={(name) => kanban_open_row && void handleRenameItem(kanban_open_row.id, name)}
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
          created_by={
            kanban_open_row_detail?.creator
              ? {
                  id: String(kanban_open_row_detail.creator.id),
                  full_name: kanban_open_row_detail.creator.full_name,
                  profile_photo_url: kanban_open_row_detail.creator.profile_photo_url,
                }
              : null
          }
          created_at={kanban_open_row_detail?.created_at ?? kanban_open_row?.created_at ?? null}
          group={
            kanban_open_row
              ? {
                  options: groups.map((group) => ({ id: String(group.id), label: group.name, color: group.accent_color })),
                  selected_id: String(kanban_open_row.group_id),
                  onSelect: kanban_open_row.parent_id === null ? (group_id) => void drawer.moveItemToGroup(group_id) : undefined,
                }
              : undefined
          }
          fields={
            kanban_open_row
              ? {
                  columns: kanban_item_fields,
                  people: roster_members,
                  people_picker: {
                    people: table_people,
                    getNotifyOnAssignment: (column_id) => columns_by_id[column_id]?.config?.notify_on_assignment ?? true,
                    onToggleNotifyOnAssignment: (column_id) => void handleToggleColumnNotifyOnAssignment(column_id),
                  },
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
          navigation={
            kanban_open_row_index >= 0
              ? {
                  index: kanban_open_row_index,
                  total: kanban_ordered_rows.length,
                  onPrevious: kanban_previous_row ? () => handleRowClick(kanban_previous_row) : undefined,
                  onNext: kanban_next_row ? () => handleRowClick(kanban_next_row) : undefined,
                }
              : undefined
          }
        />
      ) : (
        <BoardItemDrawer drawer={{ ...drawer, close: handleDrawerClose }} />
      )}

      {/* A Doc tab shows the board's discussion as its inline Comments panel instead. */}
      {!(active_view_type === "doc" && active_doc_view) && <BoardDiscussionDrawer drawer={discussion_drawer} />}

      <IntegrationsModal
        is_open={is_integrations_modal_open}
        onClose={handleCloseIntegrations}
        board_label={board_label}
        return_path={integrations_return_path}
        automation_tools={
          active_view_type === "table"
            ? {
                board_id,
                view_id: view_tabs.active_view_id,
                automations,
                columns: table_base_columns,
                people: assignable_table_people,
                items: automation_test_items,
                context: automation_context,
                onCreate: handleCreateAutomation,
                onToggle: handleToggleAutomation,
                onUpdate: handleUpdateAutomation,
                onDuplicate: handleDuplicateAutomation,
                onDelete: handleDeleteAutomation,
                onSaveAsTemplate: handleSaveAutomationTemplate,
                onOpenBoardAutomations: (edit_automation_id?: number) => {
                  handleCloseIntegrations();
                  openAutomationCenter(edit_automation_id);
                },
              }
            : undefined
        }
      />

      <AutomationsModal
        is_open={is_automations_modal_open}
        onClose={() => {
          setIsAutomationsModalOpen(false);
          setAutomationEditId(null);
          setAutomationColumnId(null);
          clearAutomationParam();
        }}
        board_id={board_id}
        view_id={view_tabs.active_view_id}
        board_label={board_label}
        return_path={integrations_return_path}
        automations={automations}
        columns={automation_columns}
        groups={selection_move_targets}
        people={assignable_table_people}
        edit_automation_id={automation_edit_id}
        create_for_column_id={automation_column_id}
        forms={automation_forms}
        test_items={automation_test_items}
        onReplaceAutomation={(updated) => setAutomations((current) => current.map((a) => (a.id === updated.id ? updated : a)))}
        onReloadAutomations={reloadAutomations}
        onCreate={handleCreateAutomation}
        onUpdate={handleUpdateAutomation}
        onToggle={handleToggleAutomation}
        onDuplicate={handleDuplicateAutomation}
        onDelete={handleDeleteAutomation}
        onOpenCommunicationTemplates={() => {
          setIsAutomationsModalOpen(false);
          setAutomationEditId(null);
          setIsIntegrationsModalOpen(true);
        }}
      />
      <ColumnPermissionsModal
        is_open={permissions_column_id !== null}
        onClose={() => setPermissionsColumnId(null)}
        board_id={board_id}
        column={columns.find((column) => column.id === permissions_column_id) ?? null}
        people={workspace_members}
        onSave={async (payload) => {
          if (permissions_column_id === null) return;
          const updated = await boardContentService.updateColumnPermissions(board_id, permissions_column_id, payload);
          setColumns((current) => current.map((column) => (column.id === updated.id ? updated : column)));
        }}
      />

      <ConfirmActionModal
        is_open={group_pending_delete !== null}
        variant="danger"
        title="Delete group"
        description={
          <>
            Delete <strong>{group_pending_delete?.name}</strong> from this board? This cannot be undone.
          </>
        }
        risk_items={[
          `${group_pending_delete?.item_count ?? 0} ${group_pending_delete?.item_count === 1 ? "item" : "items"} and all their subitems, updates and files will be deleted with it.`,
          "To keep them, use Archive group instead.",
        ]}
        confirm_label="Delete group"
        onConfirm={handleConfirmDeleteTableGroup}
        onClose={() => setGroupPendingDelete(null)}
      />
    </BoardShell>
  );
};
