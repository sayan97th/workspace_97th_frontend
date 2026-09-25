"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSidebar } from "../context/SidebarContext";
import { useWorkspaces } from "@/context/WorkspaceContext";
import useWorkspaceNav from "@/components/workspace-nav/useWorkspaceNav";
import NavTree from "@/components/workspace-nav/NavTree";
import WorkspaceOptionsButton from "@/components/workspace-nav/WorkspaceOptionsButton";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import WorkspaceSwitcherSkeleton from "./WorkspaceSwitcherSkeleton";
import BrowseWorkspacesModal from "./BrowseWorkspacesModal";
import CreateWorkspaceModal, { type CreateWorkspaceSubmission } from "./CreateWorkspaceModal";
import SidebarResizeHandle from "./SidebarResizeHandle";
import SidebarPersonalNav from "./SidebarPersonalNav";
import useSidebarShortcuts from "./useSidebarShortcuts";
import { isApplePlatform } from "@/lib/keyboard";
import {
  CloseIcon,
  CollapseSidebarIcon,
  ExpandSidebarIcon,
  MoreDotsIcon,
  SearchIcon,
} from "@/icons/workspace-icons";

/** Pointer rest on the collapsed rail before the sidebar peeks in, so merely crossing it does nothing. */
const PEEK_OPEN_DELAY_MS = 150;
/** Grace period after the pointer leaves a peeking sidebar, so a slightly off course pointer does not close it. */
const PEEK_CLOSE_DELAY_MS = 300;

const FLOATING_LAYER_SELECTOR = '[data-floating-layer], [aria-modal="true"]';

/** Some drawers stay mounted off screen while closed, only a layer inside the viewport counts as open. */
const isOnScreen = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
};

/** Menus and dialogs portal out of the sidebar; while one is open the peeking sidebar must stay. */
const hasOpenFloatingLayer = (): boolean =>
  typeof document !== "undefined" && [...document.querySelectorAll(FLOATING_LAYER_SELECTOR)].some(isOnScreen);

const isInsideFloatingLayer = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(FLOATING_LAYER_SELECTOR) !== null;

const AppSidebar: React.FC = () => {
  const {
    isExpanded,
    isMobileOpen,
    sidebar_width,
    toggleSidebar,
    toggleMobileSidebar,
    previewSidebarWidth,
    commitSidebarWidth,
    is_peeking,
    setIsPeeking,
  } = useSidebar();

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
    togglePriority,
    uploadWorkspaceAvatar,
    removeWorkspaceAvatar,
    leaveWorkspace,
    deleteWorkspace,
  } = workspaces_api;

  const nav = useWorkspaceNav(active_workspace_slug);

  const [is_browse_open, setIsBrowseOpen] = useState(false);
  const [is_create_open, setIsCreateOpen] = useState(false);
  const [is_search_open, setIsSearchOpen] = useState(false);
  const [search_query, setSearchQuery] = useState("");
  const [search_focus_request, setSearchFocusRequest] = useState(0);
  // Read after mount, the server can't know the platform and a mismatch would break hydration.
  const [toggle_shortcut, setToggleShortcut] = useState("Ctrl+B");

  useEffect(() => {
    if (isApplePlatform()) setToggleShortcut("Cmd+B");
  }, []);

  const aside_ref = useRef<HTMLElement>(null);
  const search_input_ref = useRef<HTMLInputElement>(null);
  const peek_open_timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peek_close_timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const is_rail_collapsed = !isExpanded;
  const is_peek_visible = is_rail_collapsed && is_peeking;

  // A search belongs to one workspace's tree.
  useEffect(() => {
    setSearchQuery("");
    setIsSearchOpen(false);
  }, [active_workspace_slug]);

  useEffect(() => {
    if (search_focus_request > 0) search_input_ref.current?.focus();
  }, [search_focus_request]);

  const handleCreateWorkspace = async (submission: CreateWorkspaceSubmission) => {
    const created = await createWorkspace({
      name: submission.name,
      mono: submission.name[0]?.toUpperCase() ?? "W",
      color: submission.color,
      privacy: submission.privacy,
    });
    if (submission.avatar_file) {
      await uploadWorkspaceAvatar(created.id, submission.avatar_file);
    }
  };

  const isDesktop = () => typeof window !== "undefined" && window.innerWidth >= 1024;

  const handleCollapseClick = useCallback(() => {
    if (isDesktop()) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  }, [toggleSidebar, toggleMobileSidebar]);

  const openSearch = useCallback(() => {
    if (isDesktop()) {
      if (!isExpanded) toggleSidebar();
    } else if (!isMobileOpen) {
      toggleMobileSidebar();
    }
    setIsSearchOpen(true);
    setSearchFocusRequest((request) => request + 1);
  }, [isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar]);

  const closeSearch = () => {
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  useSidebarShortcuts({ onToggleSidebar: handleCollapseClick, onFocusSearch: openSearch });

  // ── Hover to peek ───────────────────────────────────────────────────────

  const clearPeekTimers = () => {
    if (peek_open_timer.current) clearTimeout(peek_open_timer.current);
    if (peek_close_timer.current) clearTimeout(peek_close_timer.current);
    peek_open_timer.current = null;
    peek_close_timer.current = null;
  };

  useEffect(() => clearPeekTimers, []);

  const handleRailEnter = () => {
    clearPeekTimers();
    peek_open_timer.current = setTimeout(() => setIsPeeking(true), PEEK_OPEN_DELAY_MS);
  };

  const schedulePeekClose = () => {
    if (peek_close_timer.current) clearTimeout(peek_close_timer.current);
    peek_close_timer.current = setTimeout(() => {
      if (!hasOpenFloatingLayer()) setIsPeeking(false);
    }, PEEK_CLOSE_DELAY_MS);
  };

  // Leaving the rail closes the peek too (after the grace period), unless the
  // pointer went on into the peeking sidebar, whose mouseenter cancels it.
  const handleRailLeave = () => {
    if (peek_open_timer.current) clearTimeout(peek_open_timer.current);
    peek_open_timer.current = null;
    if (is_peeking) schedulePeekClose();
  };

  const handlePeekEnter = () => {
    if (peek_close_timer.current) clearTimeout(peek_close_timer.current);
    peek_close_timer.current = null;
  };

  const handlePeekLeave = () => {
    if (is_peek_visible) schedulePeekClose();
  };

  // A click outside the peeking sidebar (and outside its menus) dismisses it,
  // covering the case where a menu kept it open after the pointer left.
  useEffect(() => {
    if (!is_peek_visible) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (aside_ref.current?.contains(event.target as Node) || isInsideFloatingLayer(event.target)) return;
      setIsPeeking(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [is_peek_visible, setIsPeeking]);


  const desktop_state_class = !is_rail_collapsed
    ? "lg:relative lg:flex lg:translate-x-0"
    : is_peek_visible
      ? "lg:absolute lg:left-12 lg:flex lg:translate-x-0 lg:shadow-2xl lg:shadow-black/40 motion-safe:lg:animate-[sidebar-peek-in_180ms_ease-out]"
      : "lg:relative lg:hidden";

  return (
    <>
      {is_rail_collapsed && (
        <aside
          className="hidden h-full w-12 flex-none flex-col items-center border-r border-shell-border bg-shell-surface pt-[22px] text-shell-text-secondary lg:flex"
          onMouseEnter={handleRailEnter}
          onMouseLeave={handleRailLeave}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            className="shell-icon-button h-[30px] w-[30px]"
            aria-label="Expand sidebar"
            title={`Expand sidebar (${toggle_shortcut})`}
          >
            <ExpandSidebarIcon />
          </button>
          <button
            type="button"
            onClick={openSearch}
            className="shell-icon-button mt-1.5 h-[30px] w-[30px]"
            aria-label="Search this workspace"
            title="Search this workspace (/)"
          >
            <SearchIcon />
          </button>
        </aside>
      )}

      <aside
        ref={aside_ref}
        onMouseEnter={handlePeekEnter}
        onMouseLeave={handlePeekLeave}
        className={`fixed bottom-0 left-0 top-[52px] z-50 flex h-[calc(100vh-52px)] max-w-[100vw] flex-none flex-col border-r border-shell-border bg-shell-surface text-shell-text-secondary transition-transform duration-300 ease-in-out lg:top-0 lg:h-full ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
          } ${desktop_state_class}`}
        style={{ width: sidebar_width }}
        aria-label="Workspace sidebar"
      >
        {/* Scrolling lives on this inner wrapper (not the `<aside>` itself) so `SidebarResizeHandle`,
            anchored just outside the aside's own right border, never gets clipped by `overflow-y-auto`,
            an element can't have one axis scroll and the other stay visible, so the parent's own
            overflow would otherwise clip the handle's horizontal overhang along with it. */}
        <div className="shell-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="pt-3">
            <SidebarPersonalNav />
          </div>

          <div className="sticky top-0 z-[5] flex flex-none flex-col gap-3.5 bg-shell-surface px-4 pb-2.5 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold tracking-[-0.01em] text-shell-text">
                Workspace
              </span>
              <div className="flex items-center gap-1.5 text-shell-text-muted">
                {active_workspace ? (
                  <WorkspaceOptionsButton
                    workspace={active_workspace}
                    updateWorkspace={updateWorkspace}
                    togglePriority={togglePriority}
                    uploadWorkspaceAvatar={uploadWorkspaceAvatar}
                    removeWorkspaceAvatar={removeWorkspaceAvatar}
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
                <button
                  type="button"
                  onClick={() => (is_search_open ? closeSearch() : openSearch())}
                  className={`shell-icon-button h-7 w-7 ${is_search_open ? "bg-shell-hover-strong text-shell-text" : ""}`}
                  aria-label="Search this workspace"
                  aria-pressed={is_search_open}
                  title="Search this workspace (/)"
                >
                  <SearchIcon />
                </button>
                <button
                  type="button"
                  onClick={is_peek_visible ? () => toggleSidebar() : handleCollapseClick}
                  className="shell-icon-button h-7 w-7"
                  aria-label={is_peek_visible ? "Pin sidebar open" : "Collapse sidebar"}
                  title={is_peek_visible ? `Pin sidebar open (${toggle_shortcut})` : `Collapse sidebar (${toggle_shortcut})`}
                >
                  {is_peek_visible ? <ExpandSidebarIcon /> : <CollapseSidebarIcon />}
                </button>
              </div>
            </div>

            {active_workspace ? (
              <WorkspaceSwitcher
                active_workspace={active_workspace}
                recent_workspaces={recent_workspaces}
                my_workspaces={my_workspaces}
                nav={nav}
                togglePriority={togglePriority}
                onSelectWorkspace={selectWorkspace}
                onAddWorkspace={() => setIsCreateOpen(true)}
                onBrowseAll={() => setIsBrowseOpen(true)}
                updateWorkspace={updateWorkspace}
                uploadWorkspaceAvatar={uploadWorkspaceAvatar}
                removeWorkspaceAvatar={removeWorkspaceAvatar}
                leaveWorkspace={leaveWorkspace}
                deleteWorkspace={deleteWorkspace}
              />
            ) : (
              <WorkspaceSwitcherSkeleton />
            )}

            {is_search_open && (
              <div className="flex h-8 items-center gap-2 rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-2.5 focus-within:border-[#2B76E5]">
                <span className="flex flex-none text-shell-text-muted">
                  <SearchIcon />
                </span>
                <input
                  ref={search_input_ref}
                  type="search"
                  value={search_query}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      closeSearch();
                    }
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      aside_ref.current?.querySelector<HTMLElement>("[data-nav-id]")?.focus();
                    }
                  }}
                  placeholder={`Search ${active_workspace?.name ?? "workspace"}`}
                  aria-label="Search boards and folders in this workspace"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-shell-text outline-none placeholder:text-shell-text-faint [&::-webkit-search-cancel-button]:hidden"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  className="flex h-5 w-5 flex-none items-center justify-center rounded-md text-shell-text-muted hover:bg-shell-hover-strong hover:text-shell-text"
                  aria-label="Close search"
                >
                  <CloseIcon size={11} />
                </button>
              </div>
            )}
          </div>

          <nav className="flex flex-1 flex-col px-2.5 pb-7 pt-1.5">
            {active_workspace_slug ? (
              <NavTree nav={nav} workspace_slug={active_workspace_slug} search_query={search_query} />
            ) : (
              <div className="space-y-1.5 px-2.5 py-2">
                {[0, 1, 2, 3, 4].map((row) => (
                  <div key={row} className="h-8 animate-pulse rounded-[9px] bg-shell-hover" />
                ))}
              </div>
            )}
          </nav>
        </div>

        <SidebarResizeHandle
          width={sidebar_width}
          onResize={previewSidebarWidth}
          onResizeEnd={commitSidebarWidth}
        />
      </aside>

      <BrowseWorkspacesModal
        is_open={is_browse_open}
        onClose={() => setIsBrowseOpen(false)}
        workspaces={workspaces}
        onSelectWorkspace={selectWorkspace}
        onCreateWorkspace={() => setIsCreateOpen(true)}
        updateWorkspace={updateWorkspace}
        togglePriority={togglePriority}
        uploadWorkspaceAvatar={uploadWorkspaceAvatar}
        removeWorkspaceAvatar={removeWorkspaceAvatar}
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
