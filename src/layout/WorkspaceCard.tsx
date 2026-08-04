"use client";
import React from "react";
import WorkspaceBadge from "./WorkspaceBadge";
import WorkspaceOptionsButton from "@/components/workspace-nav/WorkspaceOptionsButton";
import type { BrowseWorkspace } from "@/data/workspace-browse-data";
import type { UpdateWorkspacePayload } from "@/types/workspace";

/** Surface color of a browse card — the home-glyph notch blends into it. */
const CARD_SURFACE = "#0e1d1d";

const OPTIONS_TRIGGER_CLASS =
  "flex h-7 w-7 flex-none items-center justify-center rounded-md text-shell-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-shell-hover hover:text-shell-text";

type WorkspaceCardProps = {
  workspace: BrowseWorkspace;
  onSelect?: (workspace: BrowseWorkspace) => void;
  /** When provided, the card renders a "…" options button (Rename / Change type / Leave / Delete) for workspaces the current user is a member of. */
  updateWorkspace?: (
    workspace_slug: string,
    payload: UpdateWorkspacePayload
  ) => Promise<BrowseWorkspace>;
  leaveWorkspace?: (workspace_slug: string) => Promise<void>;
  deleteWorkspace?: (workspace_slug: string) => Promise<void>;
};

/**
 * A single workspace entry in the browse grid: colored badge, name, product
 * label with the three status dots, and (when present) the membership role
 * plus a hover-revealed "…" options button. Reusable anywhere a workspace
 * needs to be shown as a selectable card.
 *
 * Rendered as a `div[role=button]` rather than a `<button>` so it can nest
 * the options trigger's own `<button>` without invalid button-in-button markup.
 */
const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
  workspace,
  onSelect,
  updateWorkspace,
  leaveWorkspace,
  deleteWorkspace,
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onSelect?.(workspace)}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect?.(workspace);
      }
    }}
    className="group flex cursor-pointer items-center gap-3.5 rounded-xl border border-shell-border bg-shell-bg px-5 py-4 text-left transition-colors duration-150 hover:border-brand-500/55 hover:bg-shell-panel-alt"
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
    {updateWorkspace && leaveWorkspace && deleteWorkspace && (
      <WorkspaceOptionsButton
        workspace={workspace}
        updateWorkspace={updateWorkspace}
        leaveWorkspace={leaveWorkspace}
        deleteWorkspace={deleteWorkspace}
        trigger_class_name={OPTIONS_TRIGGER_CLASS}
        icon_size={16}
      />
    )}
  </div>
);

export default WorkspaceCard;
