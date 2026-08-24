import {
  BoardGridIcon,
  BuildingIcon,
  CameraIcon,
  ClockIcon,
  FolderIcon,
  KeyIcon,
  LockIcon,
  PersonIcon,
  ShieldIcon,
  TeamsIcon,
  type IconComponent,
} from "@/icons/workspace-icons";
import type { AdminNavGroupId, AdminSectionId } from "./types";

export type AdministrationNavGroup = {
  id: AdminNavGroupId;
  label: string;
  /** Set when the group header itself is also a selectable page, like "Customization". */
  own_section_id?: AdminSectionId;
};

export type AdministrationNavItem = {
  id: AdminSectionId;
  label: string;
  icon: IconComponent;
  /** Which collapsible group this item renders under, or null for the always-visible "General" rows. */
  group: AdminNavGroupId | null;
};

/**
 * Single source of truth for the Administration left rail: the collapsible groups and the
 * items inside them. Adding, removing, or reordering a section is now a one-place edit here
 * instead of touching the nav JSX, the section-title map, and the section-panel map
 * separately, which is what made the old {@link AdministrationNav} easy to drift out of sync.
 */
export const ADMINISTRATION_NAV_GROUPS: AdministrationNavGroup[] = [
  { id: "customization", label: "Customization", own_section_id: "customization" },
  { id: "directory", label: "Directory" },
  { id: "security", label: "Security" },
];

export const ADMINISTRATION_NAV_ITEMS: AdministrationNavItem[] = [
  { id: "profile", label: "Profile", icon: PersonIcon, group: null },
  { id: "account", label: "Account", icon: BuildingIcon, group: null },
  { id: "branding", label: "Branding", icon: CameraIcon, group: "customization" },
  { id: "users", label: "Users", icon: TeamsIcon, group: "directory" },
  { id: "departments", label: "Departments", icon: FolderIcon, group: "directory" },
  { id: "board_ownership", label: "Board ownership", icon: BoardGridIcon, group: "directory" },
  { id: "authentication", label: "Authentication", icon: ShieldIcon, group: "security" },
  { id: "audit", label: "Audit", icon: ClockIcon, group: "security" },
  { id: "advanced", label: "Advanced", icon: KeyIcon, group: "security" },
  { id: "sessions", label: "Sessions", icon: LockIcon, group: "security" },
];

/** Section ids rendered outside any collapsible group, always visible under "General". */
export const ADMINISTRATION_GENERAL_ITEMS = ADMINISTRATION_NAV_ITEMS.filter((item) => item.group === null);

export const administrationItemsForGroup = (group_id: AdminNavGroupId): AdministrationNavItem[] =>
  ADMINISTRATION_NAV_ITEMS.filter((item) => item.group === group_id);

export const administrationGroupForSection = (section_id: AdminSectionId): AdminNavGroupId | null =>
  ADMINISTRATION_NAV_ITEMS.find((item) => item.id === section_id)?.group ??
  ADMINISTRATION_NAV_GROUPS.find((group) => group.own_section_id === section_id)?.id ??
  null;
