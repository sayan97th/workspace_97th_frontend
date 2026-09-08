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
    <div className="flex flex-1 animate-pulse items-center gap-2.5 rounded-[10px] border border-shell-border-strong bg-shell-panel-alt px-3 py-2.5">
      <div className="h-6 w-6 flex-none rounded-md bg-shell-hover" />
      <div className="h-3.5 w-24 flex-1 rounded-full bg-shell-hover" />
    </div>
    <div className="h-[42px] w-[42px] flex-none animate-pulse rounded-[10px] border border-shell-border-strong bg-shell-panel-alt" />
  </div>
);

export default WorkspaceSwitcherSkeleton;
