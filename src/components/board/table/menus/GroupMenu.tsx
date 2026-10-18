"use client";

import ActionMenu, { type ActionMenuItem, type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import { ArchiveIcon, ArrowRightIcon, CheckIcon, DeleteIcon, DuplicateIcon, MoveDownIcon, MoveUpIcon, StarIcon } from "@/icons/workspace-icons";
import { GROUP_PALETTE } from "../constants";
import { AppsPuzzleIcon, AutomationBoltIcon, IntegrationPlugIcon } from "./row-menu-icons";
import {
  AddGroupIcon,
  CollapseAllIcon,
  CollapseGroupIcon,
  ExcelIcon,
  ExpandAllIcon,
  ExpandGroupIcon,
  MoveToEdgeIcon,
  PaintBucketIcon,
  PencilIcon,
  SelectAllIcon,
  SubitemsTreeIcon,
} from "./group-menu-icons";
import "./group-menu.css";

export type GroupMoveDirection = "top" | "up" | "down" | "bottom";

interface GroupMenuProps {
  anchor_el: HTMLElement | null;
  is_collapsed: boolean;
  /** Every group of the table is collapsed, the "all groups" row then offers to expand them. */
  are_all_collapsed: boolean;
  is_first: boolean;
  is_last: boolean;
  current_color: string;
  is_priority: boolean;
  onToggleThis: () => void;
  onToggleAllGroups: () => void;
  onSelectAll: () => void;
  onExpandSubitems: () => void;
  onCollapseSubitems: () => void;
  onAddGroup: () => void;
  onDuplicate: (with_items: boolean) => void;
  onMove: (direction: GroupMoveDirection) => void;
  onRename: () => void;
  onChangeColor: (color: string) => void;
  onTogglePriority: () => void;
  /** "Export to Excel", hidden when omitted. */
  onExportExcel?: () => void;
  /** The "Apps" submenu entries. The "Apps" row hides when neither is set. */
  onOpenIntegrations?: () => void;
  onOpenAutomations?: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onClose: () => void;
}

const MENU_WIDTH = 264;
const SUBMENU_WIDTH = 216;
const ICON_SIZE = 16;

type ColorPaletteProps = {
  current_color: string;
  onPick: (color: string) => void;
};

/** The "Change group color" flyout: monday's swatch grid, the current color marked with a check. */
const ColorPalette = ({ current_color, onPick }: ColorPaletteProps) => (
  <div role="radiogroup" aria-label="Group color" className="group-menu-palette">
    {GROUP_PALETTE.map((color) => {
      const is_current = color.toLowerCase() === current_color.toLowerCase();
      return (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={is_current}
          aria-label={`Set group color to ${color}`}
          title={color}
          data-current={is_current || undefined}
          onClick={() => onPick(color)}
          className="group-menu-palette__swatch"
          style={{ background: color }}
        >
          {is_current && <CheckIcon size={12} />}
        </button>
      );
    })}
  </div>
);

/**
 * The board table's group "..." menu, in monday.com's own layout: view
 * actions (collapse, select, subitems), structure actions (add, duplicate,
 * move), look (rename, color), Export to Excel, Apps, then Delete and
 * Archive. Built on {@link ActionMenu}, so it shares the Figtree type, 32px
 * rows, hover submenus, keyboard navigation and dark mode tokens of the row
 * menu and every other options menu in the app.
 */
export default function GroupMenu({
  anchor_el, is_collapsed, are_all_collapsed, is_first, is_last, current_color, is_priority,
  onToggleThis, onToggleAllGroups, onSelectAll, onExpandSubitems, onCollapseSubitems, onAddGroup,
  onDuplicate, onMove, onRename, onChangeColor, onTogglePriority, onExportExcel, onOpenIntegrations, onOpenAutomations,
  onDelete, onArchive, onClose,
}: GroupMenuProps) {
  const move_items: ActionMenuItem[] = [
    { key: "move-top", label: "Move to top", icon: <MoveToEdgeIcon size={ICON_SIZE} />, disabled: is_first, disabled_reason: "This group is already at the top", onClick: () => onMove("top") },
    { key: "move-up", label: "Move up", icon: <MoveUpIcon size={ICON_SIZE} />, disabled: is_first, disabled_reason: "This group is already at the top", onClick: () => onMove("up") },
    { key: "move-down", label: "Move down", icon: <MoveDownIcon size={ICON_SIZE} />, disabled: is_last, disabled_reason: "This group is already at the bottom", onClick: () => onMove("down") },
    {
      key: "move-bottom",
      label: "Move to bottom",
      icon: <MoveToEdgeIcon size={ICON_SIZE} className="group-menu__icon--flipped" />,
      disabled: is_last,
      disabled_reason: "This group is already at the bottom",
      onClick: () => onMove("bottom"),
    },
  ];

  const app_items: ActionMenuItem[] = [
    ...(onOpenIntegrations ? [{ key: "integrations", label: "Integrations", icon: <IntegrationPlugIcon size={ICON_SIZE} />, onClick: onOpenIntegrations }] : []),
    ...(onOpenAutomations ? [{ key: "automations", label: "Automations", icon: <AutomationBoltIcon size={ICON_SIZE} />, onClick: onOpenAutomations }] : []),
  ];

  const sections: ActionMenuSection[] = [
    {
      key: "view",
      items: [
        {
          key: "toggle-this",
          label: is_collapsed ? "Expand this group" : "Collapse this group",
          icon: is_collapsed ? <ExpandGroupIcon size={ICON_SIZE} /> : <CollapseGroupIcon size={ICON_SIZE} />,
          onClick: onToggleThis,
        },
        {
          key: "toggle-all",
          label: are_all_collapsed ? "Expand all groups" : "Collapse all groups",
          icon: are_all_collapsed ? <ExpandAllIcon size={ICON_SIZE} /> : <CollapseAllIcon size={ICON_SIZE} />,
          onClick: onToggleAllGroups,
        },
        { key: "select-all", label: "Select all items in group", icon: <SelectAllIcon size={ICON_SIZE} />, onClick: onSelectAll },
        { key: "expand-subitems", label: "Expand all subitems", icon: <SubitemsTreeIcon size={ICON_SIZE} />, onClick: onExpandSubitems },
        { key: "collapse-subitems", label: "Collapse all subitems", icon: <SubitemsTreeIcon size={ICON_SIZE} />, onClick: onCollapseSubitems },
      ],
    },
    {
      key: "structure",
      items: [
        { key: "add-group", label: "Add group", icon: <AddGroupIcon size={ICON_SIZE} />, onClick: onAddGroup },
        {
          key: "priority",
          label: is_priority ? "Unmark as priority client" : "Mark as priority client",
          icon: <StarIcon size={ICON_SIZE} filled={is_priority} className={is_priority ? "group-menu__icon--priority" : undefined} />,
          tooltip: "Priority client groups always stay above the rest",
          onClick: onTogglePriority,
        },
        {
          key: "duplicate",
          label: "Duplicate this group",
          icon: <DuplicateIcon size={ICON_SIZE} />,
          submenu: [
            { key: "duplicate-with-items", label: "With items", onClick: () => onDuplicate(true) },
            { key: "duplicate-without-items", label: "Without items", onClick: () => onDuplicate(false) },
          ],
        },
        { key: "move", label: "Move group", icon: <ArrowRightIcon size={ICON_SIZE} />, submenu: move_items },
      ],
    },
    {
      key: "look",
      items: [
        { key: "rename", label: "Rename group", icon: <PencilIcon size={ICON_SIZE} />, onClick: onRename },
        {
          key: "color",
          label: "Change group color",
          icon: <PaintBucketIcon size={ICON_SIZE} />,
          submenu_content: (
            <ColorPalette
              current_color={current_color}
              onPick={(color) => {
                onChangeColor(color);
                onClose();
              }}
            />
          ),
        },
      ],
    },
    {
      key: "export",
      items: onExportExcel ? [{ key: "export-excel", label: "Export to Excel", icon: <ExcelIcon size={ICON_SIZE} />, onClick: onExportExcel }] : [],
    },
    {
      key: "apps",
      items: app_items.length > 0 ? [{ key: "apps", label: "Apps", icon: <AppsPuzzleIcon size={ICON_SIZE} />, submenu: app_items }] : [],
    },
    {
      key: "danger",
      items: [
        { key: "delete", label: "Delete group", icon: <DeleteIcon size={ICON_SIZE} />, onClick: onDelete },
        { key: "archive", label: "Archive group", icon: <ArchiveIcon size={ICON_SIZE} />, onClick: onArchive },
      ],
    },
  ];

  return (
    <ActionMenu
      anchor_el={anchor_el}
      is_open
      onClose={onClose}
      sections={sections}
      aria_label="Group actions"
      width={MENU_WIDTH}
      submenu_width={SUBMENU_WIDTH}
      align="start"
      class_name="group-menu"
    />
  );
}
