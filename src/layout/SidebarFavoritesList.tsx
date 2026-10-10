"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { StarIcon, TreeCaretIcon } from "@/icons/workspace-icons";
import WorkspaceMonogram from "@/components/personal/WorkspaceMonogram";
import NavItemIcon, { NavPrivacyBadge } from "@/components/workspace-nav/NavItemIcon";
import useFavorites, { type FavoriteWorkspaceGroup } from "@/hooks/useFavorites";
import { useSidebar } from "@/context/SidebarContext";
import { useWorkspaces } from "@/context/WorkspaceContext";
import { SIDEBAR_ROW_ACTIVE_CLASS, SIDEBAR_ROW_CLASS, favoritesWorkspaceSectionKey, isPathActive } from "./sidebarConstants";
import type { FavoriteItemDto } from "@/types/personal";

/** Where a favorite opens: a board at its own page, a folder at its workspace. */
const favoriteHref = (favorite: FavoriteItemDto): string =>
  favorite.type === "leaf" ? `/boards/${favorite.id}` : favorite.workspace ? `/workspaces/${favorite.workspace.id}` : "/workspace-home";

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
      <div className={`${SIDEBAR_ROW_CLASS} cursor-grab pl-[30px] active:cursor-grabbing ${is_active ? SIDEBAR_ROW_ACTIVE_CLASS : ""} ${isDragging ? "bg-sidebar-panel shadow-lg" : ""}`}>
        <Link href={favoriteHref(favorite)} className="flex min-w-0 flex-1 items-center gap-[11px]" title={favorite.label}>
          <NavItemIcon source={favorite} size={16} className="text-sidebar-text-secondary" />
          <span className="truncate">{favorite.label}</span>
          <NavPrivacyBadge board_type={favorite.board_type} className="text-sidebar-text-secondary" />
        </Link>
        <button
          type="button"
          onClick={onRemove}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={`Remove ${favorite.label} from favorites`}
          title="Remove from favorites"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-[#ffcb00] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-sidebar-hover"
        >
          <StarIcon filled size={14} />
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

/** A workspace block of the Favorites panel: its header, then its starred boards and folders. */
const FavoriteGroup: React.FC<FavoriteGroupProps> = ({ group, pathname, is_collapsed, onToggleCollapsed, onOpenWorkspace, onRemoveFavorite, onUnstarWorkspace }) => {
  const name = group.workspace?.name ?? "Other";
  return (
    <li className="flex flex-col">
      <div className={`${SIDEBAR_ROW_CLASS} gap-1.5 pl-1.5`}>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!is_collapsed}
          aria-label={`${is_collapsed ? "Expand" : "Collapse"} ${name}`}
          className="flex h-6 w-5 flex-none items-center justify-center text-sidebar-text-secondary"
        >
          <span className={`flex transition-transform duration-150 ${is_collapsed ? "" : "rotate-90"}`}>
            <TreeCaretIcon />
          </span>
        </button>
        <button type="button" onClick={onOpenWorkspace} className="flex min-w-0 flex-1 items-center gap-2 text-left" title={`Open ${name}`}>
          <WorkspaceMonogram workspace={group.workspace} size={18} />
          <span className="truncate font-medium">{name}</span>
        </button>
        {group.is_workspace_favorite && (
          <button
            type="button"
            onClick={onUnstarWorkspace}
            aria-label={`Remove ${name} from favorites`}
            title="Remove workspace from favorites"
            className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-[#ffcb00] hover:bg-sidebar-hover"
          >
            <StarIcon filled size={13} />
          </button>
        )}
      </div>
      {!is_collapsed && (
        <SortableContext items={group.items.map((favorite) => favorite.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col" role="list" aria-label={`Favorites in ${name}`}>
            {group.items.length === 0 && <li className="py-1.5 pl-[30px] text-[13px] text-sidebar-text-secondary">No starred boards here yet.</li>}
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
 * Body of the sidebar panel while the rail's Favorites entry is selected:
 * starred boards and folders grouped by workspace, reorderable by dragging.
 */
const SidebarFavoritesList: React.FC = () => {
  const pathname = usePathname() ?? "";
  const { isSectionCollapsed, toggleSectionCollapsed } = useSidebar();
  const { selectWorkspace } = useWorkspaces();
  const { groups, is_loading, removeFavorite, moveFavoriteWithinGroup, toggleWorkspaceFavorite } = useFavorites();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) void moveFavoriteWithinGroup(Number(active.id), Number(over.id));
  };

  if (is_loading && groups.length === 0) {
    return (
      <div className="space-y-1.5 px-2 py-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-8 animate-pulse rounded-md bg-sidebar-hover" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
      <ul className="flex flex-col" aria-label="Favorites">
        {groups.map((group) => {
          const section_key = favoritesWorkspaceSectionKey(group.workspace?.id ?? null);
          return (
            <FavoriteGroup
              key={section_key}
              group={group}
              pathname={pathname}
              is_collapsed={isSectionCollapsed(section_key)}
              onToggleCollapsed={() => toggleSectionCollapsed(section_key)}
              onOpenWorkspace={() => group.workspace?.slug && selectWorkspace({ id: group.workspace.slug })}
              onRemoveFavorite={(item_id) => void removeFavorite(item_id)}
              onUnstarWorkspace={() => group.workspace?.slug && void toggleWorkspaceFavorite(group.workspace.slug, false)}
            />
          );
        })}
      </ul>
    </DndContext>
  );
};

export default SidebarFavoritesList;
