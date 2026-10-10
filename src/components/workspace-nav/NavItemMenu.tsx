"use client";
import React from "react";
import ActionMenu, { type ActionMenuItem, type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import type { BoardType, WorkspaceNavNode } from "@/types/workspace";
import {
  ArchiveIcon,
  ArrowRightIcon,
  ChangeTypeIcon,
  DashboardIcon,
  DeleteIcon,
  DuplicateIcon,
  FileIcon,
  FolderIcon,
  MagicWandIcon,
  MoveToFolderIcon,
  MoveToWorkspaceIcon,
  OpenInNewTabIcon,
  OpenInOverlayIcon,
  PlusIcon,
  RenameIcon,
  SaveAsTemplateIcon,
  SidebarFolderIcon,
  StarIcon,
} from "@/icons/workspace-icons";
import NavItemIcon from "./NavItemIcon";

/** What a folder's "Add to folder" submenu can create inside it. */
export type NavItemCreateKind = "board" | "doc" | "dashboard" | "folder";

/** Everything the row menu can do; `NavTree` owns the dialogs and API calls behind each one. */
export type NavItemMenuActions = {
  onOpenInOverlay: (node: WorkspaceNavNode) => void;
  onOpenInNewTab: (node: WorkspaceNavNode) => void;
  onRename: (node: WorkspaceNavNode) => void;
  onMoveToFolder: (node: WorkspaceNavNode) => void;
  onMoveToWorkspace: (node: WorkspaceNavNode) => void;
  onMoveToTemplate: (node: WorkspaceNavNode) => void;
  onChangeType: (node: WorkspaceNavNode, board_type: BoardType) => void;
  onToggleFavorite: (node: WorkspaceNavNode) => void;
  onDuplicate: (node: WorkspaceNavNode) => void;
  onSaveAsTemplate: (node: WorkspaceNavNode) => void;
  onDelete: (node: WorkspaceNavNode) => void;
  onArchive: (node: WorkspaceNavNode) => void;
  onCreateInside: (node: WorkspaceNavNode, kind: NavItemCreateKind) => void;
  onChangeColor: (node: WorkspaceNavNode) => void;
};

export type NavItemMenuProps = NavItemMenuActions & {
  anchor_el: HTMLElement | null;
  /** The row whose "..." was clicked, null while the menu is closed. */
  node: WorkspaceNavNode | null;
  onClose: () => void;
};

const ICON_SIZE = 16;

const BOARD_TYPE_LABELS: Record<BoardType, string> = {
  main: "Change to Main",
  private: "Change to Private",
  shareable: "Change to Shareable",
};

const BOARD_TYPE_ORDER: BoardType[] = ["main", "private", "shareable"];

/** The "Change type" rows: every type except the current one, each with the sidebar icon it would get. */
const buildChangeTypeItems = (node: WorkspaceNavNode, actions: NavItemMenuActions): ActionMenuItem[] =>
  BOARD_TYPE_ORDER.filter((board_type) => board_type !== (node.board_type ?? "main")).map((board_type) => ({
    key: `type-${board_type}`,
    label: BOARD_TYPE_LABELS[board_type],
    icon: <NavItemIcon source={{ type: "leaf", view_key: node.view_key, display_style: node.display_style, board_type }} size={ICON_SIZE} />,
    onClick: () => actions.onChangeType(node, board_type),
  }));

const buildLeafSections = (node: WorkspaceNavNode, actions: NavItemMenuActions): ActionMenuSection[] => [
  {
    key: "open",
    items: [
      { key: "open-overlay", label: "Open in overlay", icon: <OpenInOverlayIcon />, onClick: () => actions.onOpenInOverlay(node) },
      { key: "open-new-tab", label: "Open in new tab", icon: <OpenInNewTabIcon size={ICON_SIZE} />, onClick: () => actions.onOpenInNewTab(node) },
    ],
  },
  {
    key: "edit",
    items: [
      { key: "rename", label: "Rename", icon: <RenameIcon size={ICON_SIZE} />, onClick: () => actions.onRename(node) },
      {
        key: "move",
        label: "Move to",
        icon: <ArrowRightIcon />,
        submenu: [
          { key: "move-folder", label: "Move to folder", icon: <MoveToFolderIcon />, onClick: () => actions.onMoveToFolder(node) },
          { key: "move-workspace", label: "Move to workspace", icon: <MoveToWorkspaceIcon />, onClick: () => actions.onMoveToWorkspace(node) },
          { key: "move-template", label: "Move to template", icon: <MagicWandIcon />, onClick: () => actions.onMoveToTemplate(node) },
        ],
      },
      { key: "change-type", label: "Change type", icon: <ChangeTypeIcon />, submenu: buildChangeTypeItems(node, actions) },
      {
        key: "favorite",
        label: node.is_favorite ? "Remove from favorites" : "Add to favorites",
        icon: <StarIcon filled={node.is_favorite} size={ICON_SIZE} />,
        onClick: () => actions.onToggleFavorite(node),
      },
      { key: "duplicate", label: "Duplicate", icon: <DuplicateIcon size={ICON_SIZE} />, onClick: () => actions.onDuplicate(node) },
      { key: "save-template", label: "Save as a template", icon: <SaveAsTemplateIcon />, onClick: () => actions.onSaveAsTemplate(node) },
    ],
  },
  {
    key: "remove",
    items: [
      { key: "delete", label: "Delete", icon: <DeleteIcon size={ICON_SIZE} />, onClick: () => actions.onDelete(node) },
      { key: "archive", label: "Archive", icon: <ArchiveIcon size={ICON_SIZE} />, onClick: () => actions.onArchive(node) },
    ],
  },
];

/** Folders follow the same layout, with their own first group (create inside, color) and no board only rows. */
const buildFolderSections = (node: WorkspaceNavNode, actions: NavItemMenuActions): ActionMenuSection[] => [
  {
    key: "folder",
    items: [
      {
        key: "add",
        label: "Add to folder",
        icon: <PlusIcon size={ICON_SIZE} />,
        submenu: [
          { key: "add-board", label: "New board", icon: <FolderIcon size={ICON_SIZE} />, onClick: () => actions.onCreateInside(node, "board") },
          { key: "add-doc", label: "New doc", icon: <FileIcon size={ICON_SIZE} />, onClick: () => actions.onCreateInside(node, "doc") },
          { key: "add-dashboard", label: "New dashboard", icon: <DashboardIcon size={ICON_SIZE} />, onClick: () => actions.onCreateInside(node, "dashboard") },
          { key: "add-folder", label: "New folder", icon: <SidebarFolderIcon size={ICON_SIZE} />, onClick: () => actions.onCreateInside(node, "folder") },
        ],
      },
      {
        key: "color",
        label: "Change color",
        icon: <span className="flex h-3.5 w-3.5 rounded-full" style={{ background: node.color ?? "var(--action-menu-icon)" }} />,
        onClick: () => actions.onChangeColor(node),
      },
    ],
  },
  {
    key: "edit",
    items: [
      { key: "rename", label: "Rename", icon: <RenameIcon size={ICON_SIZE} />, onClick: () => actions.onRename(node) },
      {
        key: "move",
        label: "Move to",
        icon: <ArrowRightIcon />,
        submenu: [
          { key: "move-folder", label: "Move to folder", icon: <MoveToFolderIcon />, onClick: () => actions.onMoveToFolder(node) },
          { key: "move-workspace", label: "Move to workspace", icon: <MoveToWorkspaceIcon />, onClick: () => actions.onMoveToWorkspace(node) },
        ],
      },
      {
        key: "favorite",
        label: node.is_favorite ? "Remove from favorites" : "Add to favorites",
        icon: <StarIcon filled={node.is_favorite} size={ICON_SIZE} />,
        onClick: () => actions.onToggleFavorite(node),
      },
      { key: "duplicate", label: "Duplicate", icon: <DuplicateIcon size={ICON_SIZE} />, onClick: () => actions.onDuplicate(node) },
    ],
  },
  {
    key: "remove",
    items: [
      { key: "delete", label: "Delete", icon: <DeleteIcon size={ICON_SIZE} />, onClick: () => actions.onDelete(node) },
      { key: "archive", label: "Archive", icon: <ArchiveIcon size={ICON_SIZE} />, onClick: () => actions.onArchive(node) },
    ],
  },
];

/**
 * The "..." menu of a sidebar tree row, laid out like monday.com's: open
 * actions, then edit actions ("Move to" and "Change type" open side
 * submenus), then Delete and Archive. Folders get the same shape with their
 * own first group. Rendered with {@link ActionMenu}, so it shares the look,
 * keyboard support and flyouts of the other sidebar menus.
 */
const NavItemMenu: React.FC<NavItemMenuProps> = ({ anchor_el, node, onClose, ...actions }) => (
  <ActionMenu
    anchor_el={anchor_el}
    is_open={node !== null}
    onClose={onClose}
    sections={node ? (node.type === "group" ? buildFolderSections(node, actions) : buildLeafSections(node, actions)) : []}
    aria_label={node ? `${node.label} options` : "Item options"}
    width={248}
    submenu_width={236}
    align="start"
  />
);

export default NavItemMenu;
