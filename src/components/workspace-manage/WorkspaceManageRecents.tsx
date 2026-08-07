"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { workspaceService } from "@/services/workspace.service";
import { buildBoardPath } from "@/components/workspace-nav/helpers";
import type { BoardViewSummary } from "@/types/workspace";
import { FileIcon } from "@/icons/workspace-icons";
import { formatShortDate } from "./creatorAvatar";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";

export type WorkspaceManageRecentsProps = {
  workspace_slug: string;
};

/**
 * Manage Workspace's "Recents" tab: the most recently created board views
 * (tabs) inside this workspace, newest first.
 */
const WorkspaceManageRecents: React.FC<WorkspaceManageRecentsProps> = ({ workspace_slug }) => {
  const router = useRouter();
  const [views, setViews] = useState<BoardViewSummary[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    workspaceService
      .getRecentBoardViews(workspace_slug)
      .then((data) => {
        if (!cancelled) setViews(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load recent activity.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspace_slug]);

  if (is_loading) return <BoardLoadingSpinner />;
  if (error) return <CenteredMessage title="Something went wrong" detail={error} />;

  if (views.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 font-mono-accent text-[13px] tracking-[0.04em] text-shell-text-muted">
        [ no recent activity yet ]
      </div>
    );
  }

  return (
    <div className="mt-2.5 pb-[60px]">
      {views.map((view, index) => (
        <button
          key={view.id}
          type="button"
          onClick={() => view.board && router.push(`${buildBoardPath(view.board.id)}?view_id=${view.id}`)}
          className={`flex w-full items-center gap-3.5 rounded-lg px-2 py-[15px] text-left hover:bg-shell-hover ${
            index < views.length - 1 ? "border-b border-shell-border" : ""
          }`}
        >
          <span className="flex flex-none text-shell-text-muted">
            <FileIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium text-shell-text">{view.label}</span>
            <span className="block truncate text-[12.5px] text-shell-text-faint">
              {view.board?.label}
              {view.creator ? ` · Created by ${view.creator.full_name}` : ""}
            </span>
          </span>
          <span className="flex-none text-[12.5px] text-shell-text-muted">{formatShortDate(view.created_at)}</span>
        </button>
      ))}
    </div>
  );
};

export default WorkspaceManageRecents;
