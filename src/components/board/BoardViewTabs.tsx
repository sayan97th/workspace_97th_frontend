"use client";
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { restrictToHorizontalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import ActionMenu, { type ActionMenuItem, type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import CopyLinkModal from "@/components/ui/modal/CopyLinkModal";
import {
  ChevronDownIcon,
  DeleteIcon,
  DuplicateIcon,
  EyeIcon,
  EyeOffIcon,
  HomeIcon,
  InfoIcon,
  LockIcon,
  MoreDotsIcon,
  PlusIcon,
  RenameIcon,
  ShareIcon,
  UnlockIcon,
  ViewsIcon,
} from "@/icons/workspace-icons";
import { PinIcon } from "@/icons/board-icons";
import { ReactSmileyIcon } from "@/icons/drawer-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import AddBoardViewMenu from "./AddBoardViewMenu";
import type { BoardViewKind, BoardViewTypeOption } from "./boardViewTypes";
import BoardViewEmojiPicker from "./BoardViewEmojiPicker";
import ManageViewsModal from "./view-tabs/ManageViewsModal";
import MoreViewsMenu from "./view-tabs/MoreViewsMenu";
import SortableViewTab, { VIEW_TAB_TRANSITION } from "./view-tabs/SortableViewTab";
import ViewDescriptionPopover from "./view-tabs/ViewDescriptionPopover";
import ViewTabFace from "./view-tabs/ViewTabFace";
import ViewTabInfoCard from "./view-tabs/ViewTabInfoCard";
import { computeVisibleTabIds, mergeReorderedIds, moveId } from "./view-tabs/viewTabOrder";

/** One clickable tab in the interactive tab bar (see {@link BoardViewTabsProps}). */
export type BoardViewTabItem = {
  id: number | string;
  label: string;
  /** A single emoji carried by the tab; null/undefined shows the icon of its view type. */
  emoji?: string | null;
  /** Sorts ahead of unpinned tabs whenever the viewer has no personal tab order saved. */
  pinned?: boolean;
  /** While locked, Rename/Duplicate/Delete/Edit description are hidden. Pin, Share, Unlock and Reorder remain. */
  is_locked?: boolean;
  /** The board's primary tab. It can't be deleted. When omitted, the first tab is treated as primary. */
  is_primary?: boolean;
  /** Which kind of view the tab renders, used for its icon and hover card. */
  view_type?: BoardViewKind;
  description?: string | null;
  creator_name?: string | null;
  creator_photo_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  /** Hidden for the viewer only ("Hide view for me"). Still shown in the bar while it's the active tab. */
  is_hidden?: boolean;
  /** The tab the viewer wants opened first when they open the board. */
  is_default?: boolean;
  /** The tab has filter, sort or display changes that aren't saved to the view. */
  has_unsaved_changes?: boolean;
};

export type BoardViewTabsProps =
  | {
      /** Label of the primary (always-active) table view. */
      primary_label: string;
      /** Secondary view names shown after the primary view. */
      views: string[];
    }
  | {
      /**
       * Full tab list (including the primary tab), each addressable by id,
       * used by `TableBoardView` to drive real `/boards/{id}/views/{view_id}`
       * style tab switching. Clicking a tab (or "+") is the caller's
       * responsibility.
       */
      tabs: BoardViewTabItem[];
      active_view_id: number | string | null;
      onSelectView: (id: number | string) => void;
      /** Called with the chosen kind when `view_type_options` is set (picker mode), or with no argument otherwise (plain "always table" mode). */
      onAddView?: (view_type?: BoardViewKind) => void;
      /**
       * Offering this turns "+" into the Monday-style "Board views" picker
       * (see {@link AddBoardViewMenu}) instead of immediately calling
       * `onAddView()`. Omit to keep the simple one-click "add another table
       * tab" behavior (e.g. Client Hub, whose tabs are all mock-data tables).
       */
      view_type_options?: BoardViewTypeOption[];
      /** Renames a tab, wired to `PATCH /boards/{id}/views/{id}` by the caller. Omit to make tabs read-only. */
      onRenameView?: (id: number | string, label: string) => void;
      /** Assigns (or clears, with `null`) a tab's emoji. */
      onChangeEmoji?: (id: number | string, emoji: string | null) => void;
      /** Deletes a non-primary tab. Omit to hide the delete option. */
      onDeleteView?: (id: number | string) => void;
      /** Toggles whether a tab is pinned. Omit to hide the pin option. */
      onPinView?: (id: number | string) => void;
      /** Duplicates a tab's label + saved filter/sort/display config. Omit to hide the duplicate option. */
      onDuplicateView?: (id: number | string) => void;
      /** Toggles whether a tab is locked to restrict edits. Omit to hide the lock option. */
      onLockView?: (id: number | string) => void;
      /** Builds the deep-link URL of a tab, used by "Share view" and to make tabs real links. Omit to hide the share option. */
      getViewUrl?: (tab: BoardViewTabItem) => string;
      /** Saves the viewer's own tab order (doesn't affect other collaborators). Omit to turn off dragging and the reorder menu. */
      onReorderPersonalTabs?: (ordered_ids: Array<number | string>) => void;
      /** Whether the viewer has a personal tab order to reset. */
      has_personal_order?: boolean;
      /** "Reset to default order". Omit to hide the option. */
      onResetPersonalTabOrder?: () => void;
      /** Hides a tab for the viewer only, or shows it again. Omit to hide the option. */
      onToggleHiddenView?: (id: number | string) => void;
      /** Picks the tab the viewer wants opened first (null goes back to the primary tab). Omit to hide the option. */
      onSetDefaultView?: (id: number | string | null) => void;
      /** Saves a tab's description (null clears it). Omit to make descriptions read-only. */
      onChangeDescription?: (id: number | string, description: string | null) => void;
    };

/**
 * The row of board views ("Main table", team names, …).
 *
 * Two modes, discriminated by the shape of the props: the original static
 * `{ primary_label, views }` mode (used only for `TableBoardView`'s brief
 * loading skeleton, where there's nothing to click yet) and the interactive
 * `{ tabs, active_view_id, onSelectView }` mode every real board (Client Hub
 * included) renders through: real tab switching, drag and drop reordering
 * saved per user, a "More" dropdown for tabs that don't fit, inline rename,
 * an icon picker, hover info cards, hide for me, default view, a "Manage
 * views" panel and pin/duplicate/share/lock, all backed by `boards/{id}/views`.
 */
const BoardViewTabs: React.FC<BoardViewTabsProps> = (props) => {
  if ("tabs" in props) {
    return <InteractiveBoardViewTabs {...props} />;
  }

  const { primary_label, views } = props;

  return (
    <div className="flex items-center gap-0.5 border-b border-shell-border">
      <span className="vt-tab" data-state="active">
        <span className="vt-tab-label">{primary_label}</span>
        <span className="vt-tab-menu-button">
          <MoreDotsIcon size={14} />
        </span>
      </span>

      {views.map((view, index) => (
        <span key={`${view}-${index}`} className="vt-tab" data-state="idle" data-has-menu="false">
          <span className="vt-tab-label">{view}</span>
        </span>
      ))}

      <Tooltip content="Add view" placement="right" className="ml-1 flex">
        <button type="button" className="vt-bar-button" data-variant="add" aria-label="Add view">
          <PlusIcon size={16} />
        </button>
      </Tooltip>
    </div>
  );
};

export default BoardViewTabs;

// ─────────────────────────────────────────────────────────────────────────────

type InteractiveBoardViewTabsProps = Extract<BoardViewTabsProps, { tabs: BoardViewTabItem[] }>;

/** Gap between two tabs (`gap-0.5`). */
const TAB_GAP = 2;
/** Width of the "+" button plus its gap. */
const ADD_BUTTON_SPACE = 30 + TAB_GAP;
/** How long the pointer has to rest on a tab before its info card opens. */
const INFO_CARD_DELAY_MS = 550;
/** The tab "..." menu, sized like monday's own view menu. */
const MENU_WIDTH = 240;
const SUBMENU_WIDTH = 220;
const MENU_ICON_SIZE = 16;

/** Up and down chevrons, the "Reorder" row's icon. */
const ReorderIcon: React.FC = () => (
  <svg width={MENU_ICON_SIZE} height={MENU_ICON_SIZE} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M5 6l3-3 3 3M5 10l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** A press held at least this long is a grab, so releasing it doesn't open the tab even when it barely moved. */
const LONG_PRESS_MS = 500;

const InteractiveBoardViewTabs: React.FC<InteractiveBoardViewTabsProps> = ({
  tabs,
  active_view_id,
  onSelectView,
  onAddView,
  view_type_options,
  onRenameView,
  onChangeEmoji,
  onDeleteView,
  onPinView,
  onDuplicateView,
  onLockView,
  getViewUrl,
  onReorderPersonalTabs,
  has_personal_order = false,
  onResetPersonalTabOrder,
  onToggleHiddenView,
  onSetDefaultView,
  onChangeDescription,
}) => {
  const dnd_id = useId();
  const [editing_id, setEditingId] = useState<number | string | null>(null);
  const [emoji_picker_id, setEmojiPickerId] = useState<number | string | null>(null);
  const [menu_id, setMenuId] = useState<number | string | null>(null);
  const [description_id, setDescriptionId] = useState<number | string | null>(null);
  const [pending_delete_id, setPendingDeleteId] = useState<number | string | null>(null);
  const [share_view_id, setShareViewId] = useState<number | string | null>(null);
  const [is_view_type_menu_open, setIsViewTypeMenuOpen] = useState(false);
  const [is_more_menu_open, setIsMoreMenuOpen] = useState(false);
  const [is_manage_open, setIsManageOpen] = useState(false);
  const [dragging_id, setDraggingId] = useState<UniqueIdentifier | null>(null);
  const [info_card, setInfoCard] = useState<{ id: number | string; el: HTMLElement } | null>(null);

  const tab_refs = useRef<Record<string, HTMLDivElement | null>>({});
  const emoji_button_refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const menu_button_refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const add_view_button_ref = useRef<HTMLButtonElement | null>(null);
  const more_button_ref = useRef<HTMLButtonElement | null>(null);
  const info_card_timer_ref = useRef<number | null>(null);
  // When the pointer press in progress started, and whether the click it ends with must be
  // ignored: a drag or a long press only moves the tab, a later plain click opens it.
  //
  // The click is blocked on the window rather than in `selectTab`, because the dragged tab
  // now sits under the pointer when it is dropped. dnd-kit stops that click's propagation
  // (so React's onClick never runs) but not its default action, so the tab's link would
  // otherwise make the browser load the moved view.
  const press_started_at_ref = useRef<number | null>(null);
  const ignore_tab_click_ref = useRef(false);

  // Window level and in the capture phase, so every press is seen even when it is released
  // outside the bar, and both flags are settled before the tab's own click handler runs.
  // A flag left over from a press that never produced a click is cleared by the next press
  // or key press, so it can never swallow a later genuine click (or a keyboard Enter).
  useEffect(() => {
    const handlePointerDown = () => {
      press_started_at_ref.current = Date.now();
      ignore_tab_click_ref.current = false;
    };
    const handlePointerUp = () => {
      const started_at = press_started_at_ref.current;
      press_started_at_ref.current = null;
      if (started_at !== null && Date.now() - started_at >= LONG_PRESS_MS) ignore_tab_click_ref.current = true;
    };
    const handleKeyDown = () => {
      ignore_tab_click_ref.current = false;
    };
    const handleClick = (event: MouseEvent) => {
      if (!ignore_tab_click_ref.current) return;
      ignore_tab_click_ref.current = false;
      if (!(event.target instanceof Node) || !bar_ref.current?.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  // ── Which tabs are on screen ──
  // Hidden tabs stay out of the bar unless they're the tab being viewed.
  const primary_id = (tabs.find((tab) => tab.is_primary) ?? tabs[0])?.id ?? null;
  const isPrimary = (tab: BoardViewTabItem) => tab.id === primary_id;
  const shown_tabs = useMemo(() => tabs.filter((tab) => !tab.is_hidden || tab.id === active_view_id), [tabs, active_view_id]);
  const hidden_tabs = tabs.filter((tab) => tab.is_hidden);
  const all_ids = tabs.map((tab) => tab.id);
  const shown_ids = shown_tabs.map((tab) => tab.id);

  // ── Overflow: measure every tab off screen, then keep as many as fit ──
  const bar_ref = useRef<HTMLDivElement | null>(null);
  const measure_ref = useRef<HTMLDivElement | null>(null);
  const [bar_width, setBarWidth] = useState(0);
  const [tab_widths, setTabWidths] = useState<Record<string, number>>({});
  const [more_button_width, setMoreButtonWidth] = useState(96);

  const readWidths = useCallback(() => {
    const measure_el = measure_ref.current;
    if (!measure_el) return;
    const next_widths: Record<string, number> = {};
    measure_el.querySelectorAll<HTMLElement>("[data-measure-id]").forEach((el) => {
      next_widths[el.dataset.measureId as string] = Math.ceil(el.getBoundingClientRect().width);
    });
    const more_el = measure_el.querySelector<HTMLElement>("[data-measure-more]");
    if (more_el) setMoreButtonWidth(Math.ceil(more_el.getBoundingClientRect().width));
    setTabWidths((current) => {
      const keys = Object.keys(next_widths);
      const unchanged = keys.length === Object.keys(current).length && keys.every((key) => current[key] === next_widths[key]);
      return unchanged ? current : next_widths;
    });
  }, []);

  useLayoutEffect(() => {
    const bar_el = bar_ref.current;
    const measure_el = measure_ref.current;
    if (!bar_el || !measure_el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setBarWidth(bar_el.clientWidth);
      readWidths();
    });
    observer.observe(bar_el);
    observer.observe(measure_el);
    setBarWidth(bar_el.clientWidth);
    return () => observer.disconnect();
  }, [readWidths]);

  // Labels, emojis and badges change a tab's width without resizing the bar.
  useLayoutEffect(() => {
    readWidths();
  }, [shown_tabs, readWidths]);

  const visible_ids = computeVisibleTabIds({
    ids: shown_ids,
    widths: tab_widths,
    available_width: bar_width - ADD_BUTTON_SPACE,
    more_button_width,
    gap: TAB_GAP,
    active_id: active_view_id,
  });
  const visible_tabs = visible_ids
    .map((id) => shown_tabs.find((tab) => tab.id === id))
    .filter((tab): tab is BoardViewTabItem => Boolean(tab));
  const overflow_tabs = shown_tabs.filter((tab) => !visible_ids.includes(tab.id));
  const show_more_button = overflow_tabs.length > 0 || hidden_tabs.length > 0;

  // ── Hover info card ──
  const clearInfoCardTimer = () => {
    if (info_card_timer_ref.current !== null) window.clearTimeout(info_card_timer_ref.current);
    info_card_timer_ref.current = null;
  };
  const is_any_overlay_open =
    menu_id !== null ||
    emoji_picker_id !== null ||
    description_id !== null ||
    editing_id !== null ||
    dragging_id !== null ||
    is_more_menu_open ||
    is_view_type_menu_open;

  const handleHoverStart = (id: number | string, el: HTMLElement) => {
    clearInfoCardTimer();
    if (is_any_overlay_open) return;
    info_card_timer_ref.current = window.setTimeout(() => setInfoCard({ id, el }), INFO_CARD_DELAY_MS);
  };
  const handleHoverEnd = () => {
    clearInfoCardTimer();
    setInfoCard(null);
  };
  useEffect(() => clearInfoCardTimer, []);
  useEffect(() => {
    if (is_any_overlay_open) {
      clearInfoCardTimer();
      setInfoCard(null);
    }
  }, [is_any_overlay_open]);

  const info_card_tab = info_card ? tabs.find((tab) => tab.id === info_card.id) ?? null : null;

  // ── Drag and drop ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Enter keeps opening the focused tab; Space picks it up and drops it.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    })
  );

  const labelOf = (id: UniqueIdentifier) => tabs.find((tab) => tab.id === id)?.label ?? "view";
  const positionOf = (id: UniqueIdentifier) => visible_ids.indexOf(id as number | string) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up the ${labelOf(active.id)} tab. It is at position ${positionOf(active.id)} of ${visible_ids.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `The ${labelOf(active.id)} tab moved to position ${positionOf(over.id)} of ${visible_ids.length}.`
        : `The ${labelOf(active.id)} tab is no longer over a drop position.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped the ${labelOf(active.id)} tab at position ${positionOf(over.id)} of ${visible_ids.length}.`
        : `Dropped the ${labelOf(active.id)} tab.`,
    onDragCancel: ({ active }) => `Reordering canceled. The ${labelOf(active.id)} tab went back to its place.`,
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    // The click that follows the drop only ends the drag. A flag rather than a time window, since
    // saving the new order can re-render a heavy board before that click arrives.
    ignore_tab_click_ref.current = true;
    setDraggingId(active.id);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggingId(null);
    if (!onReorderPersonalTabs || !over || active.id === over.id) return;
    const from_index = visible_ids.indexOf(active.id as number | string);
    const to_index = visible_ids.indexOf(over.id as number | string);
    if (from_index < 0 || to_index < 0) return;
    onReorderPersonalTabs(mergeReorderedIds(all_ids, arrayMove(visible_ids, from_index, to_index)));
  };

  const selectTab = (id: number | string) => {
    handleHoverEnd();
    onSelectView(id);
  };

  // ── Tab "..." menu ──
  const pending_delete_tab = tabs.find((tab) => tab.id === pending_delete_id) ?? null;
  const share_tab = tabs.find((tab) => tab.id === share_view_id) ?? null;
  const description_tab = tabs.find((tab) => tab.id === description_id) ?? null;
  const menu_tab = tabs.find((tab) => tab.id === menu_id) ?? null;
  const emoji_tab = tabs.find((tab) => tab.id === emoji_picker_id) ?? null;

  /** Builds the "Reorder (for you only)" submenu, or `undefined` when there's nothing to reorder. Rows have no icons, like monday's own. */
  const buildReorderSubmenu = (tab: BoardViewTabItem): ActionMenuSection[] | undefined => {
    if (!onReorderPersonalTabs) return undefined;
    const index = shown_ids.indexOf(tab.id);
    if (index < 0) return undefined;
    const is_first = index === 0;
    const is_last = index === shown_ids.length - 1;
    const moveTo = (target_index: number) => onReorderPersonalTabs(mergeReorderedIds(all_ids, moveId(shown_ids, tab.id, target_index)));

    const sections: ActionMenuSection[] = [];
    if (shown_ids.length >= 2) {
      sections.push({
        key: "move",
        items: [
          { key: "move-back", label: "Move back", disabled: is_first, onClick: () => moveTo(index - 1) },
          { key: "move-ahead", label: "Move ahead", disabled: is_last, onClick: () => moveTo(index + 1) },
          { key: "move-first", label: "Move to first", disabled: is_first, onClick: () => moveTo(0) },
          { key: "move-last", label: "Move to last", disabled: is_last, onClick: () => moveTo(shown_ids.length - 1) },
        ],
      });
    }
    if (onResetPersonalTabOrder) {
      sections.push({
        key: "reset",
        items: [{ key: "reset-order", label: "Reset to default order", disabled: !has_personal_order, onClick: onResetPersonalTabOrder }],
      });
    }
    return sections.length > 0 ? sections : undefined;
  };

  /**
   * Builds a tab's "..." menu, grouped the way monday.com groups it: Pin, then
   * the view's own edits, then the viewer's personal choices, Reorder, and
   * Delete last. Locked views get a reduced set, matching the backend's edit guards.
   */
  const buildMenuSections = (tab: BoardViewTabItem): ActionMenuSection[] => {
    const is_locked = Boolean(tab.is_locked);
    const is_primary = isPrimary(tab);
    const pin_items: ActionMenuItem[] = [];
    const edit_items: ActionMenuItem[] = [];
    const personal_items: ActionMenuItem[] = [];
    const reorder_items: ActionMenuItem[] = [];
    const delete_items: ActionMenuItem[] = [];

    if (onPinView) {
      pin_items.push({ key: "pin", label: tab.pinned ? "Unpin view" : "Pin view", icon: <PinIcon size={MENU_ICON_SIZE} />, onClick: () => onPinView(tab.id) });
    }

    if (onRenameView && !is_locked) {
      edit_items.push({ key: "rename", label: "Rename view", icon: <RenameIcon size={MENU_ICON_SIZE} />, onClick: () => setEditingId(tab.id) });
    }
    if (onChangeDescription && !is_locked) {
      edit_items.push({
        key: "description",
        label: tab.description ? "Edit description" : "Add description",
        icon: <InfoIcon size={MENU_ICON_SIZE} />,
        onClick: () => setDescriptionId(tab.id),
      });
    }
    if (onChangeEmoji && !is_locked) {
      edit_items.push({
        key: "icon",
        label: tab.emoji ? "Change icon" : "Add icon",
        icon: <ReactSmileyIcon size={MENU_ICON_SIZE} />,
        onClick: () => setEmojiPickerId(tab.id),
      });
    }
    if (onDuplicateView && !is_locked) {
      edit_items.push({ key: "duplicate", label: "Duplicate view", icon: <DuplicateIcon size={MENU_ICON_SIZE} />, onClick: () => onDuplicateView(tab.id) });
    }
    if (getViewUrl) {
      edit_items.push({ key: "share", label: "Share view", icon: <ShareIcon size={MENU_ICON_SIZE} />, onClick: () => setShareViewId(tab.id) });
    }
    if (onLockView) {
      edit_items.push({
        key: "lock",
        label: is_locked ? "Unlock view" : "Lock view to restrict edits",
        icon: is_locked ? <UnlockIcon size={MENU_ICON_SIZE} /> : <LockIcon size={MENU_ICON_SIZE} />,
        onClick: () => onLockView(tab.id),
      });
    }

    if (onSetDefaultView && !(tab.is_default && is_primary)) {
      personal_items.push({
        key: "default",
        label: tab.is_default ? "Remove as my default view" : "Set as my default view",
        icon: <HomeIcon size={MENU_ICON_SIZE} />,
        onClick: () => onSetDefaultView(tab.is_default ? null : tab.id),
      });
    }
    if (onToggleHiddenView) {
      const is_last_visible = !tab.is_hidden && tabs.filter((other) => !other.is_hidden).length <= 1;
      personal_items.push({
        key: "hide",
        label: tab.is_hidden ? "Show view" : "Hide view for me",
        icon: tab.is_hidden ? <EyeIcon size={MENU_ICON_SIZE} /> : <EyeOffIcon size={MENU_ICON_SIZE} />,
        disabled: is_last_visible,
        disabled_reason: is_last_visible ? "At least one view must stay visible" : undefined,
        onClick: () => onToggleHiddenView(tab.id),
      });
    }
    personal_items.push({ key: "manage", label: "Manage views", icon: <ViewsIcon size={MENU_ICON_SIZE} />, onClick: () => setIsManageOpen(true) });

    const reorder_sections = buildReorderSubmenu(tab);
    if (reorder_sections) {
      reorder_items.push({ key: "reorder", label: "Reorder (for you only)", icon: <ReorderIcon />, submenu_sections: reorder_sections });
    }

    if (onDeleteView && !is_primary && !is_locked) {
      delete_items.push({ key: "delete", label: "Delete view", icon: <DeleteIcon size={MENU_ICON_SIZE} />, onClick: () => setPendingDeleteId(tab.id) });
    }

    return [
      { key: "pin", items: pin_items },
      { key: "edit", items: edit_items },
      { key: "personal", items: personal_items },
      { key: "reorder", items: reorder_items },
      { key: "delete", items: delete_items },
    ].filter((section) => section.items.length > 0);
  };

  const menu_sections = menu_tab ? buildMenuSections(menu_tab) : [];

  return (
    <div ref={bar_ref} className="relative flex min-w-0 items-center gap-0.5 border-b border-shell-border">
      {/* Off screen copy of every tab, measured to decide which ones fit in the bar. */}
      <div ref={measure_ref} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 flex w-max items-center">
        {shown_tabs.map((tab) => (
          <div key={tab.id} data-measure-id={String(tab.id)} className="flex-none">
            <ViewTabFace tab={tab} has_menu />
          </div>
        ))}
        <span data-measure-more className="vt-bar-button">
          99 more
          <ChevronDownIcon size={12} />
        </span>
      </div>

      <DndContext
        id={dnd_id}
        sensors={sensors}
        collisionDetection={closestCenter}
        // The tab itself is carried (no floating copy), the same lift and slide as the Status
        // labels in Edit Labels, kept on the bar's row and inside the tab list.
        modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "To reorder a view tab, press Space to pick it up. Use the left and right arrow keys to move it, then press Space to drop it, or Escape to cancel.",
          },
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingId(null)}
      >
        <SortableContext items={visible_ids} strategy={horizontalListSortingStrategy}>
          <div role="tablist" aria-label="Board views" className="flex min-w-0 items-center gap-0.5">
            {visible_tabs.map((tab) => {
              const key = String(tab.id);
              const is_editing = editing_id === tab.id;

              return (
                <SortableViewTab
                  key={tab.id}
                  tab={{ ...tab, is_primary: isPrimary(tab) }}
                  is_active={tab.id === active_view_id}
                  is_editing={is_editing}
                  is_menu_open={menu_id === tab.id}
                  is_drag_disabled={!onReorderPersonalTabs || is_editing}
                  href={getViewUrl ? getViewUrl(tab) : null}
                  has_menu
                  can_change_emoji={Boolean(onChangeEmoji)}
                  tabRef={(el) => {
                    tab_refs.current[key] = el;
                  }}
                  emojiButtonRef={(el) => {
                    emoji_button_refs.current[key] = el;
                  }}
                  menuButtonRef={(el) => {
                    menu_button_refs.current[key] = el;
                  }}
                  onSelect={() => selectTab(tab.id)}
                  onStartRename={() => onRenameView && !tab.is_locked && setEditingId(tab.id)}
                  onCommitRename={(label) => {
                    onRenameView?.(tab.id, label);
                    setEditingId(null);
                  }}
                  onCancelRename={() => setEditingId(null)}
                  onOpenEmojiPicker={() => setEmojiPickerId(tab.id)}
                  onOpenMenu={() => setMenuId(tab.id)}
                  onHoverStart={(el) => handleHoverStart(tab.id, el)}
                  onHoverEnd={handleHoverEnd}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {show_more_button && (
        <PortalTooltip content={overflow_tabs.length > 0 ? "More views" : "Views hidden for you"} className="flex-none">
          <button
            ref={more_button_ref}
            type="button"
            onClick={() => setIsMoreMenuOpen(true)}
            aria-haspopup="menu"
            aria-expanded={is_more_menu_open}
            aria-label={overflow_tabs.length > 0 ? `${overflow_tabs.length} more views` : `${hidden_tabs.length} hidden views`}
            className="vt-bar-button"
          >
            {overflow_tabs.length > 0 ? (
              `${overflow_tabs.length} more`
            ) : (
              <>
                <EyeOffIcon size={14} />
                {hidden_tabs.length}
              </>
            )}
            <ChevronDownIcon size={12} />
          </button>
        </PortalTooltip>
      )}

      {/* Hides only the bubble while the menu is open. Toggling `disabled` would remount the button and detach the menu's anchor. */}
      <Tooltip
        content="Add view"
        placement="right"
        className={`ml-1 flex flex-none ${is_view_type_menu_open ? "[&>[role=tooltip]]:hidden" : ""}`}
      >
        <button
          ref={add_view_button_ref}
          type="button"
          onClick={() => (view_type_options ? setIsViewTypeMenuOpen(true) : onAddView?.())}
          className="vt-bar-button"
          data-variant="add"
          aria-haspopup={view_type_options ? "menu" : undefined}
          aria-expanded={view_type_options ? is_view_type_menu_open : undefined}
          aria-label="Add view"
        >
          <PlusIcon size={16} />
        </button>
      </Tooltip>

      {view_type_options && (
        <AddBoardViewMenu
          anchor_el={add_view_button_ref.current}
          is_open={is_view_type_menu_open}
          onClose={() => setIsViewTypeMenuOpen(false)}
          onSelectType={(type) => onAddView?.(type.kind)}
          types={view_type_options}
        />
      )}

      <MoreViewsMenu
        anchor_el={more_button_ref.current}
        is_open={is_more_menu_open && show_more_button}
        onClose={() => setIsMoreMenuOpen(false)}
        overflow_tabs={overflow_tabs}
        hidden_tabs={hidden_tabs}
        active_view_id={active_view_id}
        onSelectView={selectTab}
        onShowView={onToggleHiddenView}
        onManageViews={() => setIsManageOpen(true)}
      />

      <ViewTabInfoCard tab={info_card_tab} anchor_el={info_card?.el ?? null} />

      {onChangeEmoji && (
        <BoardViewEmojiPicker
          anchor_el={
            emoji_picker_id !== null
              ? emoji_button_refs.current[String(emoji_picker_id)] ?? tab_refs.current[String(emoji_picker_id)] ?? null
              : null
          }
          is_open={emoji_tab !== null}
          onClose={() => setEmojiPickerId(null)}
          current_emoji={emoji_tab?.emoji ?? null}
          onSelect={(emoji) => emoji_tab && onChangeEmoji(emoji_tab.id, emoji)}
        />
      )}

      <ActionMenu
        key={menu_id ?? "closed"}
        anchor_el={menu_id !== null ? menu_button_refs.current[String(menu_id)] ?? null : null}
        is_open={menu_tab !== null && menu_sections.length > 0}
        onClose={() => setMenuId(null)}
        aria_label={menu_tab ? `${menu_tab.label} view options` : "View options"}
        width={MENU_WIDTH}
        submenu_width={SUBMENU_WIDTH}
        align="start"
        class_name="view-tab-menu"
        sections={menu_sections}
      />

      {onChangeDescription && (
        <ViewDescriptionPopover
          anchor_el={description_id !== null ? tab_refs.current[String(description_id)] ?? null : null}
          is_open={description_tab !== null}
          view_label={description_tab?.label ?? ""}
          description={description_tab?.description ?? null}
          onClose={() => setDescriptionId(null)}
          onSave={(description) => description_tab && onChangeDescription(description_tab.id, description)}
        />
      )}

      <ManageViewsModal
        is_open={is_manage_open}
        onClose={() => setIsManageOpen(false)}
        tabs={tabs.map((tab) => ({ ...tab, is_primary: isPrimary(tab) }))}
        active_view_id={active_view_id}
        onSelectView={onSelectView}
        onToggleHiddenView={onToggleHiddenView}
        onSetDefaultView={onSetDefaultView}
        onChangeDescription={onChangeDescription}
        onRequestDelete={onDeleteView ? setPendingDeleteId : undefined}
        has_personal_order={has_personal_order}
        onResetOrder={onResetPersonalTabOrder}
      />

      {onDeleteView && (
        <ConfirmActionModal
          is_open={pending_delete_tab !== null}
          title="Delete view"
          description={
            <>
              Are you sure you want to delete &ldquo;{pending_delete_tab?.label}&rdquo;? This can&rsquo;t be undone.
            </>
          }
          confirm_label="Delete view"
          danger
          onClose={() => setPendingDeleteId(null)}
          onConfirm={() => {
            if (pending_delete_tab) onDeleteView(pending_delete_tab.id);
          }}
        />
      )}

      {getViewUrl && (
        <CopyLinkModal
          is_open={share_tab !== null}
          title="Share view"
          description={share_tab ? <>Anyone with access to this board can open &ldquo;{share_tab.label}&rdquo; from this link.</> : null}
          link={share_tab && typeof window !== "undefined" ? `${window.location.origin}${getViewUrl(share_tab)}` : ""}
          onClose={() => setShareViewId(null)}
        />
      )}
    </div>
  );
};
