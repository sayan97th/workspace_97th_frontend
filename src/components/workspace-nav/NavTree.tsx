"use client";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import type { WorkspaceNavNode } from "@/types/workspace";
import {
  DeleteIcon,
  DuplicateIcon,
  FolderIcon,
  MoveToIcon,
  OpenInNewTabIcon,
  PlusIcon,
  RenameIcon,
  StarIcon,
} from "@/icons/workspace-icons";
import NavTreeRow from "./NavTreeRow";
import NavRowMenu, { type NavMenuItem } from "./NavRowMenu";
import NavItemFormModal from "./NavItemFormModal";
import MoveNavItemModal from "./MoveNavItemModal";
import { getLeafHref } from "./helpers";
import type { WorkspaceNavApi } from "./useWorkspaceNav";

export type NavTreeProps = {
  nav: WorkspaceNavApi;
  workspace_slug: string;
};

type MenuState = {
  is_open: boolean;
  x: number;
  y: number;
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

const CLOSED_MENU: MenuState = { is_open: false, x: 0, y: 0, node: null };
const CLOSED_FORM: FormState = { is_open: false, mode: "create-folder", parent_id: null, target: null };

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

  const positionMenu = (event: React.MouseEvent): { x: number; y: number } => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menu_height = 320;
    const menu_width = 214;
    let y = rect.bottom + 4;
    if (y + menu_height > window.innerHeight) {
      y = Math.max(8, rect.top - menu_height - 4);
    }
    let x = rect.right - menu_width;
    if (x < 8) x = 8;
    return { x, y };
  };

  const openRowMenu = (event: React.MouseEvent, node: WorkspaceNavNode) => {
    setMenu({ is_open: true, ...positionMenu(event), node });
  };

  const openRootMenu = (event: React.MouseEvent) => {
    setMenu({ is_open: true, ...positionMenu(event), node: null });
  };

  const closeMenu = () => setMenu(CLOSED_MENU);

  const openInNewTab = (node: WorkspaceNavNode) => {
    window.open(getLeafHref(node), "_blank", "noopener");
  };

  const handleDelete = (node: WorkspaceNavNode) => {
    const message =
      node.type === "group"
        ? `Delete "${node.label}" and everything inside it?`
        : `Delete "${node.label}"?`;
    if (window.confirm(message)) void nav.deleteItem(node.id);
  };

  const buildRootItems = (): NavMenuItem[] => [
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

  const buildNodeItems = (node: WorkspaceNavNode): NavMenuItem[] => {
    const items: NavMenuItem[] = [];

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
        key: "favorite",
        label: node.is_favorite ? "Remove from favorites" : "Add to favorites",
        icon: <StarIcon filled={node.is_favorite} />,
        onClick: () => void nav.toggleFavorite(node.id, !node.is_favorite),
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
        nav.tree.map((node) => (
          <NavTreeRow
            key={node.id}
            node={node}
            depth={0}
            pathname={pathname}
            expanded_group_ids={nav.expanded_group_ids}
            onToggleGroup={nav.toggleGroup}
            onOpenRowMenu={openRowMenu}
          />
        ))
      )}

      <NavRowMenu
        is_open={menu.is_open}
        x={menu.x}
        y={menu.y}
        title={menu.node?.label}
        items={menu.node ? buildNodeItems(menu.node) : buildRootItems()}
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
    </>
  );
};

export default NavTree;
