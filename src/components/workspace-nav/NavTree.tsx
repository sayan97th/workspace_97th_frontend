"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { CreateNavItemPayload, WorkspaceNavNode } from "@/types/workspace";
import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  DashboardIcon,
  DeleteIcon,
  DuplicateIcon,
  FileIcon,
  FolderIcon,
  LinkIcon,
  MoreDotsIcon,
  MoveDownIcon,
  MoveToIcon,
  MoveUpIcon,
  OpenInNewTabIcon,
  PlusIcon,
  RenameIcon,
  SidebarFolderIcon,
  SortIcon,
  StarIcon,
} from "@/icons/workspace-icons";
import NavTreeRow from "./NavTreeRow";
import NavItemIcon from "./NavItemIcon";
import FolderColorPopover from "./FolderColorPopover";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import NavItemFormModal from "./NavItemFormModal";
import MoveNavItemModal from "./MoveNavItemModal";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { collectGroupIds, getLeafHref, locateNavNode } from "./helpers";
import {
  buildDropPayload,
  filterNavTree,
  flattenVisibleNodes,
  isNavDescendant,
  resolveDropPosition,
  type NavDropTarget,
} from "./navTreeUtils";
import type { WorkspaceNavApi } from "./useWorkspaceNav";

export type NavTreeProps = {
  nav: WorkspaceNavApi;
  workspace_slug: string;
  /** The sidebar search text; a non empty query filters the tree, opens every folder and pauses drag and drop. */
  search_query?: string;
};

type MenuState = {
  is_open: boolean;
  /** The clicked kebab/add button, {@link AnchoredMenu} measures itself against it. */
  anchor_el: HTMLElement | null;
  /** "root": the header's "+" menu, "header": the header's "..." menu, a node: that row's kebab menu. */
  target: "root" | "header" | WorkspaceNavNode | null;
};

/** What the name dialog creates: a folder or one kind of board, at the root or inside a folder. */
type FormState = {
  is_open: boolean;
  title: string;
  placeholder: string;
  parent_id: number | null;
  payload: Omit<CreateNavItemPayload, "label" | "parent_id">;
};

type ColorState = { anchor_el: HTMLElement | null; node: WorkspaceNavNode | null };

const CLOSED_MENU: MenuState = { is_open: false, anchor_el: null, target: null };
const CLOSED_FORM: FormState = { is_open: false, title: "", placeholder: "", parent_id: null, payload: { type: "group" } };

/** Delay before a collapsed folder opens while a row is dragged over its middle, like monday.com. */
const AUTO_EXPAND_DELAY_MS = 600;

type CreateOption = { key: string; label: string; icon: React.ReactNode; placeholder: string; payload: FormState["payload"] };

const CREATE_OPTIONS: CreateOption[] = [
  { key: "board", label: "New board", icon: <FolderIcon size={15} />, placeholder: "Board name", payload: { type: "leaf", view_key: "board" } },
  { key: "doc", label: "New doc", icon: <FileIcon size={15} />, placeholder: "Doc name", payload: { type: "leaf", view_key: "doc" } },
  { key: "dashboard", label: "New dashboard", icon: <DashboardIcon size={15} />, placeholder: "Dashboard name", payload: { type: "leaf", view_key: "dashboard" } },
  { key: "folder", label: "New folder", icon: <SidebarFolderIcon size={15} />, placeholder: "Folder name", payload: { type: "group" } },
];

/** A static copy of a row's icon and label, floated under the pointer while it is dragged. */
const NavRowPreview: React.FC<{ node: WorkspaceNavNode }> = ({ node }) => (
  <div className="flex h-9 w-[260px] items-center gap-[9px] rounded-[9px] bg-shell-panel px-2.5 text-shell-text shadow-2xl ring-1 ring-[#2B76E5]/60">
    <NavItemIcon source={node} className="text-shell-text-secondary" />
    <span className="flex-1 truncate text-sm">{node.label}</span>
  </div>
);

const isLeafActive = (pathname: string, href: string): boolean => pathname === href || pathname.startsWith(`${href}/`);

/**
 * The workspace's navigation tree plus all of its editing affordances:
 *
 * - Drag and drop anywhere: before or after any row, or into a folder (a
 *   collapsed folder opens after a short hover), saved on the server.
 * - Search filtering with highlighted matches (see `search_query`).
 * - Keyboard navigation (arrows, Home/End, Enter, F2 to rename, Space to
 *   select, Escape to clear) with a roving tabindex.
 * - Multi-select (Ctrl/Cmd+click, Shift+click) with a bulk bar to move,
 *   archive or delete the selection.
 * - Inline rename (double click or F2), folder colors, and a header menu
 *   with Expand all, Collapse all and Sort A to Z.
 */
const NavTree: React.FC<NavTreeProps> = ({ nav, workspace_slug, search_query = "" }) => {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const toast = useToast();

  const [menu, setMenu] = useState<MenuState>(CLOSED_MENU);
  const [form, setForm] = useState<FormState>(CLOSED_FORM);
  const [moving_nodes, setMovingNodes] = useState<WorkspaceNavNode[]>([]);
  const [pending_delete, setPendingDelete] = useState<WorkspaceNavNode[]>([]);
  const [pending_archive, setPendingArchive] = useState<WorkspaceNavNode[]>([]);
  const [color_target, setColorTarget] = useState<ColorState>({ anchor_el: null, node: null });
  const [active_drag_id, setActiveDragId] = useState<number | null>(null);
  const [drop_target, setDropTarget] = useState<NavDropTarget | null>(null);
  const [selected_ids, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [selection_anchor_id, setSelectionAnchorId] = useState<number | null>(null);
  const [focused_id, setFocusedId] = useState<number | null>(null);
  const [renaming_id, setRenamingId] = useState<number | null>(null);

  const row_refs = useRef(new Map<number, HTMLElement>());
  const auto_expand_ref = useRef<{ group_id: number; timer: ReturnType<typeof setTimeout> } | null>(null);

  const is_searching = search_query.trim().length > 0;

  // Selection and rename belong to one workspace's tree.
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionAnchorId(null);
    setRenamingId(null);
  }, [workspace_slug]);

  const display_tree = useMemo(() => filterNavTree(nav.tree, search_query), [nav.tree, search_query]);
  const isExpanded = useCallback(
    (group_id: number) => (is_searching ? true : nav.isGroupExpanded(group_id)),
    [is_searching, nav]
  );
  const visible_rows = useMemo(() => flattenVisibleNodes(display_tree, isExpanded), [display_tree, isExpanded]);

  const selected_nodes = useMemo(
    () => visible_rows.filter((row) => selected_ids.has(row.node.id)).map((row) => row.node),
    [visible_rows, selected_ids]
  );

  const active_row_id = useMemo(
    () => visible_rows.find((row) => row.node.type === "leaf" && isLeafActive(pathname, getLeafHref(row.node)))?.node.id ?? null,
    [visible_rows, pathname]
  );
  const focus_target_id =
    focused_id !== null && visible_rows.some((row) => row.node.id === focused_id)
      ? focused_id
      : active_row_id ?? visible_rows[0]?.node.id ?? null;

  const registerRowRef = useCallback((node_id: number, element: HTMLElement | null) => {
    if (element) row_refs.current.set(node_id, element);
    else row_refs.current.delete(node_id);
  }, []);

  const focusRow = (node_id: number) => {
    setFocusedId(node_id);
    row_refs.current.get(node_id)?.focus();
    row_refs.current.get(node_id)?.scrollIntoView({ block: "nearest" });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionAnchorId(null);
  };

  const toggleSelected = (node_id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(node_id)) next.delete(node_id);
      else next.add(node_id);
      return next;
    });
    setSelectionAnchorId(node_id);
  };

  const selectRange = (node_id: number) => {
    const anchor_id = selection_anchor_id ?? focus_target_id ?? node_id;
    const from = visible_rows.findIndex((row) => row.node.id === anchor_id);
    const to = visible_rows.findIndex((row) => row.node.id === node_id);
    if (from === -1 || to === -1) return;
    const [start, end] = from < to ? [from, to] : [to, from];
    setSelectedIds(new Set(visible_rows.slice(start, end + 1).map((row) => row.node.id)));
  };

  // ── Row interactions ────────────────────────────────────────────────────

  const handleRowClick = (event: React.MouseEvent, node: WorkspaceNavNode): boolean => {
    setFocusedId(node.id);
    if (event.shiftKey) {
      selectRange(node.id);
      return true;
    }
    if (event.metaKey || event.ctrlKey) {
      toggleSelected(node.id);
      return true;
    }
    if (selected_ids.size > 0) clearSelection();
    return false;
  };

  const handleToggleGroup = (node: WorkspaceNavNode) => {
    if (!is_searching) nav.toggleGroup(String(node.id));
  };

  const submitRename = async (node: WorkspaceNavNode, label: string) => {
    setRenamingId(null);
    try {
      await nav.renameItem(node.id, label);
    } catch (error) {
      toast.error(apiErrorMessage(error, "We couldn't rename this item."));
    }
    row_refs.current.get(node.id)?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (renaming_id !== null || visible_rows.length === 0) return;
    if (!(event.target instanceof HTMLElement) || !event.target.matches("[data-nav-id]")) return;

    const index = Math.max(0, visible_rows.findIndex((row) => row.node.id === focus_target_id));
    const current = visible_rows[index];
    const focusIndex = (next_index: number) => {
      const row = visible_rows[Math.min(visible_rows.length - 1, Math.max(0, next_index))];
      if (row) focusRow(row.node.id);
    };

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusIndex(index + 1);
        if (event.shiftKey) selectRange(visible_rows[Math.min(visible_rows.length - 1, index + 1)].node.id);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusIndex(index - 1);
        if (event.shiftKey) selectRange(visible_rows[Math.max(0, index - 1)].node.id);
        break;
      case "Home":
        event.preventDefault();
        focusIndex(0);
        break;
      case "End":
        event.preventDefault();
        focusIndex(visible_rows.length - 1);
        break;
      case "ArrowRight":
        event.preventDefault();
        if (current.node.type === "group") {
          if (!isExpanded(current.node.id)) handleToggleGroup(current.node);
          else if (current.node.children.length > 0) focusIndex(index + 1);
        }
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (current.node.type === "group" && isExpanded(current.node.id) && !is_searching) {
          handleToggleGroup(current.node);
        } else if (current.parent_id !== null) {
          focusRow(current.parent_id);
        }
        break;
      case "Enter":
        event.preventDefault();
        if (current.node.type === "group") handleToggleGroup(current.node);
        else router.push(getLeafHref(current.node));
        break;
      case " ":
        event.preventDefault();
        toggleSelected(current.node.id);
        break;
      case "F2":
        event.preventDefault();
        setRenamingId(current.node.id);
        break;
      case "Escape":
        if (selected_ids.size > 0) {
          event.preventDefault();
          clearSelection();
        }
        break;
    }
  };

  // ── Drag and drop ───────────────────────────────────────────────────────

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const cancelAutoExpand = () => {
    if (auto_expand_ref.current) clearTimeout(auto_expand_ref.current.timer);
    auto_expand_ref.current = null;
  };

  // The real pointer position, tracked while a row is dragged. dnd-kit's own
  // `delta` includes scroll adjustments, so it drifts from the pointer once
  // the sidebar scrolls (auto scroll included) during the drag.
  const pointer_y_ref = useRef(0);
  const stop_pointer_tracking_ref = useRef<(() => void) | null>(null);

  const stopPointerTracking = () => {
    stop_pointer_tracking_ref.current?.();
    stop_pointer_tracking_ref.current = null;
  };

  useEffect(
    () => () => {
      cancelAutoExpand();
      stopPointerTracking();
    },
    []
  );

  /** Where the dragged row would land over `over_id`, from the pointer and the hovered row's live rect. */
  const computeDropTarget = (active_id: number, over_id: number | null): NavDropTarget | null => {
    if (over_id === null || over_id === active_id) return null;
    const moved = locateNavNode(nav.tree, active_id)?.node;
    const over_node = locateNavNode(nav.tree, over_id)?.node;
    const over_element = row_refs.current.get(over_id);
    if (!moved || !over_node || !over_element) return null;
    if (moved.type === "group" && isNavDescendant(moved, over_id)) return null;
    return { node_id: over_id, position: resolveDropPosition(over_node, pointer_y_ref.current, over_element.getBoundingClientRect()) };
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(Number(event.active.id));
    setRenamingId(null);
    pointer_y_ref.current = (event.activatorEvent as PointerEvent).clientY;
    const trackPointer = (pointer_event: PointerEvent) => {
      pointer_y_ref.current = pointer_event.clientY;
    };
    window.addEventListener("pointermove", trackPointer);
    stop_pointer_tracking_ref.current = () => window.removeEventListener("pointermove", trackPointer);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const target = computeDropTarget(Number(event.active.id), event.over ? Number(event.over.id) : null);
    setDropTarget((current) => (current && target && current.node_id === target.node_id && current.position === target.position ? current : target));

    const group_id = target?.position === "inside" ? target.node_id : null;
    if (group_id !== null && !nav.isGroupExpanded(group_id)) {
      if (auto_expand_ref.current?.group_id !== group_id) {
        cancelAutoExpand();
        auto_expand_ref.current = {
          group_id,
          timer: setTimeout(() => nav.setGroupsExpanded([group_id], true), AUTO_EXPAND_DELAY_MS),
        };
      }
    } else {
      cancelAutoExpand();
    }
  };

  const resetDrag = () => {
    setActiveDragId(null);
    setDropTarget(null);
    cancelAutoExpand();
    stopPointerTracking();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Recomputed at the drop itself, so the last pointer position always wins.
    const target = computeDropTarget(Number(event.active.id), event.over ? Number(event.over.id) : null);
    resetDrag();
    if (!target) return;

    const payload = buildDropPayload(nav.tree, Number(event.active.id), target);
    if (!payload) return;
    if (target.position === "inside") nav.setGroupsExpanded([target.node_id], true);

    nav.reorderItem(payload).catch((error) => toast.error(apiErrorMessage(error, "We couldn't move this item.")));
  };

  const active_drag_node = active_drag_id !== null ? locateNavNode(nav.tree, active_drag_id)?.node ?? null : null;

  // ── Menus ───────────────────────────────────────────────────────────────

  const closeMenu = () => setMenu(CLOSED_MENU);

  const openCreateForm = (option: CreateOption, parent_id: number | null) =>
    setForm({ is_open: true, title: option.label, placeholder: option.placeholder, parent_id, payload: option.payload });

  const copyLink = async (node: WorkspaceNavNode) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${getLeafHref(node)}`);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("We couldn't copy the link.");
    }
  };

  const buildRootItems = (): AnchoredMenuItem[] =>
    CREATE_OPTIONS.map((option) => ({ key: option.key, label: option.label, icon: option.icon, onClick: () => openCreateForm(option, null) }));

  const buildHeaderItems = (): AnchoredMenuItem[] => {
    const group_ids = collectGroupIds(nav.tree).map(Number);
    return [
      { key: "expand-all", label: "Expand all folders", icon: <ChevronDownIcon size={13} />, disabled: group_ids.length === 0, onClick: () => nav.setGroupsExpanded(group_ids, true) },
      { key: "collapse-all", label: "Collapse all folders", icon: <ChevronRightIcon size={13} />, disabled: group_ids.length === 0, onClick: () => nav.setGroupsExpanded(group_ids, false) },
      {
        key: "sort",
        label: "Sort A to Z",
        icon: <SortIcon />,
        disabled: nav.tree.length < 2 && group_ids.length === 0,
        onClick: () => {
          nav
            .sortAlphabetically()
            .then(() => toast.success("Sorted folders and boards A to Z"))
            .catch((error) => toast.error(apiErrorMessage(error, "We couldn't sort this workspace.")));
        },
      },
    ];
  };

  const buildNodeItems = (node: WorkspaceNavNode): AnchoredMenuItem[] => {
    const location = locateNavNode(nav.tree, node.id);
    const can_move_up = Boolean(location && location.index > 0);
    const can_move_down = Boolean(location && location.index < location.siblings.length - 1);
    const items: AnchoredMenuItem[] = [];

    if (node.type === "group") {
      // Flat rather than a flyout: the sidebar hugs the left edge, a side submenu would open off screen.
      items.push(
        ...CREATE_OPTIONS.map((option) => ({ key: `add-${option.key}`, label: option.label, icon: option.icon, onClick: () => openCreateForm(option, node.id) })),
        {
          key: "color",
          label: "Change color",
          icon: <span className="flex h-[15px] w-[15px] rounded-full" style={{ background: node.color ?? "var(--color-shell-text-muted)" }} />,
          onClick: () => setColorTarget({ anchor_el: row_refs.current.get(node.id) ?? null, node }),
        }
      );
    } else {
      items.push(
        { key: "open-new-tab", label: "Open in new tab", icon: <OpenInNewTabIcon />, onClick: () => window.open(getLeafHref(node), "_blank", "noopener") },
        { key: "copy-link", label: "Copy link", icon: <LinkIcon />, onClick: () => void copyLink(node) }
      );
    }

    items.push(
      { key: "rename", label: "Rename", icon: <RenameIcon />, onClick: () => setRenamingId(node.id) },
      { key: "move", label: "Move to", icon: <MoveToIcon />, onClick: () => setMovingNodes([node]) },
      { key: "move-up", label: "Move up", icon: <MoveUpIcon />, disabled: !can_move_up, onClick: () => void nav.moveItemUp(node.id) },
      { key: "move-down", label: "Move down", icon: <MoveDownIcon />, disabled: !can_move_down, onClick: () => void nav.moveItemDown(node.id) },
      {
        key: "favorite",
        label: node.is_favorite ? "Remove from favorites" : "Add to favorites",
        icon: <StarIcon filled={node.is_favorite} />,
        onClick: () => void nav.toggleFavorite(node.id, !node.is_favorite),
      },
      {
        key: "priority",
        label: node.is_priority ? "Unmark as priority" : "Mark as priority",
        icon: <StarIcon filled={node.is_priority} />,
        onClick: () => void nav.togglePriority(node.id, !node.is_priority),
      },
      { key: "duplicate", label: "Duplicate", icon: <DuplicateIcon />, onClick: () => void nav.duplicateItem(node.id) },
      { key: "archive", label: "Archive", icon: <ArchiveIcon />, onClick: () => setPendingArchive([node]) },
      { key: "delete", label: "Delete", icon: <DeleteIcon />, danger: true, onClick: () => setPendingDelete([node]) }
    );

    return items;
  };

  const menu_items =
    menu.target === "root" ? buildRootItems() : menu.target === "header" ? buildHeaderItems() : menu.target ? buildNodeItems(menu.target) : [];
  const menu_title = menu.target && typeof menu.target === "object" ? menu.target.label : menu.target === "header" ? "Content" : undefined;

  // ── Mutations with feedback ─────────────────────────────────────────────

  const submitForm = async (label: string) => {
    await nav.createItem({ ...form.payload, label, parent_id: form.parent_id });
    if (form.parent_id !== null) nav.setGroupsExpanded([form.parent_id], true);
  };

  const runBulk = async (action: "archive" | "delete", nodes: WorkspaceNavNode[]) => {
    try {
      await nav.bulkAction({ action, item_ids: nodes.map((node) => node.id) });
      clearSelection();
      const noun = nodes.length === 1 ? `"${nodes[0].label}"` : `${nodes.length} items`;
      toast.success(action === "archive" ? `Archived ${noun}` : `Moved ${noun} to trash`);
    } catch (error) {
      toast.error(apiErrorMessage(error, `We couldn't ${action} the selection.`));
    }
  };

  const submitMove = async (parent_id: number | null) => {
    try {
      if (moving_nodes.length === 1) {
        await nav.moveItem(moving_nodes[0].id, { parent_id });
      } else {
        await nav.bulkAction({ action: "move", item_ids: moving_nodes.map((node) => node.id), parent_id });
        clearSelection();
      }
      if (parent_id !== null) nav.setGroupsExpanded([parent_id], true);
    } catch (error) {
      toast.error(apiErrorMessage(error, "We couldn't move the selection."));
    }
  };

  const describeTargets = (nodes: WorkspaceNavNode[]) =>
    nodes.length === 1 ? <>&ldquo;{nodes[0].label}&rdquo;{nodes[0].type === "group" ? " and everything inside it" : ""}</> : <>{nodes.length} items (and everything inside the selected folders)</>;

  return (
    <>
      <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2 text-xs font-semibold tracking-[0.04em] text-shell-text-muted">
        <span>{is_searching ? "Search results" : "Content"}</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(event) => setMenu({ is_open: true, anchor_el: event.currentTarget, target: "header" })}
            className="flex h-5 w-5 items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover-strong hover:text-shell-text"
            aria-label="Content options"
            title="Content options"
          >
            <MoreDotsIcon size={13} />
          </button>
          <button
            type="button"
            onClick={(event) => setMenu({ is_open: true, anchor_el: event.currentTarget, target: "root" })}
            className="flex h-5 w-5 items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover-strong hover:text-shell-text"
            aria-label="Add navigation item"
            title="Add"
          >
            <PlusIcon size={14} />
          </button>
        </div>
      </div>

      {nav.is_loading && nav.tree.length === 0 ? (
        <div className="space-y-1.5 px-2.5 py-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-8 animate-pulse rounded-[9px] bg-shell-hover" />
          ))}
        </div>
      ) : nav.error ? (
        <div className="px-2.5 py-4 text-sm text-shell-text-muted">
          {nav.error}{" "}
          <button type="button" onClick={() => void nav.reload()} className="font-semibold text-brand-200 hover:underline">
            Retry
          </button>
        </div>
      ) : nav.tree.length === 0 ? (
        <div className="px-2.5 py-4 text-sm text-shell-text-muted">No items yet. Use the + button to add one.</div>
      ) : visible_rows.length === 0 ? (
        <div className="px-2.5 py-4 text-sm text-shell-text-muted">
          No boards or folders match &ldquo;{search_query.trim()}&rdquo;.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={resetDrag}
        >
          <div role="tree" aria-label="Workspace content" aria-multiselectable="true" onKeyDown={handleKeyDown} className="flex flex-col">
            {visible_rows.map((row) => (
              <NavTreeRow
                key={row.node.id}
                row={row}
                is_expanded={row.node.type === "group" && isExpanded(row.node.id)}
                is_active={row.node.id === active_row_id}
                is_selected={selected_ids.has(row.node.id)}
                is_focus_target={row.node.id === focus_target_id}
                is_renaming={row.node.id === renaming_id}
                drop_position={drop_target?.node_id === row.node.id ? drop_target.position : null}
                is_drag_disabled={is_searching}
                search_query={search_query}
                registerRowRef={registerRowRef}
                onRowClick={handleRowClick}
                onToggleGroup={handleToggleGroup}
                onFocusRow={(node) => setFocusedId(node.id)}
                onOpenRowMenu={(event, node) => setMenu({ is_open: true, anchor_el: event.currentTarget as HTMLElement, target: node })}
                onTogglePriority={(node) => void nav.togglePriority(node.id, !node.is_priority)}
                onStartRename={(node) => setRenamingId(node.id)}
                onSubmitRename={(node, label) => void submitRename(node, label)}
                onCancelRename={() => setRenamingId(null)}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {active_drag_node ? <NavRowPreview node={active_drag_node} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {selected_nodes.length > 0 && (
        <div
          role="toolbar"
          aria-label="Selected items actions"
          className="sticky bottom-2 z-[6] mx-1 mt-2 flex motion-safe:animate-[selection-bar-in_160ms_ease-out] items-center gap-1 rounded-xl border border-shell-border-strong bg-shell-panel px-2 py-1.5 text-shell-text shadow-2xl"
        >
          <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-[#2B76E5] px-1.5 text-[12px] font-semibold text-white">
            {selected_nodes.length}
          </span>
          <span className="mr-auto truncate pl-1 text-[12.5px] text-shell-text-secondary">selected</span>
          <button type="button" onClick={() => setMovingNodes(selected_nodes)} className="shell-icon-button h-7 w-7" title="Move to" aria-label="Move selected items">
            <MoveToIcon />
          </button>
          <button type="button" onClick={() => setPendingArchive(selected_nodes)} className="shell-icon-button h-7 w-7" title="Archive" aria-label="Archive selected items">
            <ArchiveIcon />
          </button>
          <button
            type="button"
            onClick={() => setPendingDelete(selected_nodes)}
            className="shell-icon-button h-7 w-7 text-brand-200"
            title="Delete"
            aria-label="Delete selected items"
          >
            <DeleteIcon />
          </button>
          <button type="button" onClick={clearSelection} className="shell-icon-button h-7 w-7" title="Clear selection (Esc)" aria-label="Clear selection">
            <CloseIcon size={12} />
          </button>
        </div>
      )}

      <AnchoredMenu
        anchor_el={menu.anchor_el}
        is_open={menu.is_open}
        title={menu_title}
        items={menu_items}
        width={214}
        align="end"
        onClose={closeMenu}
      />

      <FolderColorPopover
        anchor_el={color_target.anchor_el}
        is_open={color_target.node !== null}
        value={color_target.node?.color ?? null}
        onChange={(color) => {
          const node = color_target.node;
          setColorTarget({ anchor_el: null, node: null });
          if (node) nav.setItemColor(node.id, color).catch((error) => toast.error(apiErrorMessage(error, "We couldn't change the folder color.")));
        }}
        onClose={() => setColorTarget({ anchor_el: null, node: null })}
      />

      <NavItemFormModal
        is_open={form.is_open}
        title={form.title}
        submit_label="Create"
        placeholder={form.placeholder}
        onSubmit={submitForm}
        onClose={() => setForm(CLOSED_FORM)}
      />

      <MoveNavItemModal
        is_open={moving_nodes.length > 0}
        tree={nav.tree}
        moving_nodes={moving_nodes}
        onSubmit={submitMove}
        onClose={() => setMovingNodes([])}
      />

      <ConfirmActionModal
        is_open={pending_archive.length > 0}
        title={pending_archive.length === 1 ? `Archive ${pending_archive[0].type === "group" ? "folder" : "board"}` : "Archive items"}
        description={<>{describeTargets(pending_archive)} will be hidden from the sidebar. Archived boards can be restored from the board archive at any time.</>}
        confirm_label="Archive"
        variant="neutral"
        onConfirm={() => runBulk("archive", pending_archive)}
        onClose={() => setPendingArchive([])}
      />

      <ConfirmActionModal
        is_open={pending_delete.length > 0}
        title={pending_delete.length === 1 ? (pending_delete[0].type === "group" ? "Delete folder" : "Delete view") : "Delete items"}
        description={<>{describeTargets(pending_delete)} will be moved to trash. This can be undone from Trash within 30 days.</>}
        confirm_label={pending_delete.length === 1 ? (pending_delete[0].type === "group" ? "Delete folder" : "Delete view") : `Delete ${pending_delete.length} items`}
        danger
        onConfirm={() => runBulk("delete", pending_delete)}
        onClose={() => setPendingDelete([])}
      />
    </>
  );
};

export default NavTree;
