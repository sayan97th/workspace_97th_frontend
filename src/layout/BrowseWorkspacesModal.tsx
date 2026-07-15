"use client";
import React, { useEffect, useMemo, useState } from "react";
import WorkspaceCard from "./WorkspaceCard";
import WorkspaceEmptyState from "./WorkspaceEmptyState";
import {
  BrowseAllIcon,
  ClockIcon,
  CloseIcon,
  CollaboratorsIcon,
  CrownIcon,
  FilterIcon,
  MemberIcon,
  PlusIcon,
  SearchIcon,
  type IconComponent,
} from "@/icons/workspace-icons";
import {
  browse_tab_empty_titles,
  browse_tab_titles,
  browse_workspaces as default_browse_workspaces,
  filterBrowseWorkspaces,
  type BrowseWorkspace,
  type WorkspaceBrowseTab,
} from "@/data/workspace-browse-data";

type BrowseWorkspacesModalProps = {
  is_open: boolean;
  onClose: () => void;
  workspaces?: BrowseWorkspace[];
  onSelectWorkspace?: (workspace: BrowseWorkspace) => void;
  onCreateWorkspace?: () => void;
};

type NavTab = { key: WorkspaceBrowseTab; label: string; icon: IconComponent };

/** Primary tabs shown above the "MY WORKSPACES" divider. */
const PRIMARY_TABS: NavTab[] = [
  { key: "all", label: "All workspaces", icon: BrowseAllIcon },
  { key: "recent", label: "Recent workspaces", icon: ClockIcon },
];

/** Membership tabs shown under the "MY WORKSPACES" divider. */
const MEMBERSHIP_TABS: NavTab[] = [
  { key: "owner", label: "Owner", icon: CrownIcon },
  { key: "member", label: "Member", icon: MemberIcon },
  { key: "collaborator", label: "Collaborator", icon: CollaboratorsIcon },
];

type NavItemProps = {
  tab: NavTab;
  is_active: boolean;
  onSelect: (key: WorkspaceBrowseTab) => void;
};

const NavItem: React.FC<NavItemProps> = ({ tab, is_active, onSelect }) => {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(tab.key)}
      className={`flex items-center gap-[11px] rounded-[9px] px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors ${
        is_active
          ? "bg-brand-500 text-white"
          : "text-gray-200 hover:bg-shell-hover"
      }`}
    >
      <Icon size={15} />
      {tab.label}
    </button>
  );
};

/**
 * Full-screen "Browse all workspaces" modal reachable from the sidebar
 * switcher. Left nav filters the catalog by membership; the header search
 * filters within the active tab. Data and actions are injected via props so the
 * modal can be reused with live workspaces from the API.
 */
const BrowseWorkspacesModal: React.FC<BrowseWorkspacesModalProps> = ({
  is_open,
  onClose,
  workspaces = default_browse_workspaces,
  onSelectWorkspace,
  onCreateWorkspace,
}) => {
  const [active_tab, setActiveTab] = useState<WorkspaceBrowseTab>("all");
  const [query, setQuery] = useState("");

  // Reset transient state each time the modal is opened.
  useEffect(() => {
    if (is_open) {
      setActiveTab("all");
      setQuery("");
    }
  }, [is_open]);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
    };
  }, [is_open, onClose]);

  const results = useMemo(
    () => filterBrowseWorkspaces(workspaces, active_tab, query),
    [workspaces, active_tab, query]
  );

  if (!is_open) return null;

  const handleSelect = (workspace: BrowseWorkspace) => {
    onSelectWorkspace?.(workspace);
    onClose();
  };

  const handleCreate = () => {
    onCreateWorkspace?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Browse all workspaces"
      className="fixed inset-0 z-[400]"
    >
      <div
        className="absolute inset-0 bg-[#060e0e]/60"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-3.5 z-[401] flex flex-col overflow-hidden rounded-2xl border border-shell-border bg-shell-panel-alt text-shell-text shadow-[0_34px_80px_rgba(0,0,0,0.55)]">
        {/* Header bar */}
        <div className="flex h-[66px] flex-none items-center gap-5 border-b border-shell-border px-[22px]">
          <span className="whitespace-nowrap text-[19px] font-bold tracking-[-0.01em]">
            Browse all workspaces
          </span>
          <div className="flex flex-1 justify-center">
            <div className="flex w-full max-w-[420px] items-center gap-2.5 rounded-[9px] border border-shell-border-strong bg-shell-bg px-3.5 py-2.5">
              <SearchIcon size={14} className="flex-none text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for a workspace"
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-[13.5px] text-gray-100 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-[7px] rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-gray-200 transition-colors hover:bg-shell-hover"
          >
            <FilterIcon size={15} />
            Filter
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-shell-hover hover:text-gray-100"
            aria-label="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Left nav */}
          <div className="flex w-[238px] flex-none flex-col gap-[3px] border-r border-shell-border p-[18px_14px]">
            {PRIMARY_TABS.map((tab) => (
              <NavItem
                key={tab.key}
                tab={tab}
                is_active={active_tab === tab.key}
                onSelect={setActiveTab}
              />
            ))}

            <div className="px-3 pb-[7px] pt-4 font-mono-accent text-[11px] uppercase tracking-[0.05em] text-gray-400">
              My workspaces
            </div>

            {MEMBERSHIP_TABS.map((tab) => (
              <NavItem
                key={tab.key}
                tab={tab}
                is_active={active_tab === tab.key}
                onSelect={setActiveTab}
              />
            ))}

            <button
              type="button"
              onClick={handleCreate}
              className="mt-3.5 flex items-center gap-2.5 rounded-[9px] bg-shell-hover px-3 py-2.5 text-[13px] font-medium text-gray-400 transition-colors hover:bg-shell-hover hover:text-gray-200"
            >
              <PlusIcon size={15} />
              Create workspace
            </button>
          </div>

          {/* Content */}
          <div className="shell-scrollbar min-w-0 flex-1 overflow-y-auto px-10 py-[34px]">
            <h2 className="mb-[26px] text-[30px] font-light tracking-[-0.01em] text-gray-50">
              {browse_tab_titles[active_tab]}
            </h2>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {results.map((workspace) => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            ) : (
              <WorkspaceEmptyState title={browse_tab_empty_titles[active_tab]} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseWorkspacesModal;
