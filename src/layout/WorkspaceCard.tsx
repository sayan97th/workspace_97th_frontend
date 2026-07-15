"use client";
import React from "react";
import WorkspaceBadge from "./WorkspaceBadge";
import type { BrowseWorkspace } from "@/data/workspace-browse-data";

/** Surface color of a browse card — the home-glyph notch blends into it. */
const CARD_SURFACE = "#0e1d1d";

type WorkspaceCardProps = {
  workspace: BrowseWorkspace;
  onSelect?: (workspace: BrowseWorkspace) => void;
};

/**
 * A single workspace entry in the browse grid: colored badge, name, product
 * label with the three status dots, and (when present) the membership role.
 * Reusable anywhere a workspace needs to be shown as a selectable card.
 */
const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ workspace, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect?.(workspace)}
    className="group flex items-center gap-3.5 rounded-xl border border-shell-border bg-shell-bg px-5 py-4 text-left transition-colors duration-150 hover:border-brand-500/55 hover:bg-shell-panel-alt"
  >
    <WorkspaceBadge workspace={workspace} size={40} notchColor={CARD_SURFACE} />
    <div className="min-w-0 flex-1">
      <div className="truncate text-[15px] font-semibold text-shell-text">
        {workspace.name}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-shell-text-muted">
        <span className="flex gap-0.5">
          <span className="h-[5px] w-[5px] rounded-full bg-brand-500" />
          <span className="h-[5px] w-[5px] rounded-full bg-brand-500" />
          <span className="h-[5px] w-[5px] rounded-full bg-brand-500" />
        </span>
        {workspace.product}
      </div>
    </div>
    {workspace.role && (
      <span className="flex-none text-[13px] font-medium text-shell-text-secondary">
        {workspace.role}
      </span>
    )}
  </button>
);

export default WorkspaceCard;
