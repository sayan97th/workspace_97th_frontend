import React from "react";
import { getBoardViewTypeOption } from "@/components/board/boardViewTypes";
import type { WorkspaceMonogramProps } from "@/components/personal/WorkspaceMonogram";
import { TeamsIcon } from "@/icons/workspace-icons";
import type { RecentBoardPreview, RecentBoardPreviewKind } from "@/types/personal";
import CalendarPreview from "./CalendarPreview";
import CanvasPreview from "./CanvasPreview";
import ChartPreview from "./ChartPreview";
import DashboardPreview from "./DashboardPreview";
import DocPreview from "./DocPreview";
import FilesPreview from "./FilesPreview";
import FormPreview from "./FormPreview";
import GanttPreview from "./GanttPreview";
import KanbanPreview from "./KanbanPreview";
import TablePreview from "./TablePreview";
import WorkloadPreview from "./WorkloadPreview";
import WorkspacePreview from "./WorkspacePreview";
import "./view-preview.scss";

/** Shown for a board whose preview has not been built (no tabs at all). */
const EMPTY_PREVIEW: RecentBoardPreview = { kind: "table", view_label: null, item_count: 0, group_count: 0, groups: [] };

/** Kinds that are a whole page, not a tab, so they get no tab chip. */
const PAGE_KINDS: RecentBoardPreviewKind[] = ["doc_page", "workspace"];

/** The frosted chip naming the previewed tab, with its view icon. */
const ViewChip: React.FC<{ kind: RecentBoardPreviewKind; label: string }> = ({ kind, label }) => {
  const Icon = kind === "workload" ? TeamsIcon : getBoardViewTypeOption(kind).Icon;
  return (
    <span className="vp-chip">
      <Icon size={12} />
      <span className="truncate">{label}</span>
    </span>
  );
};

type ViewPreviewProps = {
  preview: RecentBoardPreview | null;
  board_label: string;
  workspace: WorkspaceMonogramProps["workspace"];
};

/**
 * The thumbnail on a Home "Recently visited" card: a small live replica of the
 * tab the user last had open, drawn for its kind from the board's real data,
 * so the card shows what is inside before it is opened.
 */
const ViewPreview: React.FC<ViewPreviewProps> = ({ preview, board_label, workspace }) => {
  const data = preview ?? EMPTY_PREVIEW;

  const body = (() => {
    switch (data.kind) {
      case "kanban":
        return <KanbanPreview preview={data} />;
      case "gantt":
        return <GanttPreview preview={data} />;
      case "calendar":
        return <CalendarPreview preview={data} />;
      case "chart":
        return <ChartPreview preview={data} />;
      case "dashboard":
        return <DashboardPreview preview={data} />;
      case "workload":
        return <WorkloadPreview preview={data} />;
      case "canvas":
        return <CanvasPreview />;
      case "doc":
      case "doc_page":
        return <DocPreview preview={data} />;
      case "form":
        return <FormPreview preview={data} fallback_title={board_label} />;
      case "file_gallery":
        return <FilesPreview preview={data} />;
      case "workspace":
        return <WorkspacePreview preview={data} workspace={workspace} />;
      default:
        return <TablePreview preview={data} />;
    }
  })();

  return (
    <div className="vp" data-kind={data.kind} aria-hidden="true">
      {body}
      {data.view_label && !PAGE_KINDS.includes(data.kind) && <ViewChip kind={data.kind} label={data.view_label} />}
    </div>
  );
};

export default ViewPreview;
