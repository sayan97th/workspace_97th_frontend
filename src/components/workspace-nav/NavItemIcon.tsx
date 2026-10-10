"use client";
import React from "react";
import {
  DashboardIcon,
  FileIcon,
  FolderIcon,
  HomeIcon,
  MultiLevelBoardIcon,
  PortfolioIcon,
  PrivateBadgeIcon,
  ProjectManagementIcon,
  ShareableBadgeIcon,
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
  /** "private" and "shareable" add a corner badge (lock or share) like monday.com. */
  board_type?: string | null;
};

type BoardTypeBadge = { Icon: IconComponent; label: string };

const BOARD_TYPE_BADGES: Record<string, BoardTypeBadge> = {
  private: { Icon: PrivateBadgeIcon, label: "Private" },
  shareable: { Icon: ShareableBadgeIcon, label: "Shareable" },
};

/** Folders never carry a badge, only boards, docs and dashboards have a board type. */
const resolveBadge = (source: NavIconSource): BoardTypeBadge | null =>
  source.type !== "group" && source.board_type ? (BOARD_TYPE_BADGES[source.board_type] ?? null) : null;

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

/** Tooltip and screen reader text, for example "Private board" or "Shareable doc". */
export const navItemIconLabel = (source: NavIconSource): string => {
  const type_label = navItemTypeLabel(source);
  const badge = resolveBadge(source);
  return badge ? `${badge.label} ${type_label.toLowerCase()}` : type_label;
};

/**
 * A sidebar item's type icon, like monday.com: boards, docs, dashboards,
 * workflows, projects, portfolios and folders each get their own glyph. A
 * folder is tinted with its own color when one was picked.
 *
 * Private and shareable items get a small lock or share badge on the bottom
 * right corner. The glyph underneath is masked out around the badge, so the
 * notch shows whatever is behind the row (hover, selected, plain panel)
 * without having to know its color.
 */
const NavItemIcon: React.FC<{ source: NavIconSource; size?: number; className?: string }> = ({ source, size = 15, className = "" }) => {
  const Icon = resolveIcon(source);
  const badge = resolveBadge(source);
  const tint = source.type === "group" && source.color ? source.color : undefined;
  const label = navItemIconLabel(source);

  if (!badge) {
    return (
      <span className={`flex flex-none ${className}`} style={tint ? { color: tint } : undefined} title={label}>
        <Icon size={size} />
      </span>
    );
  }

  // The badge hangs 2px past the glyph's corner, the notch is 1px wider than the badge.
  const badge_size = Math.round(size * 0.6);
  const badge_offset = 2;
  const notch_center = size + badge_offset - badge_size / 2;
  const notch_radius = badge_size / 2 + 1;
  const notch_mask = `radial-gradient(circle at ${notch_center}px ${notch_center}px, transparent ${notch_radius}px, #000 ${notch_radius + 0.5}px)`;

  return (
    <span className={`relative flex flex-none ${className}`} style={tint ? { color: tint } : undefined} title={label} role="img" aria-label={label}>
      <span className="flex" style={{ maskImage: notch_mask, WebkitMaskImage: notch_mask }}>
        <Icon size={size} />
      </span>
      <span className="absolute flex" style={{ right: -badge_offset, bottom: -badge_offset }} aria-hidden="true">
        <badge.Icon size={badge_size} />
      </span>
    </span>
  );
};

export default NavItemIcon;
