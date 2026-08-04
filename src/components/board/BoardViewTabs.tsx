"use client";
import React, { useRef, useState } from "react";
import AnchoredMenu from "@/components/ui/dropdown/AnchoredMenu";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { ChevronDownIcon, DeleteIcon, MoreDotsIcon, PlusIcon, RenameIcon } from "@/icons/workspace-icons";
import { TableViewIcon } from "@/icons/board-icons";
import BoardViewIconPicker from "./BoardViewIconPicker";
import { getBoardViewIcon } from "./boardViewIcons";
import InlineTitleEditor from "./InlineTitleEditor";

/** One clickable tab in the interactive tab bar (see {@link BoardViewTabsProps}). */
export type BoardViewTabItem = {
  id: number | string;
  label: string;
  /** Key into `BOARD_VIEW_ICON_OPTIONS`; null/undefined shows no icon (except the primary tab, which defaults to the table icon). */
  icon?: string | null;
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
       * used by `TableBoardView` and `ClientHubBoard` to drive real
       * `/boards/{id}/views/{view_id}`-style tab switching. Clicking a tab
       * (or "+") is the caller's responsibility.
       */
      tabs: BoardViewTabItem[];
      active_view_id: number | string | null;
      onSelectView: (id: number | string) => void;
      onAddView?: () => void;
      /** Renames a tab — wired to `PATCH /boards/{id}/views/{id}` by the caller. Omit to make tabs read-only. */
      onRenameView?: (id: number | string, label: string) => void;
      /** Assigns (or clears, with `null`) a tab's icon. */
      onChangeIcon?: (id: number | string, icon: string | null) => void;
      /** Deletes a non-primary tab. Omit to hide the delete option. */
      onDeleteView?: (id: number | string) => void;
    };

/**
 * The row of board views ("Main table", team names, …).
 *
 * Two modes, discriminated by the shape of the props: the original static
 * `{ primary_label, views }` mode (used only for `TableBoardView`'s brief
 * loading skeleton, where there's nothing to click yet) and the interactive
 * `{ tabs, active_view_id, onSelectView }` mode every real board (Client Hub
 * included) renders through — real tab switching, inline rename, an icon
 * picker and tab deletion, all backed by `boards/{id}/views`.
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
          <TableViewIcon />
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

      <span className="flex cursor-pointer items-center gap-1.5 px-3 py-[9px] text-[13.5px] font-medium text-shell-text-muted transition-colors hover:text-shell-text">
        All
        <ChevronDownIcon size={11} />
      </span>

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
  onRenameView,
  onChangeIcon,
  onDeleteView,
}) => {
  const [editing_id, setEditingId] = useState<number | string | null>(null);
  const [icon_picker_id, setIconPickerId] = useState<number | string | null>(null);
  const [menu_id, setMenuId] = useState<number | string | null>(null);
  const [pending_delete_id, setPendingDeleteId] = useState<number | string | null>(null);
  const icon_button_refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const menu_button_refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const pending_delete_tab = tabs.find((tab) => tab.id === pending_delete_id) ?? null;

  return (
    <div className="flex items-center gap-0.5 border-b border-shell-border">
      {tabs.map((tab, index) => {
        const is_active = tab.id === active_view_id;
        const is_primary = index === 0;
        const is_editing = editing_id === tab.id;
        const Icon = getBoardViewIcon(tab.icon) ?? (is_primary ? TableViewIcon : null);
        const key = String(tab.id);

        return (
          <div
            key={tab.id}
            className={
              is_active
                ? "group -mb-px flex items-center gap-1.5 border-b-2 border-brand-500 px-3 py-[9px]"
                : "group -mb-px flex items-center gap-1.5 border-b-2 border-transparent px-3 py-[9px] transition-colors hover:border-shell-border-strong"
            }
          >
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
                onDoubleClick={() => onRenameView && setEditingId(tab.id)}
                className={
                  is_active
                    ? "cursor-pointer whitespace-nowrap text-[13.5px] font-semibold text-shell-text"
                    : "cursor-pointer whitespace-nowrap text-[13.5px] font-medium text-shell-text-muted transition-colors group-hover:text-shell-text"
                }
              >
                {tab.label}
              </button>
            )}

            {(onRenameView || onDeleteView) && (
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

            {(onRenameView || onDeleteView) && (
              <AnchoredMenu
                anchor_el={menu_button_refs.current[key] ?? null}
                is_open={menu_id === tab.id}
                onClose={() => setMenuId(null)}
                width={190}
                items={[
                  ...(onRenameView
                    ? [{ key: "rename", label: "Rename view", icon: <RenameIcon size={14} />, onClick: () => setEditingId(tab.id) }]
                    : []),
                  ...(onDeleteView && !is_primary
                    ? [
                        {
                          key: "delete",
                          label: "Delete view",
                          icon: <DeleteIcon size={14} />,
                          danger: true,
                          onClick: () => setPendingDeleteId(tab.id),
                        },
                      ]
                    : []),
                ]}
              />
            )}
          </div>
        );
      })}

      <span className="flex cursor-pointer items-center gap-1.5 px-3 py-[9px] text-[13.5px] font-medium text-shell-text-muted transition-colors hover:text-shell-text">
        All
        <ChevronDownIcon size={11} />
      </span>

      <button
        type="button"
        onClick={onAddView}
        className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
        aria-label="Add view"
      >
        <PlusIcon size={15} />
      </button>

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
    </div>
  );
};
