"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { workspaceService } from "@/services/workspace.service";
import { buildBoardPath } from "@/components/workspace-nav/helpers";
import type { WorkspaceContentItem } from "@/types/workspace";
import { FileIcon } from "@/icons/workspace-icons";
import { formatShortDate } from "./creatorAvatar";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";

export type WorkspaceManageRecentsProps = {
  workspace_slug: string;
};

/**
 * Manage Workspace's "Recents" tab: the boards/docs most recently created
 * inside this workspace, newest first — the same rows the sidebar renders,
 * not a board's internal views/tabs.
 */
const WorkspaceManageRecents: React.FC<WorkspaceManageRecentsProps> = ({ workspace_slug }) => {
  const router = useRouter();
  const [items, setItems] = useState<WorkspaceContentItem[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    workspaceService
      .getRecentContentItems(workspace_slug)
      .then((data) => {
        if (!cancelled) setItems(data);
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

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-[14px] text-shell-text-secondary">
        No recent activity yet
      </div>
    );
  }

  return (
    <div className="mt-4 pb-10">
      {items.map((item, index) => {
        const folder = item.folder_path.map((crumb) => crumb.label).join(" / ");
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(buildBoardPath(item.id))}
            className={`flex w-full items-center gap-3.5 rounded-lg px-2 py-[15px] text-left hover:bg-shell-hover ${
              index < items.length - 1 ? "border-b border-shell-border" : ""
            }`}
          >
            <span className="flex flex-none text-shell-text-muted">
              <FileIcon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] text-shell-text">{item.label}</span>
              {(folder || item.creator) && (
                <span className="block truncate text-[13px] text-shell-text-secondary">
                  {folder}
                  {folder && item.creator ? " · " : ""}
                  {item.creator ? `Created by ${item.creator.full_name}` : ""}
                </span>
              )}
            </span>
            <span className="flex-none text-[14px] text-shell-text-secondary">{formatShortDate(item.created_at)}</span>
          </button>
        );
      })}
    </div>
  );
};

export default WorkspaceManageRecents;
