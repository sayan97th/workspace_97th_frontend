"use client";

import { useState } from "react";
import ActionMenu, { type ActionMenuItem, type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import { ArchiveIcon, ArrowRightIcon, CheckIcon, DeleteIcon, DuplicateIcon, LinkIcon, PlusIcon, StarIcon } from "@/icons/workspace-icons";
import { getConvertDisabledReason } from "./rowMenuRules";
import {
  AddSubitemIcon,
  AppsPuzzleIcon,
  AutomationBoltIcon,
  ConvertToItemIcon,
  ConvertToSubitemIcon,
  IntegrationPlugIcon,
  NewTabIcon,
  OpenItemIcon,
  RecurringIcon,
} from "./row-menu-icons";
import "./row-menu.css";

export interface RowMenuTarget {
  id: string;
  label: string;
  current?: boolean;
  /** Group targets only, the group's accent color shown as a dot before its name. */
  color?: string;
}

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

interface RowMenuProps {
  is_sub: boolean;
  anchor_el: HTMLElement | null;
  move_targets: RowMenuTarget[];
  convert_targets: RowMenuTarget[];
  /** Root items only. Set when this item can't become a subitem right now (it has subitems of its own), the "Convert to subitem" row then renders disabled with this as its tooltip. */
  convert_blocked_reason?: string;
  copied: boolean;
  is_priority: boolean;
  /** Root items only (`is_sub` false), a subitem can't recur on its own, see `BoardTableNode.recurrence`. */
  recurrence?: { frequency: RecurrenceFrequency; interval_count: number } | null;
  onOpen: () => void;
  /** "Open in new tab", hidden when omitted. */
  onOpenInNewTab?: () => void;
  onCopyLink: () => void;
  onCreateBelow: () => void;
  onAddSubitem: () => void;
  onDuplicate: (with_subs: boolean) => void;
  onMoveTo: (target_id: string) => void;
  onConvertToItem: () => void;
  onConvertToSubOf: (target_id: string) => void;
  onTogglePriority: () => void;
  onSetRecurrence?: (frequency: RecurrenceFrequency, interval_count: number) => void;
  onClearRecurrence?: () => void;
  /** The "Apps" submenu entries. The "Apps" row hides when neither is set. */
  onOpenIntegrations?: () => void;
  onOpenAutomations?: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const FREQUENCY_OPTIONS: { id: RecurrenceFrequency; label: string }[] = [
  { id: "daily", label: "Day" },
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
];

const FREQUENCY_UNITS: Record<RecurrenceFrequency, [string, string]> = {
  daily: ["day", "days"],
  weekly: ["week", "weeks"],
  monthly: ["month", "months"],
};

const MENU_WIDTH = 248;
const SUBMENU_WIDTH = 232;
const TARGET_LIST_MAX_HEIGHT = 320;
const ICON_SIZE = 16;

/** "Every 2 weeks", the recurring row's tooltip and the schedule form's summary. */
export const describeRecurrence = (frequency: RecurrenceFrequency, interval_count: number): string => {
  const [singular, plural] = FREQUENCY_UNITS[frequency];
  return interval_count === 1 ? `Every ${singular}` : `Every ${interval_count} ${plural}`;
};

/** A row in the Move to / Convert to subitem lists, with its group's color dot and a check on the current one. */
const buildTargetItem = (target: RowMenuTarget, onPick: (target_id: string) => void): ActionMenuItem => ({
  key: `target-${target.id}`,
  label: target.label || "Untitled",
  tooltip: target.label,
  icon: target.color ? <span className="row-menu__group-dot" style={{ background: target.color }} /> : undefined,
  meta: target.current ? "Current" : undefined,
  disabled: target.current,
  disabled_reason: target.current ? "It is already here" : undefined,
  onClick: target.current ? undefined : () => onPick(target.id),
});

type RecurrenceFormProps = {
  recurrence?: { frequency: RecurrenceFrequency; interval_count: number } | null;
  onSave: (frequency: RecurrenceFrequency, interval_count: number) => void;
  onStop?: () => void;
};

/** The "Set recurring" flyout: an "Every N day/week/month" schedule with Start (or Update) and Stop. */
const RecurrenceForm = ({ recurrence, onSave, onStop }: RecurrenceFormProps) => {
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(recurrence?.frequency ?? "weekly");
  const [interval_text, setIntervalText] = useState(String(recurrence?.interval_count ?? 1));
  const interval_count = Math.min(365, Math.max(1, Math.round(Number(interval_text)) || 1));

  return (
    <form
      className="row-menu-recurrence"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(frequency, interval_count);
      }}
    >
      <div className="row-menu-recurrence__row">
        <label htmlFor="row-menu-recurrence-interval" className="row-menu-recurrence__label">
          Every
        </label>
        <input
          id="row-menu-recurrence-interval"
          type="number"
          min={1}
          max={365}
          inputMode="numeric"
          value={interval_text}
          onChange={(event) => setIntervalText(event.target.value)}
          className="row-menu-recurrence__input"
          aria-label="Repeat every"
        />
      </div>

      <div role="radiogroup" aria-label="Repeat unit" className="row-menu-recurrence__segments">
        {FREQUENCY_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={frequency === option.id}
            data-active={frequency === option.id || undefined}
            onClick={() => setFrequency(option.id)}
            className="row-menu-recurrence__segment"
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="row-menu-recurrence__summary">
        A copy of this item is created {describeRecurrence(frequency, interval_count).toLowerCase()}.
      </p>

      <div className="row-menu-recurrence__actions">
        {recurrence && onStop && (
          <button type="button" onClick={onStop} className="row-menu-recurrence__button row-menu-recurrence__button--danger">
            Stop recurring
          </button>
        )}
        <button type="submit" className="row-menu-recurrence__button row-menu-recurrence__button--primary">
          {recurrence ? "Update" : "Start recurring"}
        </button>
      </div>
    </form>
  );
};

/**
 * Per-row "..." menu for a board table item or subitem, in monday.com's own
 * row menu layout: open, link and move actions, subitem actions, Apps, then
 * Archive and Delete. Built on {@link ActionMenu}, so it shares the Figtree
 * type, 32px rows, hover submenus, keyboard navigation and dark mode tokens
 * of every other options menu in the app. "Move to product", AI and Agents
 * rows are left out on purpose.
 */
export default function RowMenu({
  is_sub, anchor_el, move_targets, convert_targets, convert_blocked_reason, copied, is_priority, recurrence,
  onOpen, onOpenInNewTab, onCopyLink, onCreateBelow, onAddSubitem, onDuplicate, onMoveTo, onConvertToItem, onConvertToSubOf, onTogglePriority,
  onSetRecurrence, onClearRecurrence, onOpenIntegrations, onOpenAutomations, onArchive, onDelete, onClose,
}: RowMenuProps) {
  const noun = is_sub ? "subitem" : "item";
  // A subitem always converts straight to an item, a root item needs another item to hang under.
  const convert_disabled_reason = getConvertDisabledReason({ is_sub, blocked_reason: convert_blocked_reason, target_count: convert_targets.length });

  const open_items: ActionMenuItem[] = [
    { key: "open", label: is_sub ? "Open subitem" : "Open item", icon: <OpenItemIcon size={ICON_SIZE} />, onClick: onOpen },
    ...(onOpenInNewTab ? [{ key: "open-new-tab", label: "Open in new tab", icon: <NewTabIcon size={ICON_SIZE} />, onClick: onOpenInNewTab }] : []),
  ];

  const move_item: ActionMenuItem | null = move_targets.length > 0
    ? {
        key: "move",
        label: "Move to",
        icon: <ArrowRightIcon size={ICON_SIZE} />,
        submenu_title: is_sub ? "Move to item" : "Move to group",
        submenu_max_height: TARGET_LIST_MAX_HEIGHT,
        submenu: move_targets.map((target) => buildTargetItem(target, onMoveTo)),
      }
    : null;

  // A subitem has nothing of its own to copy along, so its Duplicate runs straight away.
  const duplicate_item: ActionMenuItem = is_sub
    ? { key: "duplicate", label: "Duplicate", icon: <DuplicateIcon size={ICON_SIZE} />, onClick: () => onDuplicate(false) }
    : {
        key: "duplicate",
        label: "Duplicate",
        icon: <DuplicateIcon size={ICON_SIZE} />,
        submenu: [
          { key: "duplicate-plain", label: "Without subitems", onClick: () => onDuplicate(false) },
          { key: "duplicate-with-subs", label: "With subitems", onClick: () => onDuplicate(true) },
        ],
      };

  const recurrence_item: ActionMenuItem | null = !is_sub && onSetRecurrence
    ? {
        key: "recurring",
        label: recurrence ? "Recurring" : "Set recurring",
        icon: <RecurringIcon size={ICON_SIZE} className={recurrence ? "row-menu__icon--active" : undefined} />,
        meta: recurrence ? describeRecurrence(recurrence.frequency, recurrence.interval_count) : undefined,
        submenu_title: "Repeat this item",
        submenu_content: (
          <RecurrenceForm
            recurrence={recurrence}
            onSave={(frequency, interval_count) => {
              onSetRecurrence(frequency, interval_count);
              onClose();
            }}
            onStop={onClearRecurrence ? () => { onClearRecurrence(); onClose(); } : undefined}
          />
        ),
      }
    : null;

  const link_items: ActionMenuItem[] = [
    {
      key: "copy-link",
      label: is_sub ? "Copy subitem link" : "Copy item link",
      icon: copied ? <CheckIcon size={14} className="row-menu__icon--success" /> : <LinkIcon size={ICON_SIZE} />,
      meta: copied ? "Copied" : undefined,
      keep_open: true,
      onClick: onCopyLink,
    },
    {
      key: "priority",
      label: is_priority ? "Unmark as priority" : "Mark as priority",
      icon: <StarIcon size={ICON_SIZE} filled={is_priority} className={is_priority ? "row-menu__icon--priority" : undefined} />,
      onClick: onTogglePriority,
    },
    ...(move_item ? [move_item] : []),
    duplicate_item,
    { key: "create-below", label: `Create new ${noun} below`, icon: <PlusIcon size={ICON_SIZE} />, onClick: onCreateBelow },
    ...(recurrence_item ? [recurrence_item] : []),
  ];

  const convert_item: ActionMenuItem = is_sub
    ? { key: "convert", label: "Convert to item", icon: <ConvertToItemIcon size={ICON_SIZE} />, onClick: onConvertToItem }
    : {
        key: "convert",
        label: "Convert to subitem",
        icon: <ConvertToSubitemIcon size={ICON_SIZE} />,
        disabled: convert_disabled_reason !== undefined,
        disabled_reason: convert_disabled_reason,
        submenu_title: "Make it a subitem of",
        submenu_max_height: TARGET_LIST_MAX_HEIGHT,
        submenu: convert_targets.map((target) => buildTargetItem(target, onConvertToSubOf)),
      };

  const subitem_items: ActionMenuItem[] = [
    ...(is_sub ? [] : [{ key: "add-subitem", label: "Add subitem", icon: <AddSubitemIcon size={ICON_SIZE} />, onClick: onAddSubitem }]),
    convert_item,
  ];

  const app_items: ActionMenuItem[] = [
    ...(onOpenIntegrations ? [{ key: "integrations", label: "Integrations", icon: <IntegrationPlugIcon size={ICON_SIZE} />, onClick: onOpenIntegrations }] : []),
    ...(onOpenAutomations ? [{ key: "automations", label: "Automations", icon: <AutomationBoltIcon size={ICON_SIZE} />, onClick: onOpenAutomations }] : []),
  ];

  const sections: ActionMenuSection[] = [
    { key: "open", items: open_items },
    { key: "links", items: link_items },
    { key: "subitems", items: subitem_items },
    {
      key: "apps",
      items: app_items.length > 0 ? [{ key: "apps", label: "Apps", icon: <AppsPuzzleIcon size={ICON_SIZE} />, submenu: app_items }] : [],
    },
    {
      key: "danger",
      items: [
        { key: "archive", label: "Archive", icon: <ArchiveIcon size={ICON_SIZE} />, onClick: onArchive },
        { key: "delete", label: "Delete", icon: <DeleteIcon size={ICON_SIZE} />, onClick: onDelete },
      ],
    },
  ];

  return (
    <ActionMenu
      anchor_el={anchor_el}
      is_open
      onClose={onClose}
      sections={sections}
      aria_label={is_sub ? "Subitem actions" : "Item actions"}
      width={MENU_WIDTH}
      submenu_width={SUBMENU_WIDTH}
      align="start"
      class_name="row-menu"
    />
  );
}
