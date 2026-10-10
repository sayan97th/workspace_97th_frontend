"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useWorkspaces } from "@/context/WorkspaceContext";
import useWorkspaceNav from "@/components/workspace-nav/useWorkspaceNav";
import NavTree from "@/components/workspace-nav/NavTree";
import WorkspaceOptionsButton from "@/components/workspace-nav/WorkspaceOptionsButton";
import { findWorkspaceManagePath } from "@/components/workspace-nav/helpers";
import { TrashModal, type TrashTabId } from "@/components/trash";
import { boardTreeFontClassName } from "@/components/board/board-tree-font";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import WorkspaceSwitcherSkeleton from "./WorkspaceSwitcherSkeleton";
import BrowseWorkspacesModal from "./BrowseWorkspacesModal";
import CreateWorkspaceModal, { type CreateWorkspaceSubmission } from "./CreateWorkspaceModal";
import SidebarResizeHandle from "./SidebarResizeHandle";
import SidebarRail from "./SidebarRail";
import SidebarFavoritesList from "./SidebarFavoritesList";
import SidebarFavoritesOptionsButton from "./SidebarFavoritesOptionsButton";
import SidebarRecentList from "./SidebarRecentList";
import useSidebarShortcuts from "./useSidebarShortcuts";
import { SIDEBAR_ICON_BUTTON_CLASS, SIDEBAR_SECTION_LABELS, type SidebarPanelView } from "./sidebarConstants";
import { isApplePlatform } from "@/lib/keyboard";
import {
  CloseIcon,
  CollapseSidebarIcon,
  ExpandSidebarIcon,
  MoreDotsIcon,
  SearchIcon,
} from "@/icons/workspace-icons";

/** Pointer rest on a rail entry before the collapsed panel peeks in, so merely crossing the rail does nothing. */
const PEEK_OPEN_DELAY_MS = 150;
/** Grace period after the pointer leaves a peeking panel, so a slightly off course pointer does not close it. */
const PEEK_CLOSE_DELAY_MS = 300;

const FLOATING_LAYER_SELECTOR = '[data-floating-layer], [aria-modal="true"]';

/** Per viewer convenience: whether the Favorites panel lists "Recently viewed" under the favorites. */
const FAVORITES_RECENT_STORAGE_KEY = "sidebar_favorites_show_recent";

const readFavoritesRecentPreference = (): boolean => {
  try {
    return window.localStorage.getItem(FAVORITES_RECENT_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
};

const SEARCH_PLACEHOLDERS: Partial<Record<SidebarPanelView, string>> = {
  favorites: "Search favorites",
};

const PANEL_TITLES: Record<SidebarPanelView, string> = {
  workspace: "Workspace",
  favorites: SIDEBAR_SECTION_LABELS.favorites,
  recent: SIDEBAR_SECTION_LABELS.recent,
};

/** Some drawers stay mounted off screen while closed, only a layer inside the viewport counts as open. */
const isOnScreen = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
};

/** Menus and dialogs portal out of the sidebar; while one is open the peeking panel must stay. */
const hasOpenFloatingLayer = (): boolean =>
  typeof document !== "undefined" && [...document.querySelectorAll(FLOATING_LAYER_SELECTOR)].some(isOnScreen);

const isInsideFloatingLayer = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(FLOATING_LAYER_SELECTOR) !== null;

const isDesktop = () => typeof window !== "undefined" && window.innerWidth >= 1024;

/**
 * Two level sidebar modeled on monday.com: the always visible app rail
 * (`SidebarRail`) and, next to it, a white panel card that lists the active
 * workspace's tree, or the Favorites / Recent lists picked in the rail. The
 * panel is what collapses (Ctrl/Cmd+B), resizes and peeks in on hover.
 */
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
  const router = useRouter();
  const manage_workspace_path = findWorkspaceManagePath(nav.tree);

  const [panel_view, setPanelView] = useState<SidebarPanelView>("workspace");
  const [is_browse_open, setIsBrowseOpen] = useState(false);
  // Tab of the Trash dialog opened from the workspace menu's "View archive/trash", or null while closed.
  const [trash_tab, setTrashTab] = useState<TrashTabId | null>(null);
  const [is_create_open, setIsCreateOpen] = useState(false);
  const [is_search_open, setIsSearchOpen] = useState(false);
  const [search_query, setSearchQuery] = useState("");
  const [search_focus_request, setSearchFocusRequest] = useState(0);
  const [is_favorites_recent_visible, setIsFavoritesRecentVisible] = useState(true);
  // The panel's slide animation is switched off while the resize handle is dragged, so the width follows the pointer.
  const [is_resizing, setIsResizing] = useState(false);
  // Read after mount, the server can't know the platform and a mismatch would break hydration.
  const [toggle_shortcut, setToggleShortcut] = useState("Ctrl+B");

  useEffect(() => {
    if (isApplePlatform()) setToggleShortcut("Cmd+B");
    setIsFavoritesRecentVisible(readFavoritesRecentPreference());
  }, []);

  const toggleFavoritesRecent = () => {
    const next_value = !is_favorites_recent_visible;
    setIsFavoritesRecentVisible(next_value);
    try {
      window.localStorage.setItem(FAVORITES_RECENT_STORAGE_KEY, next_value ? "1" : "0");
    } catch {
      // Storage can be blocked, the choice then lasts for this visit only.
    }
  };

  const panel_ref = useRef<HTMLElement>(null);
  const search_input_ref = useRef<HTMLInputElement>(null);
  const peek_open_timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peek_close_timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const is_panel_collapsed = !isExpanded;
  const is_peek_visible = is_panel_collapsed && is_peeking;

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

  const handleCollapseClick = useCallback(() => {
    if (isDesktop()) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  }, [toggleSidebar, toggleMobileSidebar]);

  // The Workspace and Favorites panels can be searched; from Recent the search opens the workspace tree.
  const openSearch = useCallback(() => {
    if (isDesktop()) {
      if (!isExpanded) toggleSidebar();
    } else if (!isMobileOpen) {
      toggleMobileSidebar();
    }
    if (panel_view === "recent") setPanelView("workspace");
    setIsSearchOpen(true);
    setSearchFocusRequest((request) => request + 1);
  }, [isExpanded, isMobileOpen, panel_view, toggleSidebar, toggleMobileSidebar]);

  const closeSearch = () => {
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  /** A search belongs to the list it was typed in, switching lists starts over. */
  const switchPanelView = (view: SidebarPanelView) => {
    if (view !== panel_view) closeSearch();
    setPanelView(view);
  };

  const openFavoriteWorkspace = (workspace_slug: string) => {
    selectWorkspace({ id: workspace_slug });
    switchPanelView("workspace");
  };

  useSidebarShortcuts({ onToggleSidebar: handleCollapseClick, onFocusSearch: openSearch });

  // ── Rail entries ───────────────────────────────────────────────────────

  /**
   * Clicking the entry the panel already shows folds the panel away, like
   * monday.com; any other entry opens the panel on its own list.
   */
  const handleSelectPanelView = (view: SidebarPanelView, is_active: boolean) => {
    clearPeekTimers();
    switchPanelView(view);
    if (!isDesktop()) return;
    if (is_panel_collapsed || is_active) toggleSidebar();
  };

  // ── Hover to peek ───────────────────────────────────────────────────────

  const clearPeekTimers = () => {
    if (peek_open_timer.current) clearTimeout(peek_open_timer.current);
    if (peek_close_timer.current) clearTimeout(peek_close_timer.current);
    peek_open_timer.current = null;
    peek_close_timer.current = null;
  };

  useEffect(() => clearPeekTimers, []);

  const handleRailHover = (view: SidebarPanelView) => {
    if (!is_panel_collapsed || !isDesktop()) return;
    clearPeekTimers();
    peek_open_timer.current = setTimeout(() => {
      switchPanelView(view);
      setIsPeeking(true);
    }, PEEK_OPEN_DELAY_MS);
  };

  const schedulePeekClose = () => {
    if (peek_close_timer.current) clearTimeout(peek_close_timer.current);
    peek_close_timer.current = setTimeout(() => {
      if (!hasOpenFloatingLayer()) setIsPeeking(false);
    }, PEEK_CLOSE_DELAY_MS);
  };

  // Leaving the rail closes the peek too (after the grace period), unless the
  // pointer went on into the peeking panel, whose mouseenter cancels it.
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

  // A click outside the peeking panel (and outside its menus) dismisses it,
  // covering the case where a menu kept it open after the pointer left.
  useEffect(() => {
    if (!is_peek_visible) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (panel_ref.current?.contains(event.target as Node) || isInsideFloatingLayer(event.target)) return;
      setIsPeeking(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [is_peek_visible, setIsPeeking]);

  const handleResize = (width: number) => {
    if (!is_resizing) setIsResizing(true);
    previewSidebarWidth(width);
  };

  const handleResizeEnd = (width: number) => {
    setIsResizing(false);
    commitSidebarWidth(width);
  };

  // On desktop the panel floats next to the rail and slides out from behind it. Hidden it is
  // also `invisible`, which keeps its rows out of the tab order once the slide has finished.
  const panel_motion_class = is_resizing ? "" : "motion-safe:lg:transition-[translate,opacity,visibility,box-shadow] motion-safe:lg:duration-300 motion-safe:lg:ease-in-out";
  const panel_state_class = !is_panel_collapsed
    ? "lg:translate-x-0 lg:opacity-100"
    : is_peek_visible
      ? "lg:translate-x-0 lg:opacity-100 lg:shadow-2xl lg:shadow-black/20"
      : "lg:pointer-events-none lg:invisible lg:-translate-x-full lg:opacity-0";

  const collapse_button = (
    <button
      type="button"
      onClick={is_peek_visible ? () => toggleSidebar() : handleCollapseClick}
      className={SIDEBAR_ICON_BUTTON_CLASS}
      aria-label={is_peek_visible ? "Pin sidebar open" : "Collapse sidebar"}
      title={is_peek_visible ? `Pin sidebar open (${toggle_shortcut})` : `Collapse sidebar (${toggle_shortcut})`}
    >
      {is_peek_visible ? <ExpandSidebarIcon /> : <CollapseSidebarIcon />}
    </button>
  );

  const renderWorkspaceHeaderActions = () => (
    <>
      {active_workspace ? (
        <WorkspaceOptionsButton
          workspace={active_workspace}
          updateWorkspace={updateWorkspace}
          togglePriority={togglePriority}
          uploadWorkspaceAvatar={uploadWorkspaceAvatar}
          removeWorkspaceAvatar={removeWorkspaceAvatar}
          leaveWorkspace={leaveWorkspace}
          deleteWorkspace={deleteWorkspace}
          trigger_class_name={SIDEBAR_ICON_BUTTON_CLASS}
          trigger_open_class_name="bg-sidebar-active text-sidebar-text hover:bg-sidebar-active"
          icon_size={18}
          aria_label="Workspace options"
          panel_actions={{
            onManage: manage_workspace_path ? () => router.push(manage_workspace_path) : undefined,
            onAddWorkspace: () => setIsCreateOpen(true),
            onBrowseAll: () => setIsBrowseOpen(true),
            onOpenArchive: () => setTrashTab("archive"),
            onOpenTrash: () => setTrashTab("trash"),
          }}
        />
      ) : (
        <button type="button" className={SIDEBAR_ICON_BUTTON_CLASS} aria-label="Workspace options" disabled>
          <MoreDotsIcon size={18} />
        </button>
      )}
      {renderSearchButton("Search this workspace")}
    </>
  );

  const renderSearchButton = (label: string) => (
    <button
      type="button"
      onClick={() => (is_search_open ? closeSearch() : openSearch())}
      className={`${SIDEBAR_ICON_BUTTON_CLASS} ${is_search_open ? "bg-sidebar-hover text-sidebar-text" : ""}`}
      aria-label={label}
      aria-pressed={is_search_open}
      title={`${label} (/)`}
    >
      <SearchIcon size={17} />
    </button>
  );

  const renderFavoritesHeaderActions = () => (
    <>
      <SidebarFavoritesOptionsButton is_recent_visible={is_favorites_recent_visible} onToggleRecent={toggleFavoritesRecent} />
      {renderSearchButton("Search favorites")}
    </>
  );

  const renderWorkspaceControls = () => (
    <>
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
    </>
  );

  const renderSearchField = () => (
    <>
      {is_search_open && (

        <div className="flex h-9 items-center gap-2 rounded-lg border border-sidebar-control-border bg-sidebar-panel px-2.5 transition-colors focus-within:border-sidebar-focus">
          <span className="flex flex-none text-sidebar-text-secondary">
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
                panel_ref.current?.querySelector<HTMLElement>("[data-nav-id], [data-panel-body] a, [data-panel-body] button")?.focus();
              }
            }}
            placeholder={SEARCH_PLACEHOLDERS[panel_view] ?? `Search ${active_workspace?.name ?? "workspace"}`}
            aria-label={panel_view === "favorites" ? "Search favorites and recently viewed boards" : "Search boards and folders in this workspace"}
            className="min-w-0 flex-1 bg-transparent text-sm text-sidebar-text outline-none placeholder:text-sidebar-text-secondary [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="button"
            onClick={closeSearch}
            className="flex h-5 w-5 flex-none items-center justify-center rounded-md text-sidebar-text-secondary hover:bg-sidebar-hover hover:text-sidebar-text"
            aria-label="Close search"
          >
            <CloseIcon size={11} />
          </button>
        </div>
      )}
    </>
  );

  const renderPanelBody = () => {
    if (panel_view === "favorites") {
      return <SidebarFavoritesList search_query={search_query} is_recent_visible={is_favorites_recent_visible} onOpenWorkspace={openFavoriteWorkspace} />;
    }
    if (panel_view === "recent") return <SidebarRecentList />;
    if (active_workspace_slug) return <NavTree nav={nav} workspace_slug={active_workspace_slug} search_query={search_query} />;
    return (
      <div className="space-y-1.5 px-2 py-2">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="h-8 animate-pulse rounded-md bg-sidebar-hover" />
        ))}
      </div>
    );
  };

  return (
    <>
      <div
        className={`fixed bottom-0 left-0 top-[52px] z-50 flex h-[calc(100vh-52px)] max-w-[100vw] flex-none bg-sidebar-rail transition-transform duration-300 ease-in-out lg:relative lg:top-0 lg:h-full lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${boardTreeFontClassName}`}
      >
        <SidebarRail
          panel_view={panel_view}
          is_panel_open={!is_panel_collapsed || is_peek_visible}
          is_panel_collapsed={is_panel_collapsed}
          toggle_shortcut={toggle_shortcut}
          onTogglePanel={toggleSidebar}
          onSelectPanelView={handleSelectPanelView}
          onHoverPanelView={handleRailHover}
          onMouseLeave={handleRailLeave}
        />

        {/* Reserves the panel's room in the page layout. Its width animates, so the page slides along with the panel. */}
        <div
          aria-hidden="true"
          className={`hidden flex-none lg:block ${is_resizing ? "" : "motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-in-out"}`}
          style={{ width: is_panel_collapsed ? 0 : sidebar_width }}
        />

        <aside
          ref={panel_ref}
          onMouseEnter={handlePeekEnter}
          onMouseLeave={handlePeekLeave}
          className={`relative flex max-w-[calc(100vw-72px)] flex-none flex-col rounded-tl-2xl border-l border-t border-sidebar-edge bg-sidebar-panel text-sidebar-text lg:absolute lg:bottom-0 lg:left-[72px] lg:top-0 lg:z-0 ${panel_motion_class} ${panel_state_class}`}
          style={{ width: sidebar_width }}
          aria-label={`${PANEL_TITLES[panel_view]} sidebar`}
        >
          {/* Scrolling lives on this inner wrapper (not the `<aside>` itself) so `SidebarResizeHandle`,
              anchored just outside the aside's own right border, never gets clipped by `overflow-y-auto`,
              an element can't have one axis scroll and the other stay visible, so the parent's own
              overflow would otherwise clip the handle's horizontal overhang along with it. */}
          <div className="shell-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto rounded-tl-2xl">
            <div className="sticky top-0 z-[5] flex flex-none flex-col gap-2 bg-sidebar-panel px-4 pb-2 pt-3">
              <div className="flex h-8 items-center justify-between gap-2">
                <h2 className="truncate text-sm font-normal text-sidebar-text-secondary">{PANEL_TITLES[panel_view]}</h2>
                <div className="flex items-center gap-0.5">
                  {panel_view === "workspace" && renderWorkspaceHeaderActions()}
                  {panel_view === "favorites" && renderFavoritesHeaderActions()}
                  {collapse_button}
                </div>
              </div>
              {panel_view === "workspace" && renderWorkspaceControls()}
              {panel_view !== "recent" && renderSearchField()}
            </div>

            <nav data-panel-body className="flex flex-1 flex-col px-2 pb-7 pt-1" aria-label={`${PANEL_TITLES[panel_view]} content`}>
              {renderPanelBody()}
            </nav>
          </div>

          <SidebarResizeHandle
            width={sidebar_width}
            onResize={handleResize}
            onResizeEnd={handleResizeEnd}
          />
        </aside>
      </div>

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

      <TrashModal is_open={trash_tab !== null} onClose={() => setTrashTab(null)} initial_tab={trash_tab ?? "trash"} />
    </>
  );
};

export default AppSidebar;
