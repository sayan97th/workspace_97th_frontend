"use client";
import React from "react";
import Link from "next/link";
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
  /** Slugs from the workspace root down to and including this node. */
  slug_path: string[];
  workspace_slug: string;
  pathname: string;
  expanded_group_ids: Record<string, boolean>;
  onToggleGroup: (group_id: string) => void;
  onOpenRowMenu: (event: React.MouseEvent, node: WorkspaceNavNode) => void;
};

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
  slug_path,
  workspace_slug,
  pathname,
  expanded_group_ids,
  onToggleGroup,
  onOpenRowMenu,
}) => {
  const padding_left = indentFor(depth);

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
          className="group flex h-[34px] cursor-pointer items-center gap-[7px] rounded-[9px] pr-2 hover:bg-shell-hover"
          style={{ paddingLeft: padding_left }}
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
          <button
            type="button"
            onClick={handleKebabClick}
            className="ml-auto flex h-6 w-6 flex-none items-center justify-center rounded-md text-shell-text-secondary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-shell-hover-strong hover:text-shell-text"
            aria-label={`${node.label} options`}
          >
            <MoreDotsIcon />
          </button>
        </div>
        {is_expanded &&
          node.children.map((child) => (
            <NavTreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              slug_path={[...slug_path, child.slug]}
              workspace_slug={workspace_slug}
              pathname={pathname}
              expanded_group_ids={expanded_group_ids}
              onToggleGroup={onToggleGroup}
              onOpenRowMenu={onOpenRowMenu}
            />
          ))}
      </>
    );
  }

  const is_group_style = node.display_style === "group";
  const href = getLeafHref(workspace_slug, node, slug_path);
  const is_active = isLeafActive(pathname, href);
  const row_height = is_group_style ? "h-[34px]" : "h-9";

  return (
    <Link
      href={href}
      className={`group relative flex ${row_height} cursor-pointer items-center gap-[11px] rounded-[9px] pr-2 hover:bg-shell-hover`}
      style={{ paddingLeft: padding_left }}
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
      {node.is_favorite && (
        <span className="relative z-1 flex flex-none text-sunset-200">
          <StarIcon filled size={13} />
        </span>
      )}
      <button
        type="button"
        onClick={handleKebabClick}
        className="relative z-2 ml-auto flex h-6 w-6 flex-none items-center justify-center rounded-md text-shell-text-secondary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-shell-hover-strong hover:text-shell-text"
        aria-label={`${node.label} options`}
      >
        <MoreDotsIcon />
      </button>
    </Link>
  );
};

export default NavTreeRow;
