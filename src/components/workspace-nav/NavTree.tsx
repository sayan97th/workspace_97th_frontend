"use client";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { WorkspaceNavNode } from "@/types/workspace";
import {
  DeleteIcon,
  DuplicateIcon,
  FolderIcon,
  GroupToggleIcon,
  HomeIcon,
  MoveDownIcon,
  MoveToIcon,
  MoveUpIcon,
  OpenInNewTabIcon,
  PlusIcon,
  RenameIcon,
  StarIcon,
} from "@/icons/workspace-icons";
import NavTreeRow from "./NavTreeRow";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import NavItemFormModal from "./NavItemFormModal";
import MoveNavItemModal from "./MoveNavItemModal";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { getLeafHref, locateNavNode } from "./helpers";
import type { WorkspaceNavApi } from "./useWorkspaceNav";

export type NavTreeProps = {
  nav: WorkspaceNavApi;
  workspace_slug: string;
};

type MenuState = {
  is_open: boolean;
  /** The clicked kebab/add button — {@link AnchoredMenu} measures its own
   * rendered size against this element's real position, so the popover always
   * lands next to whichever row was clicked instead of a precomputed guess. */
  anchor_el: HTMLElement | null;
  /** null → the "add at root" menu; a node → that row's kebab menu. */
  node: WorkspaceNavNode | null;
};

type FormState = {
  is_open: boolean;
  mode: "create-folder" | "create-view" | "rename";
  parent_id: number | null;
  target: WorkspaceNavNode | null;
};

type MoveState = { is_open: boolean; node: WorkspaceNavNode | null };

const CLOSED_MENU: MenuState = { is_open: false, anchor_el: null, node: null };
const CLOSED_FORM: FormState = { is_open: false, mode: "create-folder", parent_id: null, target: null };

/** A static, non-interactive copy of a row's icon + label, floated under the pointer while it's being dragged — mirrors `BoardKanban`'s `CardPreview`. */
const NavRowPreview: React.FC<{ node: WorkspaceNavNode }> = ({ node }) => (
  <div className="flex h-9 w-72 items-center gap-[11px] rounded-[9px] bg-shell-panel px-2.5 text-shell-text shadow-2xl">
    <span className="flex flex-none text-shell-text-secondary">
      {node.type === "group" ? (
        <GroupToggleIcon />
      ) : node.icon === "home" ? (
        <HomeIcon size={16} />
      ) : (
        <FolderIcon size={15} />
      )}
    </span>
    <span className="flex-1 truncate text-sm">{node.label}</span>
  </div>
);

/**
 * The dynamic navigation tree plus all of its editing affordances (add at root,
 * per-row kebab actions, and the create/rename/move modals). Reusable for any
 * workspace: give it a slug and the {@link useWorkspaceNav} api.
 */
const NavTree: React.FC<NavTreeProps> = ({ nav, workspace_slug }) => {
  const pathname = usePathname() ?? "";
  const [menu, setMenu] = useState<MenuState>(CLOSED_MENU);
  const [form, setForm] = useState<FormState>(CLOSED_FORM);
  const [move, setMove] = useState<MoveState>({ is_open: false, node: null });
  const [pending_delete, setPendingDelete] = useState<WorkspaceNavNode | null>(null);
  const [active_drag_id, setActiveDragId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(Number(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const active_location = locateNavNode(nav.tree, Number(active.id));
    const over_location = locateNavNode(nav.tree, Number(over.id));
    // Drag-and-drop only reorders siblings within their current folder (or the
    // workspace root); moving an item into a *different* folder still goes
    // through "Move to" below, which already picks any folder as a target.
    if (!active_location || !over_location || active_location.parent_id !== over_location.parent_id) return;

    const target_ordered_ids = arrayMove(
      active_location.siblings.map((sibling) => sibling.id),
      active_location.index,
      over_location.index
    );

    void nav.reorderItem({
      moved_item_id: Number(active.id),
      target_parent_id: active_location.parent_id,
      target_ordered_ids,
    });
  };

  const active_drag_node = active_drag_id !== null ? locateNavNode(nav.tree, active_drag_id)?.node ?? null : null;

  const openRowMenu = (event: React.MouseEvent, node: WorkspaceNavNode) => {
    setMenu({ is_open: true, anchor_el: event.currentTarget as HTMLElement, node });
  };

  const openRootMenu = (event: React.MouseEvent) => {
    setMenu({ is_open: true, anchor_el: event.currentTarget as HTMLElement, node: null });
  };

  const closeMenu = () => setMenu(CLOSED_MENU);

  const openInNewTab = (node: WorkspaceNavNode) => {
    window.open(getLeafHref(node), "_blank", "noopener");
  };

  const handleDelete = (node: WorkspaceNavNode) => {
    setPendingDelete(node);
  };

  const confirmDelete = async () => {
    if (!pending_delete) return;
    await nav.deleteItem(pending_delete.id);
  };

  const buildRootItems = (): AnchoredMenuItem[] => [
    {
      key: "new-folder",
      label: "New folder",
      icon: <FolderIcon size={15} />,
      onClick: () => setForm({ is_open: true, mode: "create-folder", parent_id: null, target: null }),
    },
    {
      key: "new-view",
      label: "New view",
      icon: <PlusIcon size={15} />,
      onClick: () => setForm({ is_open: true, mode: "create-view", parent_id: null, target: null }),
    },
  ];

  const buildNodeItems = (node: WorkspaceNavNode): AnchoredMenuItem[] => {
    const items: AnchoredMenuItem[] = [];
    const location = locateNavNode(nav.tree, node.id);
    const can_move_up = Boolean(location && location.index > 0);
    const can_move_down = Boolean(location && location.index < location.siblings.length - 1);

    if (node.type === "group") {
      items.push(
        {
          key: "new-folder",
          label: "New folder",
          icon: <FolderIcon size={15} />,
          onClick: () => setForm({ is_open: true, mode: "create-folder", parent_id: node.id, target: null }),
        },
        {
          key: "new-view",
          label: "New view",
          icon: <PlusIcon size={15} />,
          onClick: () => setForm({ is_open: true, mode: "create-view", parent_id: node.id, target: null }),
        }
      );
    } else {
      items.push({
        key: "open-new-tab",
        label: "Open in new tab",
        icon: <OpenInNewTabIcon />,
        onClick: () => openInNewTab(node),
      });
    }

    items.push(
      {
        key: "rename",
        label: "Rename",
        icon: <RenameIcon />,
        onClick: () => setForm({ is_open: true, mode: "rename", parent_id: node.parent_id, target: node }),
      },
      {
        key: "move",
        label: "Move to",
        icon: <MoveToIcon />,
        onClick: () => setMove({ is_open: true, node }),
      },
      {
        key: "move-up",
        label: "Move up",
        icon: <MoveUpIcon />,
        disabled: !can_move_up,
        onClick: () => void nav.moveItemUp(node.id),
      },
      {
        key: "move-down",
        label: "Move down",
        icon: <MoveDownIcon />,
        disabled: !can_move_down,
        onClick: () => void nav.moveItemDown(node.id),
      },
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
      {
        key: "duplicate",
        label: "Duplicate",
        icon: <DuplicateIcon />,
        onClick: () => void nav.duplicateItem(node.id),
      },
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteIcon />,
        danger: true,
        onClick: () => handleDelete(node),
      }
    );

    return items;
  };

  const submitForm = async (label: string) => {
    if (form.mode === "rename" && form.target) {
      await nav.renameItem(form.target.id, label);
      return;
    }
    await nav.createItem({
      type: form.mode === "create-folder" ? "group" : "leaf",
      label,
      parent_id: form.parent_id,
    });
  };

  const form_title =
    form.mode === "rename"
      ? "Rename item"
      : form.mode === "create-folder"
        ? "New folder"
        : "New view";

  return (
    <>
      <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2 text-xs font-semibold tracking-[0.04em] text-shell-text-muted">
        <span>Content</span>
        <button
          type="button"
          onClick={openRootMenu}
          className="flex h-5 w-5 items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover-strong hover:text-shell-text"
          aria-label="Add navigation item"
        >
          <PlusIcon size={14} />
        </button>
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
          <button
            type="button"
            onClick={() => void nav.reload()}
            className="font-semibold text-brand-200 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : nav.tree.length === 0 ? (
        <div className="px-2.5 py-4 text-sm text-shell-text-muted">
          No items yet. Use the + button to add one.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragId(null)}
        >
          <SortableContext items={nav.tree.map((node) => String(node.id))} strategy={verticalListSortingStrategy}>
            {nav.tree.map((node) => (
              <NavTreeRow
                key={node.id}
                node={node}
                depth={0}
                pathname={pathname}
                expanded_group_ids={nav.expanded_group_ids}
                onToggleGroup={nav.toggleGroup}
                onOpenRowMenu={openRowMenu}
                onTogglePriority={(target) => void nav.togglePriority(target.id, !target.is_priority)}
              />
            ))}
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {active_drag_node ? <NavRowPreview node={active_drag_node} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <AnchoredMenu
        anchor_el={menu.anchor_el}
        is_open={menu.is_open}
        title={menu.node?.label}
        items={menu.node ? buildNodeItems(menu.node) : buildRootItems()}
        width={214}
        align="end"
        onClose={closeMenu}
      />

      <NavItemFormModal
        is_open={form.is_open}
        title={form_title}
        submit_label={form.mode === "rename" ? "Save" : "Create"}
        initial_label={form.mode === "rename" ? form.target?.label ?? "" : ""}
        placeholder={form.mode === "create-folder" ? "Folder name" : "View name"}
        onSubmit={submitForm}
        onClose={() => setForm(CLOSED_FORM)}
      />

      <MoveNavItemModal
        is_open={move.is_open}
        tree={nav.tree}
        moving_node={move.node}
        onSubmit={(parent_id) =>
          move.node ? nav.moveItem(move.node.id, { parent_id }) : undefined
        }
        onClose={() => setMove({ is_open: false, node: null })}
      />

      <ConfirmActionModal
        is_open={pending_delete !== null}
        title={pending_delete?.type === "group" ? "Delete folder" : "Delete view"}
        description={
          pending_delete?.type === "group" ? (
            <>
              &ldquo;{pending_delete.label}&rdquo; and everything inside it will be moved to trash. This can be undone from Trash within 30 days.
            </>
          ) : (
            <>
              &ldquo;{pending_delete?.label}&rdquo; will be moved to trash. This can be undone from Trash within 30 days.
            </>
          )
        }
        confirm_label={pending_delete?.type === "group" ? "Delete folder" : "Delete view"}
        danger
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
};

export default NavTree;
