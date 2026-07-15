"use client";
import React, { useState } from "react";
import { BoardShell, ChangeBoardTypeModal, type BoardHeaderInfo } from "@/components/board";
import { ChevronRightIcon, FolderIcon } from "@/icons/workspace-icons";
import { workspaceService } from "@/services/workspace.service";
import type { BoardType, WorkspaceNavNode } from "@/types/workspace";

export type WorkspaceViewProps = {
  /** The navigation node whose view is being rendered. */
  node: WorkspaceNavNode;
  /** Human-readable labels from the workspace root down to this node. */
  breadcrumb: string[];
  workspace_slug: string;
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
 *
 * Owns the "Board type" edit round-trip: the info popover's row opens
 * {@link ChangeBoardTypeModal}, which PATCHes the nav item and updates local
 * state optimistically so the popover reflects the new type immediately.
 */
const GenericBoardView: React.FC<WorkspaceViewProps> = ({ node, breadcrumb, workspace_slug }) => {
  const [board_type, setBoardType] = useState<BoardType>(node.board_type);
  const [is_change_type_open, setIsChangeTypeOpen] = useState(false);

  const handleChangeBoardType = async (next_board_type: BoardType) => {
    await workspaceService.updateNavItem(workspace_slug, node.id, { board_type: next_board_type });
    setBoardType(next_board_type);
  };

  return (
    <BoardShell
      header={{
        title: node.label,
        is_favorite: node.is_favorite,
        invite_count: 0,
        info: buildBoardInfo(node, board_type, () => setIsChangeTypeOpen(true)),
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

      <ChangeBoardTypeModal
        is_open={is_change_type_open}
        initial_board_type={board_type}
        onSubmit={handleChangeBoardType}
        onClose={() => setIsChangeTypeOpen(false)}
      />
    </BoardShell>
  );
};

export default GenericBoardView;
