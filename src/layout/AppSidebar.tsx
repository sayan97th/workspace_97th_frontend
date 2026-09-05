"use client";
import React, { useState } from "react";
import { useSidebar } from "../context/SidebarContext";
import { useWorkspaces } from "@/context/WorkspaceContext";
import useWorkspaceNav from "@/components/workspace-nav/useWorkspaceNav";
import NavTree from "@/components/workspace-nav/NavTree";
import WorkspaceOptionsButton from "@/components/workspace-nav/WorkspaceOptionsButton";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import BrowseWorkspacesModal from "./BrowseWorkspacesModal";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import type { BrowseWorkspace } from "@/data/workspace-browse-data";
import {
  CollapseSidebarIcon,
  ExpandSidebarIcon,
  MoreDotsIcon,
  SearchIcon,
} from "@/icons/workspace-icons";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const workspaces_api = useWorkspaces();
  const {
    workspaces,
    active_workspace,
    active_workspace_slug,
    recent_workspaces,
    my_workspaces,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    leaveWorkspace,
    deleteWorkspace,
  } = workspaces_api;

  const nav = useWorkspaceNav(active_workspace_slug);

  const [is_browse_open, setIsBrowseOpen] = useState(false);
  const [is_create_open, setIsCreateOpen] = useState(false);

  const handleCreateWorkspace = async (workspace: BrowseWorkspace) => {
    await createWorkspace({
      name: workspace.name,
      mono: workspace.mono,
      color: workspace.color,
      privacy: workspace.privacy,
    });
  };

  const handleCollapseClick = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const is_rail_collapsed = !isExpanded;

  return (
    <>
      {is_rail_collapsed && (
        <aside className="hidden h-full w-12 flex-none flex-col items-center border-r border-shell-border bg-shell-surface pt-[22px] text-shell-text-secondary lg:flex">
          <button
            type="button"
            onClick={toggleSidebar}
            className="shell-icon-button h-[30px] w-[30px]"
            aria-label="Expand sidebar"
          >
            <ExpandSidebarIcon />
          </button>
        </aside>
      )}

      <aside
        className={`shell-scrollbar fixed bottom-0 left-0 top-[52px] z-50 flex h-[calc(100vh-52px)] w-80 flex-none flex-col overflow-y-auto border-r border-shell-border bg-shell-surface text-shell-text-secondary transition-transform duration-300 ease-in-out lg:h-full ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
          } ${is_rail_collapsed ? "lg:hidden" : "lg:static lg:flex lg:translate-x-0"}`}
      >
        <div className="sticky top-0 z-[5] flex flex-none flex-col gap-3.5 bg-shell-surface px-4 pb-2.5 pt-5">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold tracking-[-0.01em] text-shell-text">
              Workspace
            </span>
            <div className="flex items-center gap-1.5 text-shell-text-muted">
              {active_workspace ? (
                <WorkspaceOptionsButton
                  workspace={active_workspace}
                  updateWorkspace={updateWorkspace}
                  leaveWorkspace={leaveWorkspace}
                  deleteWorkspace={deleteWorkspace}
                  trigger_class_name="shell-icon-button h-7 w-7"
                  icon_size={16}
                  aria_label="Workspace options"
                />
              ) : (
                <button type="button" className="shell-icon-button h-7 w-7" aria-label="Workspace options" disabled>
                  <MoreDotsIcon size={16} />
                </button>
              )}
              <button type="button" className="shell-icon-button h-7 w-7" aria-label="Search">
                <SearchIcon />
              </button>
              <button
                type="button"
                onClick={handleCollapseClick}
                className="shell-icon-button h-7 w-7"
                aria-label="Collapse sidebar"
              >
                <CollapseSidebarIcon />
              </button>
            </div>
          </div>

          <WorkspaceSwitcher
            active_workspace={active_workspace}
            recent_workspaces={recent_workspaces}
            my_workspaces={my_workspaces}
            nav={nav}
            onSelectWorkspace={selectWorkspace}
            onAddWorkspace={() => setIsCreateOpen(true)}
            onBrowseAll={() => setIsBrowseOpen(true)}
            updateWorkspace={updateWorkspace}
            leaveWorkspace={leaveWorkspace}
            deleteWorkspace={deleteWorkspace}
          />
        </div>

        <nav className="flex flex-1 flex-col px-2.5 pb-7 pt-1.5">
          {active_workspace_slug ? (
            <NavTree nav={nav} workspace_slug={active_workspace_slug} />
          ) : (
            <div className="space-y-1.5 px-2.5 py-2">
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="h-8 animate-pulse rounded-[9px] bg-shell-hover" />
              ))}
            </div>
          )}
        </nav>
      </aside>

      <BrowseWorkspacesModal
        is_open={is_browse_open}
        onClose={() => setIsBrowseOpen(false)}
        workspaces={workspaces}
        onSelectWorkspace={selectWorkspace}
        onCreateWorkspace={() => setIsCreateOpen(true)}
        updateWorkspace={updateWorkspace}
        leaveWorkspace={leaveWorkspace}
        deleteWorkspace={deleteWorkspace}
      />

      <CreateWorkspaceModal
        is_open={is_create_open}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateWorkspace}
      />
    </>
  );
};

export default AppSidebar;
