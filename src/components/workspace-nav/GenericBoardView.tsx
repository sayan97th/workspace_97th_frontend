"use client";
import React from "react";
import { BoardShell, type BoardHeaderInfo } from "@/components/board";
import { ChevronRightIcon, FolderIcon } from "@/icons/workspace-icons";
import type { WorkspaceNavNode } from "@/types/workspace";

export type WorkspaceViewProps = {
  /** The navigation node whose view is being rendered. */
  node: WorkspaceNavNode;
  /** Human-readable labels from the workspace root down to this node. */
  breadcrumb: string[];
  workspace_slug: string;
};

const DISPLAY_STYLE_LABELS: Record<string, string> = {
  table: "Table view",
  kanban: "Kanban view",
  list: "List view",
  calendar: "Calendar view",
};

/** Resolves a node into the "Board info" popover content shown from its header chevron. */
const buildBoardInfo = (node: WorkspaceNavNode): BoardHeaderInfo => ({
  description: node.description,
  view_type: (node.display_style && DISPLAY_STYLE_LABELS[node.display_style]) || "Table view",
  owners: "No owners assigned",
  created_by: node.creator?.full_name ?? null,
  created_at: node.created_at
    ? new Date(node.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null,
  notifications: "Everything",
});

/**
 * Fallback view for any leaf that doesn't yet have a bespoke component in the
 * view registry. Renders inside the shared board shell so newly-seeded or
 * user-created views immediately look at home, with an empty-state body.
 */
const GenericBoardView: React.FC<WorkspaceViewProps> = ({ node, breadcrumb }) => (
  <BoardShell
    header={{
      title: node.label,
      is_favorite: node.is_favorite,
      invite_count: 0,
      info: buildBoardInfo(node),
    }}
    tabs={{ primary_label: "Main table", views: [] }}
  >
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
        <FolderIcon size={26} />
      </span>
      <h2 className="text-lg font-semibold text-shell-text">{node.label}</h2>
      {breadcrumb.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1 text-[12.5px] text-shell-text-muted">
          {breadcrumb.map((crumb, index) => (
            <span key={`${crumb}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRightIcon size={10} />}
              {crumb}
            </span>
          ))}
        </div>
      )}
      <p className="text-[13.5px] text-shell-text-muted">
        This view doesn&rsquo;t have any content yet. It&rsquo;s wired to the
        workspace navigation and ready to be built out.
      </p>
    </div>
  </BoardShell>
);

export default GenericBoardView;
