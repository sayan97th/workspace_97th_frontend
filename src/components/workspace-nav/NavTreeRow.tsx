"use client";
import React from "react";
import Link from "next/link";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WorkspaceNavNode } from "@/types/workspace";
import {
  FolderIcon,
  GroupToggleIcon,
  HomeIcon,
  MoreDotsIcon,
  StarIcon,
} from "@/icons/workspace-icons";
import { getLeafHref } from "./helpers";

export type NavTreeRowProps = {
  node: WorkspaceNavNode;
  depth: number;
  pathname: string;
  expanded_group_ids: Record<string, boolean>;
  onToggleGroup: (group_id: string) => void;
  onOpenRowMenu: (event: React.MouseEvent, node: WorkspaceNavNode) => void;
  /** Flags/unflags this row as priority — the nav tree's own priority star. */
  onTogglePriority: (node: WorkspaceNavNode) => void;
};

/** Priority star color — matches the board table's item/subitem priority star (see ItemRow.tsx). */
const PRIORITY_COLOR = "#fdab3d";

type PriorityStarProps = { node: WorkspaceNavNode; onTogglePriority: (node: WorkspaceNavNode) => void; size?: number };

/**
 * The sidebar row's single star: solid orange once a board/folder is flagged
 * as priority, hidden until the row is hovered otherwise — so unflagged rows
 * stay clean and every row's star lands in the same spot (same button size
 * whether or not the icon inside is visible). Mirrors the priority star
 * already used for workspaces themselves (see WorkspaceCard.tsx / the
 * WorkspaceSwitcher's WorkspaceRow).
 */
const PriorityStar: React.FC<PriorityStarProps> = ({ node, onTogglePriority, size = 13 }) => (
  <button
    type="button"
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onTogglePriority(node);
    }}
    title={node.is_priority ? "Unmark as priority" : "Mark as priority"}
    aria-label={node.is_priority ? "Unmark as priority" : "Mark as priority"}
    className="relative z-2 flex h-6 w-6 flex-none items-center justify-center rounded-md hover:bg-shell-hover-strong"
    style={{ color: node.is_priority ? PRIORITY_COLOR : "var(--color-shell-text-faint)" }}
  >
    <span className={node.is_priority ? "" : "opacity-0 group-hover:opacity-100"}>
      <StarIcon filled={node.is_priority} size={size} />
    </span>
  </button>
);

/** Left indent grows with depth so arbitrarily-nested folders stay readable. */
const indentFor = (depth: number): number => 10 + depth * 20;

const isLeafActive = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

/**
 * A single navigation row. Groups (folders) toggle their children; leaves
 * (views) link to their route. Recurses over `children`, so the same component
 * renders the whole unbounded tree.
 */
const NavTreeRow: React.FC<NavTreeRowProps> = ({
  node,
  depth,
  pathname,
  expanded_group_ids,
  onToggleGroup,
  onOpenRowMenu,
  onTogglePriority,
}) => {
  const padding_left = indentFor(depth);

  // Drag-and-drop reordering among this row's current siblings (root list, or
  // one folder's children — see the `SortableContext` each level wraps its
  // children in below). `NavTree`'s `DndContext` owns the actual persistence.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(node.id),
  });
  const sortable_style: React.CSSProperties = {
    paddingLeft: padding_left,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleKebabClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenRowMenu(event, node);
  };

  if (node.type === "group") {
    const group_id = String(node.id);
    const is_expanded = expanded_group_ids[group_id] ?? true;

    return (
      <>
        <div
          ref={setNodeRef}
          style={sortable_style}
          {...attributes}
          {...listeners}
          className="group flex h-[34px] cursor-grab items-center gap-[7px] rounded-[9px] pr-2 hover:bg-shell-hover active:cursor-grabbing"
          onClick={() => onToggleGroup(group_id)}
        >
          <span
            className="flex flex-none text-shell-text-muted transition-transform duration-150"
            style={{ transform: is_expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            <GroupToggleIcon />
          </span>
          <span className="flex-1 truncate text-sm font-semibold text-shell-text">
            {node.label}
          </span>
          <PriorityStar node={node} onTogglePriority={onTogglePriority} />
          <button
            type="button"
            onClick={handleKebabClick}
            className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-shell-text-secondary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-shell-hover-strong hover:text-shell-text"
            aria-label={`${node.label} options`}
          >
            <MoreDotsIcon />
          </button>
        </div>
        {is_expanded && (
          <SortableContext
            items={node.children.map((child) => String(child.id))}
            strategy={verticalListSortingStrategy}
          >
            {node.children.map((child) => (
              <NavTreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                pathname={pathname}
                expanded_group_ids={expanded_group_ids}
                onToggleGroup={onToggleGroup}
                onOpenRowMenu={onOpenRowMenu}
                onTogglePriority={onTogglePriority}
              />
            ))}
          </SortableContext>
        )}
      </>
    );
  }

  const is_group_style = node.display_style === "group";
  const href = getLeafHref(node);
  const is_active = isLeafActive(pathname, href);
  const row_height = is_group_style ? "h-[34px]" : "h-9";

  return (
    <Link
      ref={setNodeRef}
      href={href}
      {...attributes}
      {...listeners}
      className={`group relative flex ${row_height} cursor-grab items-center gap-[11px] rounded-[9px] pr-2 hover:bg-shell-hover active:cursor-grabbing`}
      style={sortable_style}
    >
      {is_active && (
        <div className="shell-nav-item-active absolute inset-0 rounded-[9px]" />
      )}
      <span
        className={`relative z-1 flex flex-none ${is_active ? "text-white" : "text-shell-text-secondary"}`}
      >
        {is_group_style ? (
          <GroupToggleIcon />
        ) : node.icon === "home" ? (
          <HomeIcon size={16} />
        ) : (
          <FolderIcon size={15} />
        )}
      </span>
      <span
        className={`relative z-1 flex-1 truncate text-sm ${is_group_style ? "font-semibold" : "font-normal"} ${is_active ? "text-white" : "text-shell-text"}`}
      >
        {node.label}
      </span>
      <span className="ml-auto flex items-center gap-[7px]">
        <PriorityStar node={node} onTogglePriority={onTogglePriority} />
        <button
          type="button"
          onClick={handleKebabClick}
          className="relative z-2 flex h-6 w-6 flex-none items-center justify-center rounded-md text-shell-text-secondary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-shell-hover-strong hover:text-shell-text"
          aria-label={`${node.label} options`}
        >
          <MoreDotsIcon />
        </button>
      </span>
    </Link>
  );
};

export default NavTreeRow;
