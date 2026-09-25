"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRightIcon, ClockIcon, FeedSettingsIcon, HomeIcon, StarIcon } from "@/icons/workspace-icons";
import { CalendarViewIcon } from "@/icons/board-icons";
import WorkspaceMonogram from "@/components/personal/WorkspaceMonogram";
import NavItemIcon, { NavPrivacyBadge } from "@/components/workspace-nav/NavItemIcon";
import useFavorites, { type FavoriteWorkspaceGroup } from "@/hooks/useFavorites";
import useRecentBoards from "@/hooks/useRecentBoards";
import { useSidebar } from "@/context/SidebarContext";
import { useWorkspaces } from "@/context/WorkspaceContext";
import SidebarCustomizePanel from "./SidebarCustomizePanel";
import { SIDEBAR_SECTION_LABELS, favoritesWorkspaceSectionKey } from "./sidebarConstants";
import type { FavoriteItemDto } from "@/types/personal";
import type { SidebarSectionKey } from "@/types/auth";

/** How many recently visited boards the Recent section lists. */
const RECENT_LIMIT = 5;

/** Where a favorite opens: a board at its own page, a folder at its workspace. */
const favoriteHref = (favorite: FavoriteItemDto): string =>
  favorite.type === "leaf" ? `/boards/${favorite.id}` : favorite.workspace ? `/workspaces/${favorite.workspace.id}` : "/workspace-home";

const isPathActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

const ROW_CLASS = "group relative flex h-[34px] items-center gap-[11px] rounded-[9px] px-2.5 text-sm transition-colors hover:bg-shell-hover";

type SectionHeaderProps = {
  label: string;
  icon: React.ReactNode;
  is_collapsed: boolean;
  onToggle: () => void;
  count?: number;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({ label, icon, is_collapsed, onToggle, count }) => (
  <button type="button" onClick={onToggle} aria-expanded={!is_collapsed} className={`${ROW_CLASS} w-full text-left text-shell-text`}>
    <span className="flex flex-none text-shell-text-secondary">{icon}</span>
    <span className="flex-1 truncate">{label}</span>
    {is_collapsed && count !== undefined && count > 0 && <span className="text-[11.5px] text-shell-text-faint">{count}</span>}
    <span className={`flex flex-none text-shell-text-muted transition-transform duration-150 ${is_collapsed ? "" : "rotate-90"}`}>
      <ChevronRightIcon size={11} />
    </span>
  </button>
);

type FavoriteRowProps = {
  favorite: FavoriteItemDto;
  is_active: boolean;
  onRemove: () => void;
};

/** One starred board or folder, sortable inside its workspace group with an animated shift. */
const FavoriteRow: React.FC<FavoriteRowProps> = ({ favorite, is_active, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: favorite.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-80" : ""}
      {...attributes}
      {...listeners}
      role="listitem"
    >
      <div className={`${ROW_CLASS} cursor-grab pl-[42px] active:cursor-grabbing ${is_active ? "bg-shell-hover" : ""} ${isDragging ? "bg-shell-hover-strong shadow-lg" : ""}`}>
        <Link href={favoriteHref(favorite)} className="flex min-w-0 flex-1 items-center gap-2" title={favorite.label}>
          <NavItemIcon source={favorite} size={14} className="text-shell-text-secondary" />
          <span className="truncate text-shell-text">{favorite.label}</span>
          <NavPrivacyBadge board_type={favorite.board_type} className="text-shell-text-muted" />
        </Link>
        <button
          type="button"
          onClick={onRemove}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={`Remove ${favorite.label} from favorites`}
          title="Remove from favorites"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-sunset-200 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-shell-hover-strong"
        >
          <StarIcon filled size={13} />
        </button>
      </div>
    </li>
  );
};

type FavoriteGroupProps = {
  group: FavoriteWorkspaceGroup;
  pathname: string;
  is_collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenWorkspace: () => void;
  onRemoveFavorite: (item_id: number) => void;
  onUnstarWorkspace: () => void;
};

/** A workspace block of the Favorites section: its header, then its starred boards and folders. */
const FavoriteGroup: React.FC<FavoriteGroupProps> = ({ group, pathname, is_collapsed, onToggleCollapsed, onOpenWorkspace, onRemoveFavorite, onUnstarWorkspace }) => {
  const name = group.workspace?.name ?? "Other";
  return (
    <li className="flex flex-col">
      <div className="group flex h-[30px] items-center gap-1.5 rounded-[9px] pl-[26px] pr-1.5 hover:bg-shell-hover">
        <button type="button" onClick={onToggleCollapsed} aria-expanded={!is_collapsed} aria-label={`${is_collapsed ? "Expand" : "Collapse"} ${name}`} className="flex h-5 w-4 flex-none items-center justify-center text-shell-text-muted">
          <span className={`flex transition-transform duration-150 ${is_collapsed ? "" : "rotate-90"}`}>
            <ChevronRightIcon size={9} />
          </span>
        </button>
        <button type="button" onClick={onOpenWorkspace} className="flex min-w-0 flex-1 items-center gap-2 text-left" title={`Open ${name}`}>
          <WorkspaceMonogram workspace={group.workspace} size={16} />
          <span className="truncate text-[12.5px] font-semibold text-shell-text-secondary">{name}</span>
        </button>
        {group.is_workspace_favorite && (
          <button
            type="button"
            onClick={onUnstarWorkspace}
            aria-label={`Remove ${name} from favorites`}
            title="Remove workspace from favorites"
            className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-sunset-200 hover:bg-shell-hover-strong"
          >
            <StarIcon filled size={12} />
          </button>
        )}
      </div>
      {!is_collapsed && (
        <SortableContext items={group.items.map((favorite) => favorite.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col" role="list" aria-label={`Favorites in ${name}`}>
            {group.items.length === 0 && <li className="py-1 pl-[42px] text-[12px] text-shell-text-faint">No starred boards here yet.</li>}
            {group.items.map((favorite) => (
              <FavoriteRow
                key={favorite.id}
                favorite={favorite}
                is_active={isPathActive(pathname, favoriteHref(favorite))}
                onRemove={() => onRemoveFavorite(favorite.id)}
              />
            ))}
          </ul>
        </SortableContext>
      )}
    </li>
  );
};

/**
 * The sidebar's personal block, above the workspace tree: Home, My work,
 * Favorites (grouped by workspace, reorderable by dragging) and Recent. The
 * user decides which of these show and in what order ("Customize sidebar"),
 * and which are collapsed; all of it is saved on their account.
 */
const SidebarPersonalNav: React.FC = () => {
  const pathname = usePathname() ?? "";
  const { sidebar_preferences, updateSidebarSections, isSectionCollapsed, toggleSectionCollapsed } = useSidebar();
  const { selectWorkspace } = useWorkspaces();
  const { favorites, groups, is_loading, removeFavorite, moveFavoriteWithinGroup, toggleWorkspaceFavorite } = useFavorites();

  const visible_sections = sidebar_preferences.sections.filter((section) => section.is_visible);
  const is_recent_visible = visible_sections.some((section) => section.key === "recent");
  const { boards: recent_boards, is_loading: is_recent_loading } = useRecentBoards(is_recent_visible);

  const [customize_anchor, setCustomizeAnchor] = useState<HTMLElement | null>(null);

  const favorite_sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleFavoriteDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) void moveFavoriteWithinGroup(Number(active.id), Number(over.id));
  };

  const openWorkspace = (workspace_slug: string | undefined) => {
    if (workspace_slug) selectWorkspace({ id: workspace_slug });
  };

  const renderLink = (href: string, label: string, icon: React.ReactNode) => {
    const is_active = pathname === href;
    return (
      <Link href={href} className={`${ROW_CLASS} ${is_active ? "bg-shell-hover font-semibold text-shell-text" : "text-shell-text"}`} aria-current={is_active ? "page" : undefined}>
        <span className="flex flex-none text-shell-text-secondary">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
      </Link>
    );
  };

  const renderFavorites = () => {
    const is_collapsed = isSectionCollapsed("favorites");
    return (
      <>
        <SectionHeader label={SIDEBAR_SECTION_LABELS.favorites} icon={<StarIcon size={16} />} is_collapsed={is_collapsed} onToggle={() => toggleSectionCollapsed("favorites")} count={favorites.length} />
        {!is_collapsed && (
          <DndContext sensors={favorite_sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleFavoriteDragEnd}>
            <ul className="flex flex-col" aria-label="Favorites">
              {!is_loading && groups.length === 0 && (
                <li className="px-2.5 py-1.5 pl-[38px] text-[12.5px] leading-snug text-shell-text-faint">Star a board or a workspace to keep it here.</li>
              )}
              {groups.map((group) => {
                const section_key = favoritesWorkspaceSectionKey(group.workspace?.id ?? null);
                return (
                  <FavoriteGroup
                    key={section_key}
                    group={group}
                    pathname={pathname}
                    is_collapsed={isSectionCollapsed(section_key)}
                    onToggleCollapsed={() => toggleSectionCollapsed(section_key)}
                    onOpenWorkspace={() => openWorkspace(group.workspace?.slug)}
                    onRemoveFavorite={(item_id) => void removeFavorite(item_id)}
                    onUnstarWorkspace={() => group.workspace?.slug && void toggleWorkspaceFavorite(group.workspace.slug, false)}
                  />
                );
              })}
            </ul>
          </DndContext>
        )}
      </>
    );
  };

  const renderRecent = () => {
    const is_collapsed = isSectionCollapsed("recent");
    const boards = recent_boards.slice(0, RECENT_LIMIT);
    return (
      <>
        <SectionHeader label={SIDEBAR_SECTION_LABELS.recent} icon={<ClockIcon size={16} />} is_collapsed={is_collapsed} onToggle={() => toggleSectionCollapsed("recent")} />
        {!is_collapsed && (
          <ul className="flex flex-col" aria-label="Recently visited boards">
            {!is_recent_loading && boards.length === 0 && (
              <li className="px-2.5 py-1.5 pl-[38px] text-[12.5px] leading-snug text-shell-text-faint">Boards you open will show up here.</li>
            )}
            {boards.map((board) => {
              const href = `/boards/${board.id}`;
              const is_active = isPathActive(pathname, href);
              return (
                <li key={board.id}>
                  <Link
                    href={href}
                    className={`${ROW_CLASS} pl-[34px] ${is_active ? "bg-shell-hover" : ""}`}
                    title={board.workspace ? `${board.label} in ${board.workspace.name}` : board.label}
                  >
                    <NavItemIcon source={board} size={14} className="text-shell-text-secondary" />
                    <span className="min-w-0 flex-1 truncate text-shell-text">{board.label}</span>
                    <NavPrivacyBadge board_type={board.board_type} className="text-shell-text-muted" />
                    <WorkspaceMonogram workspace={board.workspace} size={14} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  };

  const renderSection = (key: SidebarSectionKey) => {
    switch (key) {
      case "home":
        return renderLink("/workspace-home", SIDEBAR_SECTION_LABELS.home, <HomeIcon size={16} />);
      case "my_work":
        return renderLink("/my-work", SIDEBAR_SECTION_LABELS.my_work, <CalendarViewIcon size={16} />);
      case "favorites":
        return renderFavorites();
      case "recent":
        return renderRecent();
    }
  };

  return (
    <div className="group/personal relative flex flex-col gap-0.5 border-b border-shell-border px-2.5 pb-2.5 pt-1">
      <button
        type="button"
        onClick={(event) => setCustomizeAnchor(customize_anchor ? null : event.currentTarget)}
        aria-label="Customize sidebar"
        title="Customize sidebar"
        className={`absolute right-3 top-[5px] z-[2] flex h-6 w-6 items-center justify-center rounded-md text-shell-text-muted transition-opacity hover:bg-shell-hover-strong hover:text-shell-text focus-visible:opacity-100 ${
          customize_anchor || visible_sections.length === 0 ? "opacity-100" : "opacity-0 group-hover/personal:opacity-100"
        }`}
      >
        <FeedSettingsIcon size={13} />
      </button>

      {visible_sections.length === 0 && (
        <p className="px-2.5 py-1.5 pr-9 text-[12.5px] leading-snug text-shell-text-faint">All personal sections are hidden. Use the settings button to bring them back.</p>
      )}

      {visible_sections.map((section) => (
        <React.Fragment key={section.key}>{renderSection(section.key)}</React.Fragment>
      ))}

      <SidebarCustomizePanel
        anchor_el={customize_anchor}
        is_open={customize_anchor !== null}
        onClose={() => setCustomizeAnchor(null)}
        sections={sidebar_preferences.sections}
        onChange={updateSidebarSections}
      />
    </div>
  );
};

export default SidebarPersonalNav;
