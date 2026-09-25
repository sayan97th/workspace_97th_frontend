"use client";
import React from "react";
import {
  DashboardIcon,
  FileIcon,
  FolderIcon,
  HomeIcon,
  LockIcon,
  MultiLevelBoardIcon,
  PortfolioIcon,
  ProjectManagementIcon,
  ShareIcon,
  SidebarFolderIcon,
  WorkflowIcon,
  type IconComponent,
} from "@/icons/workspace-icons";

/** The fields the icon needs, shared by nav tree nodes, favorites and recent boards. */
export type NavIconSource = {
  type?: "leaf" | "group";
  view_key: string | null;
  icon?: string | null;
  display_style?: string | null;
  color?: string | null;
};

const VIEW_KEY_ICONS: Record<string, IconComponent> = {
  board: FolderIcon,
  doc: FileIcon,
  dashboard: DashboardIcon,
  workflow: WorkflowIcon,
  project: ProjectManagementIcon,
  portfolio: PortfolioIcon,
  workspace_manage: HomeIcon,
};

const resolveIcon = (source: NavIconSource): IconComponent => {
  if (source.type === "group") return SidebarFolderIcon;
  if (source.icon === "home") return HomeIcon;
  if (source.display_style === "multi_level") return MultiLevelBoardIcon;
  if (source.view_key && VIEW_KEY_ICONS[source.view_key]) return VIEW_KEY_ICONS[source.view_key];
  return FolderIcon;
};

/** Human label of the item type, used for tooltips and screen readers. */
export const navItemTypeLabel = (source: NavIconSource): string => {
  if (source.type === "group") return "Folder";
  switch (source.view_key) {
    case "doc":
      return "Doc";
    case "dashboard":
      return "Dashboard";
    case "workflow":
      return "Workflow";
    case "project":
      return "Project";
    case "portfolio":
      return "Portfolio";
    default:
      return "Board";
  }
};

/**
 * A sidebar item's type icon, like monday.com: boards, docs, dashboards,
 * workflows, projects, portfolios and folders each get their own glyph. A
 * folder is tinted with its own color when one was picked.
 */
const NavItemIcon: React.FC<{ source: NavIconSource; size?: number; className?: string }> = ({ source, size = 15, className = "" }) => {
  const Icon = resolveIcon(source);
  const tint = source.type === "group" && source.color ? source.color : undefined;
  return (
    <span className={`flex flex-none ${className}`} style={tint ? { color: tint } : undefined} title={navItemTypeLabel(source)}>
      <Icon size={size} />
    </span>
  );
};

/** Small trailing badge for private (lock) and shareable (share) boards; renders nothing for main boards. */
export const NavPrivacyBadge: React.FC<{ board_type: string | null | undefined; className?: string }> = ({ board_type, className = "" }) => {
  if (board_type !== "private" && board_type !== "shareable") return null;
  const label = board_type === "private" ? "Private board" : "Shareable board";
  return (
    <span className={`flex flex-none ${className}`} title={label} aria-label={label} role="img">
      {board_type === "private" ? <LockIcon size={12} /> : <ShareIcon size={12} />}
    </span>
  );
};

export default NavItemIcon;
