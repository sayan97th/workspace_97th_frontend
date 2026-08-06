import {
  CalendarViewIcon,
  CanvasViewIcon,
  ChartViewIcon,
  FormViewIcon,
  GanttViewIcon,
  KanbanViewIcon,
  TableViewIcon,
} from "@/icons/board-icons";
import { BoardGridIcon, DashboardIcon, FileIcon, type IconComponent } from "@/icons/workspace-icons";

/**
 * The canonical set of board view ("tab") kinds. Kept here (in the generic
 * board kit) so both the presentational picker and the engine's API layer
 * (`@/types/board-content`, which re-exports this as `BoardViewDto.view_type`)
 * share a single source of truth without a circular import — mirrors
 * {@link import("./columnTypes").BoardColumnKind}'s role for column types.
 *
 * Must stay in sync with the backend's `App\Enums\BoardViewType`.
 */
export type BoardViewKind =
  | "table"
  | "kanban"
  | "gantt"
  | "chart"
  | "calendar"
  | "canvas"
  | "doc"
  | "file_gallery"
  | "form"
  | "dashboard";

/** A view kind offered from the "+" (Board views) picker on a board's tab bar. */
export type BoardViewTypeOption = {
  kind: BoardViewKind;
  label: string;
  description: string;
  Icon: IconComponent;
  /**
   * Whether {@link import("../workspace-nav/view-registry").getBoardViewBodyComponent}
   * has a real, purpose-built renderer for this kind. Kinds without one still
   * create fine (the categorization exists so a workspace can plan its boards
   * around them) but render a "Coming soon" placeholder tab until a dedicated
   * component is built for them.
   */
  is_available: boolean;
};

/**
 * The ordered list of view kinds the "+" tab-bar picker offers, matching
 * Monday's own "Board views" menu. `table` and `kanban` are fully
 * implemented; the rest are reserved categories a board can already be
 * planned around (see {@link BoardViewTypeOption.is_available}).
 */
export const BOARD_VIEW_TYPES: BoardViewTypeOption[] = [
  {
    kind: "table",
    label: "Table",
    description: "Classic grid of items, grouped into tables",
    Icon: TableViewIcon,
    is_available: true,
  },
  {
    kind: "kanban",
    label: "Kanban",
    description: "Cards in lanes, grouped by a status column",
    Icon: KanbanViewIcon,
    is_available: true,
  },
  {
    kind: "doc",
    label: "Doc",
    description: "A collaborative document",
    Icon: FileIcon,
    is_available: true,
  },
  {
    kind: "gantt",
    label: "Gantt",
    description: "Plan timelines and dependencies",
    Icon: GanttViewIcon,
    is_available: false,
  },
  {
    kind: "chart",
    label: "Chart",
    description: "Visualize your data as a chart",
    Icon: ChartViewIcon,
    is_available: false,
  },
  {
    kind: "calendar",
    label: "Calendar",
    description: "See items laid out across a calendar",
    Icon: CalendarViewIcon,
    is_available: true,
  },
  {
    kind: "canvas",
    label: "Canvas",
    description: "A freeform space to brainstorm and sketch",
    Icon: CanvasViewIcon,
    is_available: false,
  },
  {
    kind: "file_gallery",
    label: "File gallery",
    description: "Browse every file attached to this board",
    Icon: BoardGridIcon,
    is_available: true,
  },
  {
    kind: "form",
    label: "Form",
    description: "Collect submissions into this board",
    Icon: FormViewIcon,
    is_available: false,
  },
  {
    kind: "dashboard",
    label: "Dashboard",
    description: "Combine widgets from across your boards",
    Icon: DashboardIcon,
    is_available: false,
  },
];

const BOARD_VIEW_TYPE_BY_KIND: Record<BoardViewKind, BoardViewTypeOption> = Object.fromEntries(
  BOARD_VIEW_TYPES.map((option) => [option.kind, option])
) as Record<BoardViewKind, BoardViewTypeOption>;

/** Resolves a view kind to its picker metadata, falling back to `table` for any unrecognized value. */
export const getBoardViewTypeOption = (kind: BoardViewKind | string | null | undefined): BoardViewTypeOption =>
  (kind && BOARD_VIEW_TYPE_BY_KIND[kind as BoardViewKind]) || BOARD_VIEW_TYPE_BY_KIND.table;
