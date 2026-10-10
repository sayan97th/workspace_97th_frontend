"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { StarIcon } from "@/icons/workspace-icons";
import WorkspaceMonogram from "@/components/personal/WorkspaceMonogram";
import NavItemIcon, { NavPrivacyBadge } from "@/components/workspace-nav/NavItemIcon";
import useFavorites from "@/hooks/useFavorites";
import useRecentBoards from "@/hooks/useRecentBoards";
import { RecentBoardRow, useRecentFavoriteToggle } from "./SidebarRecentList";
import { SIDEBAR_ROW_ACTIVE_CLASS, SIDEBAR_ROW_CLASS, isPathActive } from "./sidebarConstants";
import type { FavoriteItemDto, PersonalWorkspaceSummary } from "@/types/personal";

/** How many boards the "Recently viewed" section under the favorites lists. */
const RECENTLY_VIEWED_LIMIT = 10;

/** Where a favorite opens: a board at its own page, a folder at its workspace. */
const favoriteHref = (favorite: FavoriteItemDto): string =>
  favorite.type === "leaf" ? `/boards/${favorite.id}` : favorite.workspace ? `/workspaces/${favorite.workspace.id}` : "/workspace-home";

const matchesQuery = (label: string, query: string): boolean => label.toLowerCase().includes(query);

const UNSTAR_BUTTON_CLASS =
  "flex h-7 w-7 flex-none items-center justify-center rounded-md text-[#ffcb00] opacity-0 transition-opacity hover:bg-sidebar-hover focus-visible:opacity-100 group-hover:opacity-100";

type FavoriteRowProps = {
  favorite: FavoriteItemDto;
  is_active: boolean;
  is_drag_disabled: boolean;
  onRemove: () => void;
};

/** One starred board or folder, reorderable by dragging; its filled star shows on hover to unstar it. */
const FavoriteRow: React.FC<FavoriteRowProps> = ({ favorite, is_active, is_drag_disabled, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: favorite.id, disabled: is_drag_disabled });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${SIDEBAR_ROW_CLASS} pr-1 ${is_drag_disabled ? "" : "cursor-grab active:cursor-grabbing"} ${is_active ? SIDEBAR_ROW_ACTIVE_CLASS : ""} ${
        isDragging ? "relative z-10 bg-sidebar-panel shadow-lg" : ""
      }`}
      {...attributes}
      {...listeners}
      role="listitem"
    >
      <Link
        href={favoriteHref(favorite)}
        className="flex min-w-0 flex-1 items-center gap-[11px] self-stretch outline-none"
        title={favorite.workspace ? `${favorite.label} in ${favorite.workspace.name}` : favorite.label}
        aria-current={is_active ? "page" : undefined}
      >
        <NavItemIcon source={favorite} size={16} className="text-sidebar-text-secondary" />
        <span className="min-w-0 truncate">{favorite.label}</span>
        <NavPrivacyBadge board_type={favorite.board_type} className="text-sidebar-text-secondary" />
      </Link>
      <button
        type="button"
        onClick={onRemove}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label={`Remove ${favorite.label} from favorites`}
        title="Remove from favorites"
        className={UNSTAR_BUTTON_CLASS}
      >
        <StarIcon filled size={15} />
      </button>
    </li>
  );
};

type FavoriteWorkspaceRowProps = {
  workspace: PersonalWorkspaceSummary;
  onOpen: () => void;
  onRemove: () => void;
};

/** A whole starred workspace: opens it in the Workspace panel. */
const FavoriteWorkspaceRow: React.FC<FavoriteWorkspaceRowProps> = ({ workspace, onOpen, onRemove }) => (
  <li className={`${SIDEBAR_ROW_CLASS} pr-1`}>
    <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-[11px] self-stretch text-left outline-none" title={`Open ${workspace.name}`}>
      <WorkspaceMonogram workspace={workspace} size={18} />
      <span className="min-w-0 truncate">{workspace.name}</span>
    </button>
    <button type="button" onClick={onRemove} aria-label={`Remove ${workspace.name} from favorites`} title="Remove from favorites" className={UNSTAR_BUTTON_CLASS}>
      <StarIcon filled size={15} />
    </button>
  </li>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="flex h-8 items-center px-2 pt-3 text-[13px] font-normal text-sidebar-text-secondary">{children}</h3>
);

export type SidebarFavoritesListProps = {
  /** Text typed in the panel search, filters both lists. */
  search_query: string;
  /** Whether the "Recently viewed" section shows under the favorites (Favorites options menu). */
  is_recent_visible: boolean;
  /** Opens a starred workspace in the Workspace panel. */
  onOpenWorkspace: (workspace_slug: string) => void;
};

/**
 * Body of the sidebar panel while the rail's Favorites entry is selected,
 * modeled on monday.com: the starred workspaces, boards and folders in the
 * user's own order (drag to reorder), then "Recently viewed" boards with a
 * star to add any of them to Favorites.
 */
const SidebarFavoritesList: React.FC<SidebarFavoritesListProps> = ({ search_query, is_recent_visible, onOpenWorkspace }) => {
  const pathname = usePathname() ?? "";
  const { favorites, favorite_workspaces, is_loading, removeFavorite, moveFavorite, toggleWorkspaceFavorite } = useFavorites();
  const { boards: recent_boards, is_loading: is_recent_loading } = useRecentBoards(is_recent_visible);
  const { isFavorite, toggleFavorite } = useRecentFavoriteToggle();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const query = search_query.trim().toLowerCase();
  const is_searching = query.length > 0;
  const visible_workspaces = favorite_workspaces.filter((workspace) => matchesQuery(workspace.name, query));
  const visible_favorites = favorites.filter((favorite) => matchesQuery(favorite.label, query));
  const visible_recent = is_recent_visible ? recent_boards.filter((board) => matchesQuery(board.label, query)).slice(0, RECENTLY_VIEWED_LIMIT) : [];
  const has_favorites = favorite_workspaces.length > 0 || favorites.length > 0;

  // The server keeps one flat order, a filtered list can't be reordered meaningfully.
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const to_index = favorites.findIndex((favorite) => favorite.id === Number(over.id));
    void moveFavorite(Number(active.id), to_index);
  };

  if ((is_loading && !has_favorites) || (is_recent_visible && is_recent_loading && !has_favorites && recent_boards.length === 0)) {
    return (
      <div className="space-y-1.5 px-2 py-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-8 animate-pulse rounded-md bg-sidebar-hover" />
        ))}
      </div>
    );
  }

  if (!has_favorites && (!is_recent_visible || recent_boards.length === 0)) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-rail text-sidebar-text-secondary">
          <StarIcon size={20} />
        </span>
        <p className="text-sm font-medium text-sidebar-text">No favorites yet</p>
        <p className="text-[13px] leading-snug text-sidebar-text-secondary">Star a board or a workspace to keep it here.</p>
      </div>
    );
  }

  if (is_searching && visible_workspaces.length === 0 && visible_favorites.length === 0 && visible_recent.length === 0) {
    return <p className="px-2 py-4 text-[13px] text-sidebar-text-secondary">No favorites or recent boards match &ldquo;{search_query.trim()}&rdquo;.</p>;
  }

  return (
    <div className="flex flex-col">
      {(visible_workspaces.length > 0 || visible_favorites.length > 0) && (
        <ul className="flex flex-col" aria-label="Favorites">
          {visible_workspaces.map((workspace) => (
            <FavoriteWorkspaceRow
              key={`workspace-${workspace.id}`}
              workspace={workspace}
              onOpen={() => workspace.slug && onOpenWorkspace(workspace.slug)}
              onRemove={() => workspace.slug && void toggleWorkspaceFavorite(workspace.slug, false)}
            />
          ))}
          <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
            <SortableContext items={visible_favorites.map((favorite) => favorite.id)} strategy={verticalListSortingStrategy}>
              {visible_favorites.map((favorite) => (
                <FavoriteRow
                  key={favorite.id}
                  favorite={favorite}
                  is_active={isPathActive(pathname, favoriteHref(favorite))}
                  is_drag_disabled={is_searching}
                  onRemove={() => void removeFavorite(favorite.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </ul>
      )}

      {!has_favorites && !is_searching && (
        <p className="px-2 py-2 text-[13px] leading-snug text-sidebar-text-secondary">Star a board to keep it here.</p>
      )}

      {visible_recent.length > 0 && (
        <section aria-label="Recently viewed">
          <SectionLabel>Recently viewed</SectionLabel>
          <ul className="flex flex-col">
            {visible_recent.map((board) => (
              <RecentBoardRow
                key={board.id}
                board={board}
                // A starred board already lights up in the list above, one highlight per page.
                is_active={isPathActive(pathname, `/boards/${board.id}`) && !visible_favorites.some((favorite) => favorite.id === board.id)}
                is_favorite={isFavorite(board.id)}
                onToggleFavorite={() => toggleFavorite(board)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default SidebarFavoritesList;
