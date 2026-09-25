"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { WorkspaceNavNode } from "@/types/workspace";
import { GroupToggleIcon, MoreDotsIcon, StarIcon } from "@/icons/workspace-icons";
import NavItemIcon, { NavPrivacyBadge } from "./NavItemIcon";
import { getLeafHref } from "./helpers";
import { splitByMatch, type NavDropPosition, type VisibleNavRow } from "./navTreeUtils";

export type NavTreeRowProps = {
  row: VisibleNavRow;
  is_expanded: boolean;
  is_active: boolean;
  is_selected: boolean;
  /** The one row that takes Tab focus (roving tabindex), see `NavTree`'s keyboard navigation. */
  is_focus_target: boolean;
  is_renaming: boolean;
  /** Where a row being dragged over this one would land, null when nothing is dragged over it. */
  drop_position: NavDropPosition | null;
  is_drag_disabled: boolean;
  /** Highlights the matching part of the label while the sidebar search is active. */
  search_query: string;
  registerRowRef: (node_id: number, element: HTMLElement | null) => void;
  /** Returns true when the click was a selection gesture (Ctrl/Cmd/Shift), so the row must not navigate or toggle. */
  onRowClick: (event: React.MouseEvent, node: WorkspaceNavNode) => boolean;
  onToggleGroup: (node: WorkspaceNavNode) => void;
  onFocusRow: (node: WorkspaceNavNode) => void;
  onOpenRowMenu: (event: React.MouseEvent, node: WorkspaceNavNode) => void;
  /** Flags/unflags this row as priority, the nav tree's own priority star. */
  onTogglePriority: (node: WorkspaceNavNode) => void;
  onStartRename: (node: WorkspaceNavNode) => void;
  onSubmitRename: (node: WorkspaceNavNode, label: string) => void;
  onCancelRename: () => void;
};

/** Priority star color, matches the board table's item/subitem priority star (see ItemRow.tsx). */
const PRIORITY_COLOR = "#fdab3d";

/** Left indent grows with depth so arbitrarily nested folders stay readable. */
const indentFor = (depth: number): number => 10 + depth * 20;

type PriorityStarProps = { node: WorkspaceNavNode; onTogglePriority: (node: WorkspaceNavNode) => void };

/**
 * The row's single star: solid orange once a board/folder is flagged as
 * priority, hidden until the row is hovered otherwise, so unflagged rows stay
 * clean and every row's star lands in the same spot.
 */
const PriorityStar: React.FC<PriorityStarProps> = ({ node, onTogglePriority }) => (
  <button
    type="button"
    tabIndex={-1}
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
      <StarIcon filled={node.is_priority} size={13} />
    </span>
  </button>
);

/** In place rename field: Enter or blur saves, Escape cancels. */
const RenameInput: React.FC<{ node: WorkspaceNavNode; onSubmit: (label: string) => void; onCancel: () => void }> = ({ node, onSubmit, onCancel }) => {
  const [value, setValue] = useState(node.label);
  const input_ref = useRef<HTMLInputElement>(null);
  const is_done_ref = useRef(false);

  useEffect(() => {
    input_ref.current?.focus();
    input_ref.current?.select();
  }, []);

  const finish = (should_save: boolean) => {
    if (is_done_ref.current) return;
    is_done_ref.current = true;
    const label = value.trim();
    if (should_save && label && label !== node.label) onSubmit(label);
    else onCancel();
  };

  return (
    <input
      ref={input_ref}
      value={value}
      maxLength={255}
      aria-label={`Rename ${node.label}`}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(true)}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") finish(true);
        if (event.key === "Escape") finish(false);
      }}
      className="relative z-2 h-7 min-w-0 flex-1 rounded-md border border-[#2B76E5] bg-shell-panel px-2 text-sm text-shell-text outline-none"
    />
  );
};

const HighlightedLabel: React.FC<{ label: string; query: string }> = ({ label, query }) => (
  <>
    {splitByMatch(label, query).map((part, index) =>
      part.is_match ? (
        <mark key={index} className="rounded-[3px] bg-[#fdab3d]/35 text-inherit">
          {part.text}
        </mark>
      ) : (
        <React.Fragment key={index}>{part.text}</React.Fragment>
      )
    )}
  </>
);

/**
 * One row of the sidebar's navigation tree. `NavTree` renders the tree as a
 * flat list of visible rows (see `flattenVisibleNodes`), so each row only
 * needs its depth for the indent. A row is both draggable and a drop target:
 * dropping on a folder's middle moves the dragged row inside it, dropping on
 * the top or bottom edge places it before or after, in any folder.
 */
const NavTreeRow: React.FC<NavTreeRowProps> = ({
  row,
  is_expanded,
  is_active,
  is_selected,
  is_focus_target,
  is_renaming,
  drop_position,
  is_drag_disabled,
  search_query,
  registerRowRef,
  onRowClick,
  onToggleGroup,
  onFocusRow,
  onOpenRowMenu,
  onTogglePriority,
  onStartRename,
  onSubmitRename,
  onCancelRename,
}) => {
  const { node, depth } = row;
  const padding_left = indentFor(depth);
  const is_group = node.type === "group";
  const id = String(node.id);

  const draggable = useDraggable({ id, disabled: is_drag_disabled || is_renaming });
  const droppable = useDroppable({ id, disabled: is_drag_disabled });

  const setRef = (element: HTMLElement | null) => {
    draggable.setNodeRef(element);
    droppable.setNodeRef(element);
    registerRowRef(node.id, element);
  };

  const handleKebabClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenRowMenu(event, node);
  };

  const handleClick = (event: React.MouseEvent) => {
    if (is_renaming) {
      event.preventDefault();
      return;
    }
    if (onRowClick(event, node)) {
      event.preventDefault();
      return;
    }
    if (is_group) onToggleGroup(node);
  };

  const state_class = is_selected
    ? "bg-[#2B76E5]/[0.16] ring-1 ring-inset ring-[#2B76E5]/45"
    : drop_position === "inside"
      ? "bg-[#2B76E5]/[0.12] ring-2 ring-inset ring-[#2B76E5]"
      : "hover:bg-shell-hover";

  const row_class = `group relative flex ${is_group ? "h-[34px]" : "h-9"} items-center gap-[9px] rounded-[9px] pr-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2B76E5]/70 ${
    is_drag_disabled ? "" : "cursor-grab active:cursor-grabbing"
  } ${state_class}`;

  const style: React.CSSProperties = {
    paddingLeft: padding_left,
    opacity: draggable.isDragging ? 0.4 : 1,
  };

  const text_class = is_active && !is_selected ? "text-white" : "text-shell-text";

  const content = (
    <>
      {is_active && !is_selected && <div className="shell-nav-item-active absolute inset-0 rounded-[9px]" />}
      {drop_position === "before" || drop_position === "after" ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-2 z-3 h-[2px] rounded-full bg-[#2B76E5] ${drop_position === "before" ? "-top-px" : "-bottom-px"}`}
          style={{ left: padding_left }}
        >
          <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full border-2 border-[#2B76E5] bg-shell-surface" />
        </span>
      ) : null}

      {is_group && (
        <span
          className="relative z-1 flex flex-none text-shell-text-muted transition-transform duration-150"
          style={{ transform: is_expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <GroupToggleIcon />
        </span>
      )}
      <NavItemIcon
        source={node}
        size={is_group ? 15 : node.icon === "home" ? 16 : 15}
        className={`relative z-1 ${is_active && !is_selected ? "text-white" : "text-shell-text-secondary"}`}
      />

      {is_renaming ? (
        <RenameInput node={node} onSubmit={(label) => onSubmitRename(node, label)} onCancel={onCancelRename} />
      ) : (
        <span
          className={`relative z-1 min-w-0 flex-1 truncate text-sm ${is_group || node.display_style === "group" ? "font-semibold" : "font-normal"} ${text_class}`}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onStartRename(node);
          }}
        >
          <HighlightedLabel label={node.label} query={search_query} />
        </span>
      )}

      {!is_group && !is_renaming && (
        <NavPrivacyBadge board_type={node.board_type} className={`relative z-1 ${is_active && !is_selected ? "text-white/80" : "text-shell-text-muted"}`} />
      )}

      {!is_renaming && (
        <span className="ml-auto flex items-center gap-[5px]">
          <PriorityStar node={node} onTogglePriority={onTogglePriority} />
          <button
            type="button"
            tabIndex={-1}
            onClick={handleKebabClick}
            onPointerDown={(event) => event.stopPropagation()}
            className="relative z-2 flex h-6 w-6 flex-none items-center justify-center rounded-md text-shell-text-secondary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 hover:bg-shell-hover-strong hover:text-shell-text"
            aria-label={`${node.label} options`}
          >
            <MoreDotsIcon />
          </button>
        </span>
      )}
    </>
  );

  const shared_props = {
    ref: setRef,
    role: "treeitem",
    "aria-level": depth + 1,
    "aria-selected": is_selected,
    "aria-expanded": is_group ? is_expanded : undefined,
    "data-nav-id": node.id,
    tabIndex: is_focus_target ? 0 : -1,
    onFocus: () => onFocusRow(node),
    onClick: handleClick,
    className: row_class,
    style,
    ...(is_renaming ? {} : draggable.attributes),
    ...(is_renaming ? {} : draggable.listeners),
  };

  // dnd-kit's own attributes set role="button" and tabIndex=0; the tree semantics win.
  shared_props.role = "treeitem";
  shared_props.tabIndex = is_focus_target ? 0 : -1;

  if (is_group || is_renaming) {
    return <div {...shared_props}>{content}</div>;
  }

  return (
    <Link {...shared_props} href={getLeafHref(node)} aria-current={is_active ? "page" : undefined}>
      {content}
    </Link>
  );
};

export default NavTreeRow;
