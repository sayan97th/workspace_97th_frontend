import { TableViewIcon } from "@/icons/board-icons";
import {
  BoardGridIcon,
  ChatBubbleIcon,
  ClockIcon,
  DashboardIcon,
  FileIcon,
  FolderIcon,
  type IconComponent,
  PersonIcon,
  PortfolioIcon,
  ProjectManagementIcon,
  StarIcon,
  TemplateIcon,
  WorkflowIcon,
} from "@/icons/workspace-icons";

export type BoardViewIconOption = {
  id: string;
  label: string;
  Icon: IconComponent;
};

/**
 * The curated set of icons a tab can be assigned, keyed by the id saved on
 * `BoardViewDto.icon` (`board_views.icon` on the backend). Any board's view
 * tabs (Client Hub's real ones, or the generic `TableBoardView` engine's)
 * pick from this same list via {@link BoardViewIconPicker} — one registry, so
 * a new icon only has to be added here to be usable everywhere.
 */
export const BOARD_VIEW_ICON_OPTIONS: BoardViewIconOption[] = [
  { id: "table", label: "Table", Icon: TableViewIcon },
  { id: "chart", label: "Chart", Icon: DashboardIcon },
  { id: "clock", label: "Timeline", Icon: ClockIcon },
  { id: "person", label: "Person", Icon: PersonIcon },
  { id: "star", label: "Star", Icon: StarIcon },
  { id: "folder", label: "Folder", Icon: FolderIcon },
  { id: "file", label: "File", Icon: FileIcon },
  { id: "chat", label: "Chat", Icon: ChatBubbleIcon },
  { id: "grid", label: "Grid", Icon: BoardGridIcon },
  { id: "workflow", label: "Workflow", Icon: WorkflowIcon },
  { id: "project", label: "Project", Icon: ProjectManagementIcon },
  { id: "portfolio", label: "Portfolio", Icon: PortfolioIcon },
  { id: "template", label: "Template", Icon: TemplateIcon },
];

const BOARD_VIEW_ICON_BY_ID: Record<string, BoardViewIconOption> = Object.fromEntries(
  BOARD_VIEW_ICON_OPTIONS.map((option) => [option.id, option])
);

/** Resolves a saved icon id to its component, or null when unset/unrecognized. */
export const getBoardViewIcon = (icon_id: string | null | undefined): IconComponent | null =>
  (icon_id && BOARD_VIEW_ICON_BY_ID[icon_id]?.Icon) || null;
