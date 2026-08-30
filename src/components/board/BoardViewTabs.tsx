"use client";
import React, { useRef, useState } from "react";
import AnchoredMenu from "@/components/ui/dropdown/AnchoredMenu";
import type { MenuListItem } from "@/components/ui/dropdown/MenuItemList";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import CopyLinkModal from "@/components/ui/modal/CopyLinkModal";
import {
  ChevronRightIcon,
  DeleteIcon,
  DuplicateIcon,
  LockBadgeIcon,
  LockIcon,
  MoreDotsIcon,
  MoveToIcon,
  PlusIcon,
  RenameIcon,
  ShareIcon,
  UnlockIcon,
} from "@/icons/workspace-icons";
import { KanbanViewIcon, PinIcon } from "@/icons/board-icons";
import AddBoardViewMenu from "./AddBoardViewMenu";
import type { BoardViewKind, BoardViewTypeOption } from "./boardViewTypes";
import BoardViewIconPicker from "./BoardViewIconPicker";
import { getBoardViewIcon } from "./boardViewIcons";
import InlineTitleEditor from "./InlineTitleEditor";

/** One clickable tab in the interactive tab bar (see {@link BoardViewTabsProps}). */
export type BoardViewTabItem = {
  id: number | string;
  label: string;
  /** Key into `BOARD_VIEW_ICON_OPTIONS`; null/undefined shows no icon (except the primary tab, which defaults to the Kanban icon). */
  icon?: string | null;
  /** Sorts ahead of unpinned tabs whenever the viewer has no personal tab order saved. */
  pinned?: boolean;
  /** While locked, Rename/Duplicate/Delete are hidden — only Pin, Share, Unlock and Reorder remain. */
  is_locked?: boolean;
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
       * Full tab list (including the primary tab), each addressable by id —
       * used by `TableBoardView` to drive real `/boards/{id}/views/{view_id}`-
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
       * `onAddView()` — omit to keep the simple one-click "add another table
       * tab" behavior (e.g. Client Hub, whose tabs are all mock-data tables).
       */
      view_type_options?: BoardViewTypeOption[];
      /** Renames a tab — wired to `PATCH /boards/{id}/views/{id}` by the caller. Omit to make tabs read-only. */
      onRenameView?: (id: number | string, label: string) => void;
      /** Assigns (or clears, with `null`) a tab's icon. */
      onChangeIcon?: (id: number | string, icon: string | null) => void;
      /** Deletes a non-primary tab. Omit to hide the delete option. */
      onDeleteView?: (id: number | string) => void;
      /** Toggles whether a tab is pinned. Omit to hide the pin option. */
      onPinView?: (id: number | string) => void;
      /** Duplicates a tab's label + saved filter/sort/display config. Omit to hide the duplicate option. */
      onDuplicateView?: (id: number | string) => void;
      /** Toggles whether a tab is locked to restrict edits. Omit to hide the lock option. */
      onLockView?: (id: number | string) => void;
      /** Builds the deep-link URL for a tab's "Share view" menu item. Omit to hide the share option. */
      getViewUrl?: (tab: BoardViewTabItem) => string;
      /** Saves the viewer's own tab order (doesn't affect other collaborators). Omit to hide the reorder option. */
      onReorderPersonalTabs?: (ordered_ids: Array<number | string>) => void;
    };

/**
 * The row of board views ("Main table", team names, …).
 *
 * Two modes, discriminated by the shape of the props: the original static
 * `{ primary_label, views }` mode (used only for `TableBoardView`'s brief
 * loading skeleton, where there's nothing to click yet) and the interactive
 * `{ tabs, active_view_id, onSelectView }` mode every real board (Client Hub
 * included) renders through — real tab switching, inline rename, an icon
 * picker, pin/duplicate/share/lock and a personal reorder submenu, all
 * backed by `boards/{id}/views`.
 */
const BoardViewTabs: React.FC<BoardViewTabsProps> = (props) => {
  if ("tabs" in props) {
    return <InteractiveBoardViewTabs {...props} />;
  }

  const { primary_label, views } = props;

  return (
    <div className="flex items-center gap-0.5 border-b border-shell-border">
      <span className="-mb-px flex items-center gap-2 border-b-2 border-brand-500 px-3 py-[9px] text-[13.5px] font-semibold text-shell-text">
        <span className="text-[#00c875]">
          <KanbanViewIcon />
        </span>
        {primary_label}
        <span className="text-shell-text-muted">
          <MoreDotsIcon size={12} />
        </span>
      </span>

      {views.map((view, index) => (
        <span
          key={`${view}-${index}`}
          className="-mb-px cursor-pointer whitespace-nowrap border-b-2 border-transparent px-3 py-[9px] text-[13.5px] font-medium text-shell-text-muted transition-colors hover:text-shell-text"
        >
          {view}
        </span>
      ))}

      <button
        type="button"
        className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
        aria-label="Add view"
      >
        <PlusIcon size={15} />
      </button>
    </div>
  );
};

export default BoardViewTabs;

// ─────────────────────────────────────────────────────────────────────────────

type InteractiveBoardViewTabsProps = Extract<BoardViewTabsProps, { tabs: BoardViewTabItem[] }>;

const InteractiveBoardViewTabs: React.FC<InteractiveBoardViewTabsProps> = ({
  tabs,
  active_view_id,
  onSelectView,
  onAddView,
  view_type_options,
  onRenameView,
  onChangeIcon,
  onDeleteView,
  onPinView,
  onDuplicateView,
  onLockView,
  getViewUrl,
  onReorderPersonalTabs,
}) => {
  const [editing_id, setEditingId] = useState<number | string | null>(null);
  const [icon_picker_id, setIconPickerId] = useState<number | string | null>(null);
  const [menu_id, setMenuId] = useState<number | string | null>(null);
  const [pending_delete_id, setPendingDeleteId] = useState<number | string | null>(null);
  const [share_view_id, setShareViewId] = useState<number | string | null>(null);
  const [is_view_type_menu_open, setIsViewTypeMenuOpen] = useState(false);
  const icon_button_refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const menu_button_refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const add_view_button_ref = useRef<HTMLButtonElement | null>(null);

  const pending_delete_tab = tabs.find((tab) => tab.id === pending_delete_id) ?? null;
  const share_tab = tabs.find((tab) => tab.id === share_view_id) ?? null;
  const non_primary_tabs = tabs.slice(1);

  /** Builds the "Reorder (for you only)" submenu for a non-primary tab, or `undefined` when there's nothing to reorder. */
  const buildReorderSubmenu = (tab: BoardViewTabItem): MenuListItem[] | undefined => {
    if (!onReorderPersonalTabs || non_primary_tabs.length < 2) return undefined;

    const index = non_primary_tabs.findIndex((t) => t.id === tab.id);
    const is_first = index === 0;
    const is_last = index === non_primary_tabs.length - 1;
    const other_ids = non_primary_tabs.filter((t) => t.id !== tab.id).map((t) => t.id);

    const moveTo = (target_index: number) => {
      const ordered = other_ids.slice();
      ordered.splice(target_index, 0, tab.id);
      onReorderPersonalTabs(ordered);
    };

    return [
      {
        key: "move-back",
        label: "Move back",
        icon: <ChevronRightIcon className="-rotate-90" size={13} />,
        disabled: is_first,
        onClick: () => moveTo(index - 1),
      },
      {
        key: "move-ahead",
        label: "Move ahead",
        icon: <ChevronRightIcon className="rotate-90" size={13} />,
        disabled: is_last,
        onClick: () => moveTo(index + 1),
      },
      {
        key: "move-first",
        label: "Move to first",
        icon: <ChevronRightIcon className="-rotate-90" size={13} />,
        disabled: is_first,
        onClick: () => moveTo(0),
      },
      {
        key: "move-last",
        label: "Move to last",
        icon: <ChevronRightIcon className="rotate-90" size={13} />,
        disabled: is_last,
        onClick: () => moveTo(other_ids.length),
      },
    ];
  };

  /** Builds a tab's "…" menu items — a reduced set while the view is locked, matching the backend's edit guards. */
  const buildMenuItems = (tab: BoardViewTabItem, is_primary: boolean): MenuListItem[] => {
    const items: MenuListItem[] = [];
    const is_locked = Boolean(tab.is_locked);

    if (onRenameView && !is_locked) {
      items.push({ key: "rename", label: "Rename view", icon: <RenameIcon size={14} />, onClick: () => setEditingId(tab.id) });
    }
    if (onPinView) {
      items.push({
        key: "pin",
        label: tab.pinned ? "Unpin view" : "Pin view",
        icon: <PinIcon size={14} />,
        onClick: () => onPinView(tab.id),
      });
    }
    if (onDuplicateView && !is_locked) {
      items.push({ key: "duplicate", label: "Duplicate view", icon: <DuplicateIcon size={14} />, onClick: () => onDuplicateView(tab.id) });
    }
    if (getViewUrl) {
      items.push({ key: "share", label: "Share view", icon: <ShareIcon size={14} />, onClick: () => setShareViewId(tab.id) });
    }
    if (onLockView) {
      items.push({
        key: "lock",
        label: is_locked ? "Unlock view" : "Lock view to restrict edits",
        icon: is_locked ? <UnlockIcon size={14} /> : <LockIcon size={14} />,
        onClick: () => onLockView(tab.id),
      });
    }
    if (!is_primary) {
      const submenu = buildReorderSubmenu(tab);
      if (submenu) {
        items.push({
          key: "reorder",
          label: "Reorder (for you only)",
          icon: <MoveToIcon size={14} />,
          trailing: <ChevronRightIcon size={11} />,
          onClick: () => {},
          submenu,
        });
      }
    }
    if (onDeleteView && !is_primary && !is_locked) {
      items.push({ key: "delete", label: "Delete view", icon: <DeleteIcon size={14} />, danger: true, onClick: () => setPendingDeleteId(tab.id) });
    }

    return items;
  };

  return (
    <div className="flex items-center gap-0.5 border-b border-shell-border">
      {tabs.map((tab, index) => {
        const is_active = tab.id === active_view_id;
        const is_primary = index === 0;
        const is_editing = editing_id === tab.id;
        const Icon = getBoardViewIcon(tab.icon) ?? (is_primary ? KanbanViewIcon : null);
        const key = String(tab.id);
        const menu_items = buildMenuItems(tab, is_primary);

        return (
          <div
            key={tab.id}
            className={
              is_active
                ? "group -mb-px flex items-center gap-1.5 border-b-2 border-brand-500 px-3 py-[9px]"
                : "group -mb-px flex items-center gap-1.5 border-b-2 border-transparent px-3 py-[9px] transition-colors hover:border-shell-border-strong"
            }
          >
            {tab.pinned && (
              <span className="flex flex-none items-center text-shell-text-faint" aria-label="Pinned">
                <PinIcon size={11} />
              </span>
            )}

            {onChangeIcon ? (
              <button
                ref={(el) => {
                  icon_button_refs.current[key] = el;
                }}
                type="button"
                aria-label="Change tab icon"
                onClick={() => setIconPickerId(tab.id)}
                className={
                  Icon
                    ? "flex flex-none items-center text-[#00c875]"
                    : "flex flex-none items-center text-shell-text-faint opacity-0 transition-opacity group-hover:opacity-100"
                }
              >
                {Icon ? <Icon size={13} /> : <PlusIcon size={11} />}
              </button>
            ) : (
              Icon && (
                <span className="flex flex-none items-center text-[#00c875]">
                  <Icon size={13} />
                </span>
              )
            )}

            {is_editing ? (
              <InlineTitleEditor
                value={tab.label}
                aria_label="Tab name"
                className="w-[120px] text-[13.5px] font-semibold"
                onCommit={(label) => {
                  onRenameView?.(tab.id, label);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => onSelectView(tab.id)}
                onDoubleClick={() => onRenameView && !tab.is_locked && setEditingId(tab.id)}
                className={
                  is_active
                    ? "flex items-center gap-1 whitespace-nowrap text-[13.5px] font-semibold text-shell-text"
                    : "flex items-center gap-1 whitespace-nowrap text-[13.5px] font-medium text-shell-text-muted transition-colors group-hover:text-shell-text"
                }
              >
                {tab.label}
                {tab.is_locked && (
                  <span className="flex flex-none items-center text-shell-text-faint" aria-label="Locked">
                    <LockBadgeIcon size={9} />
                  </span>
                )}
              </button>
            )}

            {menu_items.length > 0 && (
              <button
                ref={(el) => {
                  menu_button_refs.current[key] = el;
                }}
                type="button"
                aria-label="Tab options"
                onClick={() => setMenuId(tab.id)}
                className={
                  is_active
                    ? "flex flex-none items-center text-shell-text-muted"
                    : "flex flex-none items-center text-shell-text-muted opacity-0 transition-opacity group-hover:opacity-100"
                }
              >
                <MoreDotsIcon size={12} />
              </button>
            )}

            {onChangeIcon && (
              <BoardViewIconPicker
                anchor_el={icon_button_refs.current[key] ?? null}
                is_open={icon_picker_id === tab.id}
                onClose={() => setIconPickerId(null)}
                current_icon={tab.icon ?? null}
                onSelect={(icon_id) => onChangeIcon(tab.id, icon_id)}
              />
            )}

            {menu_items.length > 0 && (
              <AnchoredMenu
                anchor_el={menu_button_refs.current[key] ?? null}
                is_open={menu_id === tab.id}
                onClose={() => setMenuId(null)}
                width={220}
                items={menu_items}
              />
            )}
          </div>
        );
      })}

      <button
        ref={add_view_button_ref}
        type="button"
        onClick={() => (view_type_options ? setIsViewTypeMenuOpen(true) : onAddView?.())}
        className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
        aria-label="Add view"
      >
        <PlusIcon size={15} />
      </button>

      {view_type_options && (
        <AddBoardViewMenu
          anchor_el={add_view_button_ref.current}
          is_open={is_view_type_menu_open}
          onClose={() => setIsViewTypeMenuOpen(false)}
          onSelectType={(type) => onAddView?.(type.kind)}
          types={view_type_options}
        />
      )}

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
