"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, GitBranch, Link2, Maximize2, Minimize2, Paperclip, Plus, X, Zap } from "lucide-react";
import { CheckIcon, CloseIcon } from "@/icons/board-icons";
import { FilesTabIcon, UpdatesTabIcon } from "@/icons/drawer-icons";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import type { BoardItemChecklistItemDto } from "@/types/board-content";
import AddColumnMenu from "../AddColumnMenu";
import type { AddableColumnType, BoardColumnKind } from "../columnTypes";
import BoardValueCell, { type BoardCellOption, type BoardCellPerson, type BoardCellValue, type BoardOptionActions } from "../cells/BoardValueCell";
import BoardItemOptionsMenu from "../drawer/BoardItemOptionsMenu";
import FilesPanel from "../drawer/FilesPanel";
import type { BoardItemDrawerApi, DrawerTabId } from "../drawer/types";
import UpdatesPanel from "../drawer/UpdatesPanel";
import { useCommentPresence } from "../drawer/useCommentPresence";
import { useLatchWhileOpen } from "../drawer/useLatchWhileOpen";
import PersonAvatar from "../PersonAvatar";
import BoardPopover from "../toolbar/BoardPopover";
import KanbanChecklistSection from "./KanbanChecklistSection";
import KanbanItemActivityPanel from "./KanbanItemActivityPanel";
import { GroupFieldIcon, KanbanColumnIcon } from "./kanbanColumnIcons";
import "../monday-palette.css";
import "./kanban-item-modal.css";

/** One editable field of the item card, backed by a board column. */
export type KanbanItemField = {
  id: string;
  label: string;
  kind: BoardColumnKind;
  options?: BoardCellOption[];
  /** False for the columns the Kanban view itself relies on (lanes, assignee, due date...), which stay on every card. */
  is_removable: boolean;
  /** Status pill treatment, `"outline"` for a Priority style column. */
  pill_style?: "solid" | "outline";
};

export type KanbanItemGroupOption = { id: string; label: string; color: string };

export type KanbanItemModalProps<TRow> = {
  drawer: BoardItemDrawerApi<TRow>;
  /** Board name, shown in the "in Board" breadcrumb. */
  board_label: string;
  title: string;
  onRenameTitle: (title: string) => void;

  is_done: boolean;
  /** Omit to disable the "Mark complete" button, the board has no checkbox column. */
  onToggleDone?: () => void;

  /** Who created the item and when, omit while the detail fetch is still loading. */
  created_by?: { id: string; full_name: string; profile_photo_url: string | null } | null;
  created_at?: string | null;

  /** The group (table) the item sits in. Omit to hide the Group field. */
  group?: {
    options: KanbanItemGroupOption[];
    selected_id: string | null;
    /** Omit for a subitem, whose group follows its parent's. */
    onSelect?: (group_id: string) => void;
  };

  /** Every board column, drawn as editable fields. Omit to hide the field list. */
  fields?: {
    columns: KanbanItemField[];
    people: BoardCellPerson[];
    getValue: (column_id: string) => BoardCellValue;
    onCommit: (column_id: string, value: BoardCellValue) => void;
    onAddOption: (column_id: string, option: { label: string; color: string }) => Promise<BoardCellOption | null>;
    onEditOptions: (column_id: string) => BoardOptionActions;
    /** Omit to hide "Add field". */
    onAddProperty?: (type: AddableColumnType) => void;
    onRemoveProperty?: (column_id: string) => void;
  };

  /** Omit to hide the Subtasks section. */
  checklist?: {
    items: BoardItemChecklistItemDto[];
    loading: boolean;
    onAdd: (label: string) => void;
    onToggle: (checklist_item_id: number) => void;
    onRename: (checklist_item_id: number, label: string) => void;
    onDelete: (checklist_item_id: number) => void;
  };

  /** Previous and next card of the board, in lane order. Omit to hide the arrows. */
  navigation?: {
    index: number;
    total: number;
    onPrevious?: () => void;
    onNext?: () => void;
  };
};

type SideTabId = DrawerTabId | "activity";

type SideTab = { id: SideTabId; label: string; icon?: React.ReactNode; count?: number };

const TRANSITION_DURATION_MS = 220;
/** Column kinds whose value cell paints edge to edge, like the table's status cells. */
const BLEED_KINDS = new Set<BoardColumnKind>(["status", "label"]);
const OPTION_KINDS = new Set<BoardColumnKind>(["status", "label", "tags", "dropdown"]);
/** Kinds that are edited elsewhere in the card, or that have no editor in the cell kit. */
const HIDDEN_FIELD_KINDS = new Set<BoardColumnKind>(["checklist", "button"]);

const getPersonInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatCreatedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** Grows a textarea with its content so long titles and descriptions never scroll inside a tiny box. */
const useAutoGrow = (ref: React.RefObject<HTMLTextAreaElement | null>, value: string) => {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [ref, value]);
};

/** Keeps the modal mounted while it fades out, and flips `is_visible` a frame after mounting so the fade in has a start state to animate from. */
const useModalTransition = (is_open: boolean) => {
  const [is_mounted, setIsMounted] = useState(is_open);
  const [is_visible, setIsVisible] = useState(false);

  useEffect(() => {
    if (is_open) {
      setIsMounted(true);
      let inner_raf_id = 0;
      const outer_raf_id = requestAnimationFrame(() => {
        inner_raf_id = requestAnimationFrame(() => setIsVisible(true));
      });
      return () => {
        cancelAnimationFrame(outer_raf_id);
        cancelAnimationFrame(inner_raf_id);
      };
    }
    setIsVisible(false);
    const timeout_id = setTimeout(() => setIsMounted(false), TRANSITION_DURATION_MS);
    return () => clearTimeout(timeout_id);
  }, [is_open]);

  return { is_mounted, is_visible };
};

/**
 * Item card for the Kanban board, a centered modal in place of the old side
 * drawer so there is room for every field. Laid out like monday.com's item
 * card: the title and every board column as an editable field on the left,
 * with the description and subtasks under them, and Updates, Files and the
 * Activity Log on the right. Asana's task pane lends the top bar: a "Mark
 * complete" button, previous and next task, copy link, attach a file, a full
 * screen toggle and the item options menu.
 *
 * Every field writes through the same persistence the board table uses
 * (`handleUpdateCellValue`, `useBoardItemDrawer`), only the presentation is
 * Kanban specific. Styles live in `kanban-item-modal.css`.
 */
function KanbanItemModal<TRow>(props: KanbanItemModalProps<TRow>) {
  // Latches the whole props bundle so the card keeps showing its item while
  // it fades out, `drawer.close()` clears the open row synchronously.
  const { drawer, board_label, title, onRenameTitle, is_done, onToggleDone, created_by, created_at, group, fields, checklist, navigation } =
    useLatchWhileOpen(props, props.drawer.is_open);
  const { is_mounted, is_visible } = useModalTransition(props.drawer.is_open);

  const [is_expanded, setIsExpanded] = useState(false);
  const [side_tab, setSideTab] = useState<SideTabId>("updates");
  const [title_draft, setTitleDraft] = useState(title);
  const [group_anchor_el, setGroupAnchorEl] = useState<HTMLElement | null>(null);
  const [add_field_anchor_el, setAddFieldAnchorEl] = useState<HTMLElement | null>(null);
  const [field_pending_removal_id, setFieldPendingRemovalId] = useState<string | null>(null);

  const panel_ref = useRef<HTMLDivElement>(null);
  const title_ref = useRef<HTMLTextAreaElement>(null);
  const description_ref = useRef<HTMLTextAreaElement>(null);
  const attach_input_ref = useRef<HTMLInputElement>(null);
  const is_title_focused_ref = useRef(false);

  useAutoGrow(title_ref, title_draft);
  useAutoGrow(description_ref, drawer.description);

  // Live updates and "typing" for this item, same channel the board drawer joins.
  const presence_channel_name = drawer.board_id !== undefined && drawer.open_row_id ? `board-item.${drawer.open_row_id}` : null;
  const presence = useCommentPresence(presence_channel_name, { onCommentPosted: drawer.onRemoteCommentPosted });

  // A different item, or a rename that landed from elsewhere, resets the title draft unless it is being edited.
  useEffect(() => {
    if (!is_title_focused_ref.current) setTitleDraft(title);
  }, [title, drawer.open_row_id]);

  // Each item opens on its Updates tab.
  useEffect(() => {
    setSideTab("updates");
  }, [drawer.open_row_id]);

  // Focus the card on open so Escape and Tab start inside it.
  useEffect(() => {
    if (is_visible) panel_ref.current?.focus({ preventScroll: true });
  }, [is_visible]);

  // Escape closes the card, unless something inside it already handled the key
  // (an inline editor cancelling) or focus sits in another dialog on top of it.
  // Popovers stop the key at `document`, so this window listener never sees theirs.
  useEffect(() => {
    if (!props.drawer.is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const active_element = document.activeElement;
      const is_inside_card = !active_element || active_element === document.body || panel_ref.current?.contains(active_element);
      if (!is_inside_card) return;
      if (active_element instanceof HTMLElement && active_element !== panel_ref.current && panel_ref.current?.contains(active_element)) {
        // First Escape leaves a focused field, the next one closes the card.
        if (active_element.matches("input, textarea, [contenteditable='true']")) {
          active_element.blur();
          panel_ref.current?.focus({ preventScroll: true });
          return;
        }
      }
      props.drawer.close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.drawer]);

  if (!is_mounted) return null;

  const commitTitle = () => {
    const trimmed = title_draft.trim();
    if (!trimmed) {
      setTitleDraft(title);
      return;
    }
    if (trimmed !== title) onRenameTitle(trimmed);
  };

  const attachFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    drawer.postAttachments(Array.from(files));
    setSideTab("files");
  };

  const is_api_backed = drawer.board_id !== undefined;
  const selected_group = group?.options.find((option) => option.id === group.selected_id) ?? null;
  const visible_fields = (fields?.columns ?? []).filter((column) => !HIDDEN_FIELD_KINDS.has(column.kind));
  const field_pending_removal = fields?.columns.find((column) => column.id === field_pending_removal_id) ?? null;

  const side_tabs: SideTab[] = [
    { id: "updates", label: "Updates", icon: <UpdatesTabIcon size={15} />, count: drawer.comments.length },
    { id: "files", label: "Files", icon: <FilesTabIcon size={15} />, count: drawer.all_attachments.length },
    ...(is_api_backed && drawer.open_row_id ? [{ id: "activity" as const, label: "Activity Log" }] : []),
    ...(drawer.renderDependenciesTab ? [{ id: "dependencies" as const, label: "Dependencies", icon: <GitBranch size={15} /> }] : []),
    ...(drawer.renderAutomationsTab ? [{ id: "automations" as const, label: "Automations", icon: <Zap size={15} /> }] : []),
  ];

  // Reloads the activity log once a field, the title or the group changes.
  const activity_refresh_key = JSON.stringify([title, group?.selected_id, visible_fields.map((column) => fields?.getValue(column.id))]);

  return (
    <div
      className="kanban-item-modal board-table-theme board-chrome-theme"
      data-visible={is_visible || undefined}
      data-expanded={is_expanded || undefined}
    >
      <div className="kanban-item-modal__backdrop" onClick={props.drawer.close} aria-hidden="true" />
      <div className="kanban-item-modal__frame">
        <div
          ref={panel_ref}
          className="kanban-item-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-label={title || "Item"}
          tabIndex={-1}
        >
          {/* Top bar */}
          <div className="kanban-item-modal__topbar">
            <button
              type="button"
              className="kanban-item-modal__complete"
              data-done={is_done || undefined}
              onClick={onToggleDone}
              disabled={!onToggleDone}
              aria-pressed={is_done}
              title={onToggleDone ? undefined : "Add a checkbox column to this board to complete items"}
            >
              <span className="kanban-item-modal__complete-check">
                <CheckIcon size={10} />
              </span>
              {is_done ? "Completed" : "Mark complete"}
            </button>

            <div className="kanban-item-modal__breadcrumb">
              <span>in</span>
              <span className="kanban-item-modal__breadcrumb-board" title={board_label}>
                {board_label}
              </span>
              {selected_group && (
                <>
                  <span aria-hidden="true">/</span>
                  <span className="truncate" style={{ color: selected_group.color }} title={selected_group.label}>
                    {selected_group.label}
                  </span>
                </>
              )}
            </div>

            <div className="kanban-item-modal__actions">
              {navigation && navigation.total > 1 && (
                <>
                  <button
                    type="button"
                    className="kanban-item-modal__icon-button"
                    onClick={navigation.onPrevious}
                    disabled={!navigation.onPrevious}
                    aria-label="Previous item"
                    title="Previous item"
                  >
                    <ChevronUp size={18} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    className="kanban-item-modal__icon-button"
                    onClick={navigation.onNext}
                    disabled={!navigation.onNext}
                    aria-label="Next item"
                    title="Next item"
                  >
                    <ChevronDown size={18} strokeWidth={1.75} />
                  </button>
                  <span className="kanban-item-modal__nav-count" aria-live="polite">
                    {navigation.index + 1} of {navigation.total}
                  </span>
                  <span className="kanban-item-modal__divider" aria-hidden="true" />
                </>
              )}
              {is_api_backed && (
                <button
                  type="button"
                  className="kanban-item-modal__icon-button"
                  onClick={() => void drawer.copyItemLink()}
                  aria-label="Copy item link"
                  title="Copy item link"
                >
                  <Link2 size={17} strokeWidth={1.75} />
                </button>
              )}
              <button
                type="button"
                className="kanban-item-modal__icon-button"
                onClick={() => attach_input_ref.current?.click()}
                disabled={drawer.is_uploading_files}
                aria-label="Attach a file"
                title="Attach a file"
              >
                <Paperclip size={17} strokeWidth={1.75} />
              </button>
              <input
                ref={attach_input_ref}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  attachFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                className="kanban-item-modal__icon-button"
                onClick={() => setIsExpanded((value) => !value)}
                aria-label={is_expanded ? "Exit full screen" : "Full screen"}
                title={is_expanded ? "Exit full screen" : "Full screen"}
              >
                {is_expanded ? <Minimize2 size={16} strokeWidth={1.75} /> : <Maximize2 size={16} strokeWidth={1.75} />}
              </button>
              <BoardItemOptionsMenu drawer={drawer} onItemRemoved={props.drawer.close} />
              <span className="kanban-item-modal__divider" aria-hidden="true" />
              <button
                type="button"
                className="kanban-item-modal__icon-button"
                onClick={props.drawer.close}
                aria-label="Close"
                title="Close"
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {drawer.item_action_feedback && (
            <div className="kanban-item-modal__feedback" data-tone={drawer.item_action_feedback.tone} role="status">
              <span>{drawer.item_action_feedback.message}</span>
              <button
                type="button"
                onClick={drawer.dismissItemActionFeedback}
                aria-label="Dismiss message"
                className="flex h-5 w-5 flex-none items-center justify-center rounded-md"
              >
                <CloseIcon size={12} />
              </button>
            </div>
          )}

          <div className="kanban-item-modal__body">
            {/* Details */}
            <div className="kanban-item-modal__details shell-scrollbar">
              <textarea
                ref={title_ref}
                value={title_draft}
                rows={1}
                onFocus={() => {
                  is_title_focused_ref.current = true;
                }}
                onChange={(event) => setTitleDraft(event.target.value.replace(/\n/g, " "))}
                onBlur={() => {
                  is_title_focused_ref.current = false;
                  commitTitle();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setTitleDraft(title);
                    is_title_focused_ref.current = false;
                    requestAnimationFrame(() => panel_ref.current?.focus({ preventScroll: true }));
                  }
                }}
                placeholder="Item name"
                aria-label="Item name"
                data-done={is_done || undefined}
                className="kanban-item-modal__title font-heading text-page-title"
              />

              <div className="kanban-item-modal__meta">
                {created_by && (
                  <>
                    <PersonAvatar
                      person={{
                        id: created_by.id,
                        name: created_by.full_name,
                        initials: getPersonInitials(created_by.full_name),
                        avatar_seed: Number(created_by.id) || 0,
                        avatar_url: created_by.profile_photo_url ?? undefined,
                      }}
                      size={18}
                    />
                    <span>
                      Created by {created_by.full_name}
                      {created_at ? ` on ${formatCreatedAt(created_at)}` : ""}
                    </span>
                  </>
                )}
              </div>

              <div className="kanban-item-modal__fields">
                {group && (
                  <div className="kanban-item-modal__field">
                    <div className="kanban-item-modal__field-label">
                      <GroupFieldIcon size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span className="kanban-item-modal__field-label-text">Group</span>
                    </div>
                    <div className="kanban-item-modal__value">
                      <button
                        type="button"
                        className="kanban-item-modal__group-value"
                        onClick={(event) => group.onSelect && setGroupAnchorEl(event.currentTarget)}
                        disabled={!group.onSelect}
                        aria-haspopup="listbox"
                        aria-expanded={group_anchor_el !== null}
                      >
                        <span className="kanban-item-modal__group-dot" style={{ background: selected_group?.color ?? "#c4c4c4" }} />
                        <span className="truncate">{selected_group?.label ?? "No group"}</span>
                      </button>
                    </div>
                    <BoardPopover
                      anchor_el={group_anchor_el}
                      is_open={group_anchor_el !== null}
                      onClose={() => setGroupAnchorEl(null)}
                      align="start"
                      width={260}
                      unstyled
                    >
                      <div className="action-menu" role="listbox" aria-label="Move to group">
                        <div className="action-menu__title">Move to group</div>
                        {group.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            role="option"
                            aria-selected={option.id === group.selected_id}
                            className="action-menu__item"
                            onClick={() => {
                              setGroupAnchorEl(null);
                              if (option.id !== group.selected_id) group.onSelect?.(option.id);
                            }}
                          >
                            <span className="action-menu__icon">
                              <span className="kanban-item-modal__group-dot" style={{ background: option.color }} />
                            </span>
                            <span className="action-menu__label">{option.label}</span>
                            {option.id === group.selected_id && <CheckIcon size={12} />}
                          </button>
                        ))}
                      </div>
                    </BoardPopover>
                  </div>
                )}

                {fields &&
                  visible_fields.map((column) => {
                    const is_bleed = BLEED_KINDS.has(column.kind) && column.pill_style !== "outline";
                    const has_options = OPTION_KINDS.has(column.kind);
                    return (
                      <div key={column.id} className="kanban-item-modal__field">
                        <div className="kanban-item-modal__field-label">
                          <KanbanColumnIcon kind={column.kind} />
                          <span className="kanban-item-modal__field-label-text" title={column.label}>
                            {column.label}
                          </span>
                          {column.is_removable && fields.onRemoveProperty && (
                            <button
                              type="button"
                              onClick={() => setFieldPendingRemovalId(column.id)}
                              aria-label={`Remove ${column.label} field`}
                              title="Remove field"
                              className="kanban-item-modal__field-remove"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        <div className="kanban-item-modal__value" data-bleed={is_bleed || undefined}>
                          <BoardValueCell
                            column={{ id: column.id, kind: column.kind, options: column.options }}
                            value={fields.getValue(column.id)}
                            people={fields.people}
                            onCommit={(value) => fields.onCommit(column.id, value)}
                            onAddOption={has_options ? (option) => fields.onAddOption(column.id, option) : undefined}
                            onEditOptions={has_options ? fields.onEditOptions(column.id) : undefined}
                            bleed={is_bleed}
                            pill_style={column.pill_style}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {fields?.onAddProperty && (
                <>
                  <button type="button" className="kanban-item-modal__add-field" onClick={(event) => setAddFieldAnchorEl(event.currentTarget)}>
                    <Plus size={16} strokeWidth={1.75} />
                    Add field
                  </button>
                  <AddColumnMenu
                    anchor_el={add_field_anchor_el}
                    is_open={add_field_anchor_el !== null}
                    onClose={() => setAddFieldAnchorEl(null)}
                    onSelectType={(type: AddableColumnType) => {
                      fields.onAddProperty?.(type);
                      setAddFieldAnchorEl(null);
                    }}
                  />
                </>
              )}

              {drawer.has_description && (
                <section className="kanban-item-modal__section" aria-labelledby="kanban-item-description-title">
                  <div className="kanban-item-modal__section-head">
                    <h3 id="kanban-item-description-title" className="kanban-item-modal__section-title">
                      Description
                    </h3>
                  </div>
                  <textarea
                    ref={description_ref}
                    value={drawer.description}
                    onChange={(event) => drawer.onDescriptionChange(event.target.value)}
                    placeholder="What is this item about? Add details, links or acceptance criteria."
                    aria-labelledby="kanban-item-description-title"
                    className="kanban-item-modal__description"
                  />
                </section>
              )}

              {checklist && (
                <KanbanChecklistSection
                  items={checklist.items}
                  loading={checklist.loading}
                  onAdd={checklist.onAdd}
                  onToggle={checklist.onToggle}
                  onRename={checklist.onRename}
                  onDelete={checklist.onDelete}
                />
              )}
            </div>

            {/* Updates, Files, Activity Log */}
            <div className="kanban-item-modal__side">
              <div className="kanban-item-modal__tabs" role="tablist" aria-label="Item activity">
                {side_tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={side_tab === tab.id}
                    className="kanban-item-modal__tab"
                    onClick={() => {
                      setSideTab(tab.id);
                      if (tab.id !== "activity") drawer.setActiveTab(tab.id);
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && <span className="kanban-item-modal__tab-count">/ {tab.count}</span>}
                  </button>
                ))}
              </div>

              {side_tab === "updates" && <UpdatesPanel drawer={drawer} presence={presence} />}
              {side_tab === "files" && <FilesPanel drawer={drawer} />}
              {side_tab === "activity" && drawer.board_id !== undefined && drawer.open_row_id && (
                <KanbanItemActivityPanel
                  board_id={drawer.board_id}
                  item_id={drawer.open_row_id}
                  refresh_key={activity_refresh_key}
                  columns={fields?.columns ?? []}
                  group_colors={Object.fromEntries((group?.options ?? []).map((option) => [option.label, option.color]))}
                />
              )}
              {side_tab === "dependencies" && drawer.open_row_id && drawer.renderDependenciesTab?.(drawer.open_row_id)}
              {side_tab === "automations" && drawer.open_row_id && drawer.renderAutomationsTab?.(drawer.open_row_id)}
            </div>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        is_open={field_pending_removal !== null}
        title="Remove this field?"
        description={`This deletes the "${field_pending_removal?.label ?? ""}" column and its values from every item on this board. This can't be undone.`}
        confirm_label="Remove"
        variant="danger"
        onConfirm={() => {
          if (field_pending_removal_id) fields?.onRemoveProperty?.(field_pending_removal_id);
          setFieldPendingRemovalId(null);
        }}
        onClose={() => setFieldPendingRemovalId(null)}
      />
    </div>
  );
}

export default KanbanItemModal;
