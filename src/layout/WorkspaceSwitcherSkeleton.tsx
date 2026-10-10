import React from "react";

/**
 * Placeholder for {@link WorkspaceSwitcher} shown while the workspace catalog
 * is still loading and the active workspace hasn't been resolved yet (either
 * the initial fetch, or matching the account's remembered last-active
 * workspace against it). Mirrors the real trigger's exact dimensions so
 * nothing shifts once it's swapped in, and avoids flashing a stale/default
 * workspace name before the real one is known.
 */
const WorkspaceSwitcherSkeleton: React.FC = () => (
  <div className="flex gap-2" aria-hidden="true">
    <div className="flex h-10 flex-1 animate-pulse items-center gap-2 rounded-lg border border-sidebar-control-border bg-sidebar-panel pl-2 pr-2.5">
      <div className="h-6 w-6 flex-none rounded-md bg-sidebar-hover" />
      <div className="h-3.5 w-24 flex-1 rounded-full bg-sidebar-hover" />
    </div>
    <div className="h-10 w-10 flex-none animate-pulse rounded-lg border border-sidebar-control-border bg-sidebar-panel" />
  </div>
);

export default WorkspaceSwitcherSkeleton;
