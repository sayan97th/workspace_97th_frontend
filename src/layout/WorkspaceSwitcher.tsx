"use client";
import React, { useEffect, useMemo, useState } from "react";
import WorkspaceBadge from "./WorkspaceBadge";
import {
  BrowseAllIcon,
  ChevronDownIcon,
  PlusIcon,
  SearchIcon,
} from "@/icons/workspace-icons";
import {
  active_workspace as default_active_workspace,
  my_workspaces as default_my_workspaces,
  recent_workspaces as default_recent_workspaces,
  type WorkspaceSummary,
} from "@/data/workspace-switcher-data";

type WorkspaceSwitcherProps = {
  active_workspace?: WorkspaceSummary;
  recent_workspaces?: WorkspaceSummary[];
  my_workspaces?: WorkspaceSummary[];
  onSelectWorkspace?: (workspace: WorkspaceSummary) => void;
  onAddWorkspace?: () => void;
  onBrowseAll?: () => void;
};

/**
 * Surface color of the open dropdown panel — badge notches blend into it.
 * Reads the live `--color-shell-panel` CSS variable so the "cut-out" notch
 * keeps matching its background across the Light/Dark/System default themes.
 */
const DROPDOWN_SURFACE = "var(--color-shell-panel)";
const TRIGGER_SURFACE = "var(--color-shell-panel-alt)";

const filterWorkspaces = (list: WorkspaceSummary[], query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return list;
  return list.filter((workspace) =>
    workspace.name.toLowerCase().includes(normalized)
  );
};

type WorkspaceRowProps = {
  workspace: WorkspaceSummary;
  is_active: boolean;
  onSelect: (workspace: WorkspaceSummary) => void;
};

const WorkspaceRow: React.FC<WorkspaceRowProps> = ({ workspace, is_active, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(workspace)}
    className={`flex w-full items-center gap-[11px] rounded-[9px] px-2.5 py-2.5 text-left transition-colors hover:bg-shell-hover ${
      is_active ? "bg-shell-hover" : ""
    }`}
  >
    <WorkspaceBadge workspace={workspace} size={26} notchColor={DROPDOWN_SURFACE} />
    <span className="flex-1 truncate text-sm font-medium text-shell-text">
      {workspace.name}
    </span>
  </button>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-1.5 pb-1.5 pt-3.5 font-mono-accent text-[11px] uppercase tracking-[0.05em] text-shell-text-muted">
    {children}
  </div>
);

/**
 * Sidebar workspace chip plus its switcher dropdown. Renders the active
 * workspace chip alongside a "new workspace" button; clicking the chip opens a
 * searchable list of recent and owned workspaces. Data and actions are injected
 * via props so the same switcher can be reused elsewhere (e.g. the top bar).
 */
const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  active_workspace = default_active_workspace,
  recent_workspaces = default_recent_workspaces,
  my_workspaces = default_my_workspaces,
  onSelectWorkspace,
  onAddWorkspace,
  onBrowseAll,
}) => {
  const [is_open, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered_recent = useMemo(
    () => filterWorkspaces(recent_workspaces, query),
    [recent_workspaces, query]
  );
  const filtered_mine = useMemo(
    () => filterWorkspaces(my_workspaces, query),
    [my_workspaces, query]
  );
  const has_no_results =
    query.trim().length > 0 &&
    filtered_recent.length === 0 &&
    filtered_mine.length === 0;

  const closeDropdown = () => {
    setIsOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDropdown();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open]);

  const handleSelect = (workspace: WorkspaceSummary) => {
    onSelectWorkspace?.(workspace);
    closeDropdown();
  };

  const handleAddWorkspace = () => {
    onAddWorkspace?.();
    closeDropdown();
  };

  const handleBrowseAll = () => {
    onBrowseAll?.();
    closeDropdown();
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={is_open}
          className={`flex flex-1 items-center gap-2.5 rounded-[10px] border bg-shell-panel-alt px-3 py-2.5 text-left transition-colors hover:border-brand-500/60 ${
            is_open ? "border-brand-500/60" : "border-shell-border-strong"
          }`}
        >
          <WorkspaceBadge workspace={active_workspace} size={24} notchColor={TRIGGER_SURFACE} />
          <span className="flex-1 truncate text-sm font-semibold text-shell-text">
            {active_workspace.name}
          </span>
          <ChevronDownIcon
            size={12}
            className={`flex-none text-shell-text-muted transition-transform duration-150 ${
              is_open ? "rotate-180" : ""
            }`}
          />
        </button>
        <button
          type="button"
          onClick={handleAddWorkspace}
          className="flex w-[42px] flex-none items-center justify-center rounded-[10px] border border-shell-border-strong bg-shell-panel-alt text-shell-text transition-colors hover:border-brand-500/60"
          aria-label="New workspace"
        >
          <PlusIcon />
        </button>
      </div>

      {is_open && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={closeDropdown} />
          <div
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-[120] rounded-xl border border-shell-border-strong bg-shell-panel p-2.5 shadow-2xl"
            role="listbox"
          >
            <div className="flex items-center gap-2.5 rounded-[9px] border border-shell-border-strong bg-shell-hover px-3 py-2.5">
              <SearchIcon size={14} className="flex-none text-shell-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for a workspace"
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-sm text-shell-text placeholder:text-shell-text-muted focus:outline-none"
              />
            </div>

            {filtered_recent.length > 0 && (
              <>
                <SectionLabel>Recent workspaces</SectionLabel>
                {filtered_recent.map((workspace) => (
                  <WorkspaceRow
                    key={`recent-${workspace.id}`}
                    workspace={workspace}
                    is_active={workspace.id === active_workspace.id}
                    onSelect={handleSelect}
                  />
                ))}
              </>
            )}

            {filtered_mine.length > 0 && (
              <>
                <SectionLabel>My workspaces</SectionLabel>
                {filtered_mine.map((workspace) => (
                  <WorkspaceRow
                    key={`mine-${workspace.id}`}
                    workspace={workspace}
                    is_active={workspace.id === active_workspace.id}
                    onSelect={handleSelect}
                  />
                ))}
              </>
            )}

            {has_no_results && (
              <div className="px-2.5 py-6 text-center text-sm text-shell-text-muted">
                No workspaces match &ldquo;{query.trim()}&rdquo;
              </div>
            )}

            <div className="mt-2.5 flex items-center gap-2 border-t border-shell-border pt-2.5">
              <button
                type="button"
                onClick={handleAddWorkspace}
                className="flex flex-1 items-center justify-center gap-2 rounded-[9px] px-2.5 py-2.5 text-sm font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover"
              >
                <PlusIcon size={14} />
                Add workspace
              </button>
              <button
                type="button"
                onClick={handleBrowseAll}
                className="flex flex-1 items-center justify-center gap-2 rounded-[9px] px-2.5 py-2.5 text-sm font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover"
              >
                <BrowseAllIcon size={14} />
                Browse all
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
