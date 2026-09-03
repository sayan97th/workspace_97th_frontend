"use client";
import React, { useState } from "react";
import { AttachmentIcon, CheckIcon, CloseIcon, PlusIcon, SendIcon } from "@/icons/board-icons";
import { MoreDotsIcon } from "@/icons/workspace-icons";
import AddColumnMenu from "../AddColumnMenu";
import { COLUMN_KIND_SWATCH, type AddableColumnType, type BoardColumnKind } from "../columnTypes";
import ColumnSwatchBadge from "../toolbar/ColumnSwatchBadge";
import type { BoardItemDrawerApi } from "../drawer/types";
import CommentAttachmentChip from "../drawer/CommentAttachmentChip";
import CommentEditForm from "../drawer/CommentEditForm";
import CommentOptionsMenu from "../drawer/CommentOptionsMenu";
import FilesPanel from "../drawer/FilesPanel";
import SlideOverPanel from "../drawer/SlideOverPanel";
import { useLatchWhileOpen } from "../drawer/useLatchWhileOpen";
import PersonAvatar from "../PersonAvatar";
import type { PersonAvatarStackPerson } from "../PersonAvatarStack";
import BoardPopover from "../toolbar/BoardPopover";
import KanbanCardLabels from "./KanbanCardLabels";
import KanbanCardMembers from "./KanbanCardMembers";
import KanbanChecklistSection from "./KanbanChecklistSection";
import BoardValueCell, { type BoardCellPerson, type BoardCellValue } from "../cells/BoardValueCell";
import OptionPicker, { type BoardCellOption, type BoardOptionActions } from "../cells/OptionPicker";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import type { BoardItemChecklistItemDto } from "@/types/board-content";
import type { DrawerAttachment } from "../drawer/types";
import { KANBAN_COLORS } from "./kanbanDesign";

export type KanbanItemDrawerProps<TRow> = {
  drawer: BoardItemDrawerApi<TRow>;
  title: string;
  onRenameTitle: (title: string) => void;

  is_done: boolean;
  /** Omit to hide the "mark complete" toggle entirely — the board has no checkbox column. */
  onToggleDone?: () => void;

  /** Who created this card — omit to hide the row (e.g. while the detail fetch is still loading). */
  created_by?: { id: string; full_name: string; profile_photo_url: string | null } | null;

  /** Omit to hide the People row — the board has no people column. */
  people?: {
    roster: PersonAvatarStackPerson[];
    selected: PersonAvatarStackPerson[];
    onToggle: (person_id: string) => void;
  };

  /** Omit to hide the Due date row — the board has no date column. */
  due_date?: {
    value: string | null;
    onChange: (value: string | null) => void;
  };

  /** Omit to hide the Priority row — the board has no column labeled "Priority". */
  priority?: {
    options: BoardCellOption[];
    selected_id: string | null;
    onSelect: (option_id: string | null) => void;
    /** Lets the user add a new priority (e.g. beyond Low/Medium/High/Urgent) inline. */
    onCreateOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
    /** Rename/recolor/delete/deactivate an existing priority. */
    onEditOptions?: BoardOptionActions;
  };

  /** Omit to hide the Project row — the board has no tags/labels column. */
  project?: {
    options: BoardCellOption[];
    selected_ids: string[];
    onToggle: (option_id: string) => void;
    onCreateOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  };

  /**
   * Any other board columns, shown as generic properties the user can add to
   * or remove from — Assignee/Due date/Priority/Project above always stay
   * on since the caller keeps their backing columns auto-provisioned; this
   * is for anything beyond those four. Omit to hide the section entirely.
   */
  properties?: {
    columns: Array<{ id: string; label: string; kind: BoardColumnKind; options?: BoardCellOption[] }>;
    people: BoardCellPerson[];
    getValue: (column_id: string) => BoardCellValue;
    onCommit: (column_id: string, value: BoardCellValue) => void;
    onAddOption: (column_id: string, option: { label: string; color: string }) => Promise<BoardCellOption | null>;
    onEditOptions: (column_id: string) => BoardOptionActions;
    onAddProperty: (type: AddableColumnType) => void;
    onRemoveProperty: (column_id: string) => void;
  };

  /** Omit to hide the Subtasks section — the caller has no checklist state wired up. */
  checklist?: {
    items: BoardItemChecklistItemDto[];
    loading: boolean;
    onAdd: (label: string) => void;
    onToggle: (checklist_item_id: number) => void;
    onRename: (checklist_item_id: number, label: string) => void;
    onDelete: (checklist_item_id: number) => void;
  };
};

const toDateInputValue = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getPersonInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Task detail drawer for the Kanban board, built to be a literal reproduction
 * of `design/design_2/97 Workspace Menu.dc.html`'s drawer, plus a compact
 * two-tab bar ("All" / "Attachments") layered on top — not the richer
 * multi-tab `BoardItemDrawer` every other board view uses. Every field here
 * still round-trips through the exact same real persistence those other
 * views use (`useBoardItemDrawer`'s comments/attachments/description,
 * `handleUpdateCellValue` for Status/Priority/Due date/People/Project) —
 * only the presentation is Kanban-specific, which is why this lives beside
 * `BoardKanban` instead of replacing `BoardItemDrawer`.
 */
function KanbanItemDrawer<TRow>(props: KanbanItemDrawerProps<TRow>) {
  // Latches the whole props bundle (not just `drawer`) so the panel keeps
  // showing the card it was open for while `SlideOverPanel` slides it
  // closed — `title`/`people`/`due_date`/`priority`/`project` are all
  // derived by the caller from the (now-cleared) open row too.
  const {
    drawer,
    title,
    onRenameTitle,
    is_done,
    onToggleDone,
    created_by,
    people,
    due_date,
    priority,
    project,
    properties,
    checklist,
  } = useLatchWhileOpen(props, props.drawer.is_open);

  const [priority_picker_anchor_el, setPriorityPickerAnchorEl] = useState<HTMLElement | null>(null);
  const [add_property_anchor_el, setAddPropertyAnchorEl] = useState<HTMLElement | null>(null);
  const [property_pending_removal_id, setPropertyPendingRemovalId] = useState<string | null>(null);
  const [pending_delete_attachment, setPendingDeleteAttachment] = useState<DrawerAttachment | null>(null);

  if (!props.drawer.is_open && !drawer.is_open) return null;

  const done_border = is_done ? KANBAN_COLORS.success : KANBAN_COLORS.text_hairline;
  const done_bg = is_done ? KANBAN_COLORS.success : KANBAN_COLORS.card_bg;
  const is_attachments_tab = drawer.active_tab === "files";

  return (
    <SlideOverPanel
      is_open={props.drawer.is_open}
      onClose={props.drawer.close}
      overlay_class_name="bg-[rgba(10,23,23,0.32)]"
      panel_class_name="w-[460px] max-w-[94vw] bg-shell-panel shadow-[-8px_0_32px_rgba(10,23,23,0.14)]"
    >
      {/* Header */}
      <div
        className="flex flex-none items-center gap-2.5 px-[18px] py-4"
        style={{ borderBottom: `1px solid ${KANBAN_COLORS.border_subtle}` }}
      >
        <button
          type="button"
          onClick={onToggleDone}
          disabled={!onToggleDone}
          aria-label={is_done ? "Mark incomplete" : "Mark complete"}
          className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border-[1.8px] transition-colors"
          style={{ borderColor: done_border, background: done_bg }}
        >
          {is_done && <CheckIcon size={12} className="text-white" />}
        </button>
        <span className="text-[12.5px] font-semibold" style={{ color: is_done ? KANBAN_COLORS.success : KANBAN_COLORS.text_faint }}>
          {is_done ? "Completed" : "Mark complete"}
        </span>
        <span className="ml-auto flex flex-none items-center gap-1">
          <label
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] transition-colors hover:bg-shell-hover"
            style={{ color: KANBAN_COLORS.text_faint }}
            title="Attach a file"
          >
            <AttachmentIcon size={15} />
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) drawer.postAttachments(Array.from(event.target.files));
                event.target.value = "";
              }}
            />
          </label>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-[7px] transition-colors hover:bg-shell-hover"
            style={{ color: KANBAN_COLORS.text_faint }}
          >
            <MoreDotsIcon size={16} />
          </span>
          <button
            type="button"
            onClick={drawer.close}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-[7px] transition-colors hover:bg-shell-hover"
            style={{ color: KANBAN_COLORS.text_faint }}
          >
            <CloseIcon size={14} />
          </button>
        </span>
      </div>

      {/* Tabs */}
      <div
        className="flex flex-none items-center gap-1 px-[18px]"
        style={{ borderBottom: `1px solid ${KANBAN_COLORS.border_subtle}` }}
      >
        {(
          [
            { id: "updates" as const, label: "All" },
            { id: "files" as const, label: "Attachments", count: drawer.all_attachments.length },
          ]
        ).map((tab) => {
          const is_active = drawer.active_tab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => drawer.setActiveTab(tab.id)}
              className="relative flex items-center gap-1.5 px-2.5 py-2.5 text-[12.5px] font-semibold"
              style={{ color: is_active ? KANBAN_COLORS.text_strong : KANBAN_COLORS.text_faint }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className="rounded-[20px] px-[6px] py-px text-[10.5px] font-bold"
                  style={{ background: KANBAN_COLORS.chip_bg, color: KANBAN_COLORS.text_faint }}
                >
                  {tab.count}
                </span>
              )}
              {is_active && (
                <span
                  className="absolute bottom-[-1px] left-1.5 right-1.5 h-[2.5px] rounded-t-[3px]"
                  style={{ background: KANBAN_COLORS.text_strong }}
                />
              )}
            </button>
          );
        })}
      </div>

      {is_attachments_tab ? (
        <FilesPanel drawer={drawer} />
      ) : (
      /* Body */
      <div className="flex-1 overflow-y-auto" style={{ padding: "20px 22px 28px" }}>
        <input
          value={title}
          onChange={(event) => onRenameTitle(event.target.value)}
          placeholder="Task name"
          className="mb-3 w-full border-none py-0.5 text-[20px] font-extrabold outline-none"
          style={{ color: KANBAN_COLORS.text_strong, textDecoration: is_done ? "line-through" : "none" }}
        />

        {priority?.selected_id && (
          <div
            className="mb-[18px] h-[6px] rounded-full"
            style={{ background: priority.options.find((option) => option.id === priority.selected_id)?.color ?? KANBAN_COLORS.border_default }}
          />
        )}

        <div className="mb-[22px] flex flex-col gap-3.5">
          {created_by && (
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-[12.5px] font-semibold" style={{ color: KANBAN_COLORS.text_disabled }}>
                Created by
              </span>
              <div className="flex items-center gap-1.5">
                <PersonAvatar
                  person={{
                    id: created_by.id,
                    name: created_by.full_name,
                    initials: getPersonInitials(created_by.full_name),
                    avatar_seed: 0,
                    avatar_url: created_by.profile_photo_url ?? undefined,
                  }}
                  size={22}
                />
                <span className="text-[13.5px] font-semibold" style={{ color: KANBAN_COLORS.text_secondary }}>
                  {created_by.full_name}
                </span>
              </div>
            </div>
          )}

          {people && (
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-[12.5px] font-semibold" style={{ color: KANBAN_COLORS.text_disabled }}>
                Assignee
              </span>
              <div className="flex items-center gap-1.5">
                {people.selected.length > 0 ? (
                  <>
                    <PersonAvatar
                      person={{
                        id: String(people.selected[0].id),
                        name: people.selected[0].full_name,
                        initials: getPersonInitials(people.selected[0].full_name),
                        avatar_seed: 0,
                        avatar_url: people.selected[0].profile_photo_url ?? undefined,
                      }}
                      size={22}
                    />
                    <span className="text-[13.5px] font-semibold" style={{ color: KANBAN_COLORS.text_secondary }}>
                      {people.selected.length > 1
                        ? `${people.selected[0].full_name} +${people.selected.length - 1}`
                        : people.selected[0].full_name}
                    </span>
                  </>
                ) : (
                  <span className="text-[13.5px] font-semibold" style={{ color: KANBAN_COLORS.text_placeholder }}>
                    Unassigned
                  </span>
                )}
                <KanbanCardMembers people={people.roster} selected={people.selected} onToggle={people.onToggle} hide_stack />
              </div>
            </div>
          )}

          {due_date && (
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-[12.5px] font-semibold" style={{ color: KANBAN_COLORS.text_disabled }}>
                Due date
              </span>
              <input
                type="date"
                value={toDateInputValue(due_date.value)}
                onChange={(event) => due_date.onChange(event.target.value || null)}
                className="w-[150px] rounded-[7px] px-2.5 py-1.5 text-[13px] font-semibold outline-none"
                style={{ border: `1px solid ${KANBAN_COLORS.border_default}`, color: KANBAN_COLORS.text_secondary }}
              />
            </div>
          )}

          {priority && (
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-[12.5px] font-semibold" style={{ color: KANBAN_COLORS.text_disabled }}>
                Priority
              </span>
              <div className="flex flex-wrap gap-1.5">
                {priority.options.map((option) => {
                  const active = priority.selected_id === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => priority.onSelect(active ? null : option.id)}
                      className="rounded-[7px] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide transition-colors"
                      style={{
                        background: active ? `${option.color}1A` : KANBAN_COLORS.card_bg,
                        color: active ? option.color : KANBAN_COLORS.text_disabled,
                        border: `1.5px solid ${active ? option.color : KANBAN_COLORS.border_default}`,
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
                {priority.onCreateOption && (
                  <button
                    type="button"
                    onClick={(event) => setPriorityPickerAnchorEl(event.currentTarget)}
                    aria-label="Add priority"
                    title="Add priority"
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] transition-colors hover:bg-shell-hover"
                    style={{ color: KANBAN_COLORS.text_faint, border: `1.5px dashed ${KANBAN_COLORS.border_default}` }}
                  >
                    <PlusIcon size={11} />
                  </button>
                )}
                <BoardPopover
                  anchor_el={priority_picker_anchor_el}
                  is_open={priority_picker_anchor_el !== null}
                  onClose={() => setPriorityPickerAnchorEl(null)}
                  align="start"
                  width={240}
                >
                  <OptionPicker
                    options={priority.options}
                    selected_ids={priority.selected_id ? [priority.selected_id] : []}
                    multi={false}
                    onToggle={(option_id) => {
                      priority.onSelect(option_id);
                      setPriorityPickerAnchorEl(null);
                    }}
                    onClear={() => {
                      priority.onSelect(null);
                      setPriorityPickerAnchorEl(null);
                    }}
                    onCreateOption={priority.onCreateOption}
                    option_actions={priority.onEditOptions}
                  />
                </BoardPopover>
              </div>
            </div>
          )}

          {project && (
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-[12.5px] font-semibold" style={{ color: KANBAN_COLORS.text_disabled }}>
                Project
              </span>
              <KanbanCardLabels
                options={project.options}
                selected_ids={project.selected_ids}
                onToggle={project.onToggle}
                onCreateOption={project.onCreateOption}
              />
            </div>
          )}
        </div>

        {properties && (
          <div className="mb-5" style={{ borderTop: `1px solid ${KANBAN_COLORS.border_subtle}`, paddingTop: 16 }}>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[12.5px] font-bold" style={{ color: KANBAN_COLORS.text_disabled }}>
                Properties
              </span>
              {properties.columns.length > 0 && (
                <span className="text-[12px] font-semibold" style={{ color: KANBAN_COLORS.text_placeholder }}>
                  {properties.columns.length}
                </span>
              )}
            </div>

            {properties.columns.length > 0 && (
              <div className="mb-3 flex flex-col gap-1.5">
                {properties.columns.map((column) => {
                  const has_options = column.kind === "status" || column.kind === "tags" || column.kind === "dropdown" || column.kind === "label";
                  return (
                    <div
                      key={column.id}
                      className="group grid grid-cols-[1fr_minmax(0,1.3fr)_24px] items-center gap-2.5 rounded-[9px] px-2 py-1.5 transition-colors hover:bg-shell-hover"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <ColumnSwatchBadge swatch={COLUMN_KIND_SWATCH[column.kind]} size={19} />
                        <span
                          className="min-w-0 truncate text-[12.5px] font-semibold"
                          style={{ color: KANBAN_COLORS.text_disabled }}
                          title={column.label}
                        >
                          {column.label}
                        </span>
                      </div>
                      <BoardValueCell
                        column={{ id: column.id, kind: column.kind, options: column.options }}
                        value={properties.getValue(column.id)}
                        people={properties.people}
                        onCommit={(value) => properties.onCommit(column.id, value)}
                        onAddOption={has_options ? (option) => properties.onAddOption(column.id, option) : undefined}
                        onEditOptions={has_options ? properties.onEditOptions(column.id) : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setPropertyPendingRemovalId(column.id)}
                        aria-label={`Remove ${column.label} property`}
                        title="Remove property"
                        className="flex h-6 w-6 flex-none items-center justify-center rounded-full border opacity-0 transition-colors group-hover:opacity-100 hover:border-transparent hover:bg-[rgba(229,62,46,0.12)] hover:text-[#E53E2E]"
                        style={{ color: KANBAN_COLORS.text_faint, borderColor: KANBAN_COLORS.border_subtle }}
                      >
                        <CloseIcon size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={(event) => setAddPropertyAnchorEl(event.currentTarget)}
              className="flex w-full items-center gap-2 rounded-[9px] border border-dashed px-2.5 py-2 text-[12.5px] font-semibold transition-colors hover:border-solid hover:bg-shell-hover"
              style={{ color: KANBAN_COLORS.text_faint, borderColor: KANBAN_COLORS.border_default }}
            >
              <span
                className="flex h-5 w-5 flex-none items-center justify-center rounded-full"
                style={{ background: KANBAN_COLORS.chip_bg, color: KANBAN_COLORS.text_faint }}
              >
                <PlusIcon size={11} />
              </span>
              Add property
            </button>
            <AddColumnMenu
              anchor_el={add_property_anchor_el}
              is_open={add_property_anchor_el !== null}
              onClose={() => setAddPropertyAnchorEl(null)}
              onSelectType={(type: AddableColumnType) => {
                properties.onAddProperty(type);
                setAddPropertyAnchorEl(null);
              }}
            />
            <ConfirmActionModal
              is_open={property_pending_removal_id !== null}
              title="Remove this property?"
              description={`This deletes "${
                properties.columns.find((column) => column.id === property_pending_removal_id)?.label ?? ""
              }" and its values from every card on this board. This can't be undone.`}
              confirm_label="Remove"
              danger
              onConfirm={() => {
                if (property_pending_removal_id) properties.onRemoveProperty(property_pending_removal_id);
                setPropertyPendingRemovalId(null);
              }}
              onClose={() => setPropertyPendingRemovalId(null)}
            />
          </div>
        )}

        <div className="mb-5" style={{ borderTop: `1px solid ${KANBAN_COLORS.border_subtle}`, paddingTop: 16 }}>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[12.5px] font-bold" style={{ color: KANBAN_COLORS.text_disabled }}>
              Attachments
            </span>
            <span className="text-[12px] font-semibold" style={{ color: KANBAN_COLORS.text_placeholder }}>
              {drawer.all_attachments.length}
            </span>
          </div>

          {drawer.all_attachments.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {drawer.all_attachments.map((attachment) => (
                <CommentAttachmentChip
                  key={attachment.id}
                  attachment={attachment}
                  onDelete={attachment.can_delete ? setPendingDeleteAttachment : undefined}
                />
              ))}
            </div>
          )}

          <label
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-shell-hover"
            style={{ color: KANBAN_COLORS.text_faint, border: `1px solid ${KANBAN_COLORS.border_subtle}` }}
          >
            <AttachmentIcon size={13} />
            Attach a file
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) drawer.postAttachments(Array.from(event.target.files));
                event.target.value = "";
              }}
            />
          </label>

          <ConfirmActionModal
            is_open={pending_delete_attachment !== null}
            title="Delete file"
            description={
              <>
                Are you sure you want to delete &ldquo;{pending_delete_attachment?.file_name}&rdquo;? This can&rsquo;t be undone.
              </>
            }
            confirm_label="Delete file"
            danger
            onClose={() => setPendingDeleteAttachment(null)}
            onConfirm={() => {
              if (pending_delete_attachment) drawer.deleteAttachment(pending_delete_attachment.id);
              setPendingDeleteAttachment(null);
            }}
          />
        </div>

        {drawer.has_description && (
          <div className="mb-5" style={{ borderTop: `1px solid ${KANBAN_COLORS.border_subtle}`, paddingTop: 16 }}>
            <div className="mb-2 text-[12.5px] font-bold" style={{ color: KANBAN_COLORS.text_disabled }}>
              Description
            </div>
            <textarea
              value={drawer.description}
              onChange={(event) => drawer.onDescriptionChange(event.target.value)}
              placeholder="Add a more detailed description..."
              rows={3}
              className="w-full resize-y rounded-lg px-[11px] py-2.5 text-[13.5px] leading-relaxed outline-none"
              style={{ border: `1px solid ${KANBAN_COLORS.border_subtle}`, color: KANBAN_COLORS.text_secondary }}
            />
          </div>
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

        <div style={{ borderTop: `1px solid ${KANBAN_COLORS.border_subtle}`, paddingTop: 16 }}>
          <div className="mb-2.5 text-[12.5px] font-bold" style={{ color: KANBAN_COLORS.text_disabled }}>
            Comments
          </div>

          <div className="mb-3 flex flex-col gap-3">
            {drawer.comments.length === 0 && (
              <p className="text-[12.5px]" style={{ color: KANBAN_COLORS.text_placeholder }}>
                No comments yet.
              </p>
            )}
            {drawer.comments.map((comment) => (
              <div key={comment.id} className="flex gap-2.5">
                <PersonAvatar person={comment.author} size={24} />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between gap-1.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[12.5px] font-bold" style={{ color: KANBAN_COLORS.text_secondary }}>
                        {comment.author.name}
                      </span>
                      <span className="text-[11px]" style={{ color: KANBAN_COLORS.text_faded }}>
                        {comment.posted_at}
                      </span>
                      {comment.is_edited && (
                        <span className="text-[11px]" style={{ color: KANBAN_COLORS.text_faded }}>
                          (edited)
                        </span>
                      )}
                    </div>
                    {comment.author.id === drawer.current_user.id && (
                      <CommentOptionsMenu
                        onEdit={() => drawer.startEditingComment(comment.id)}
                        onDelete={() => drawer.deleteComment(comment.id)}
                        kind="comment"
                        icon_size={11}
                        class_name="flex h-5 w-5 flex-none items-center justify-center rounded-[6px] transition-colors hover:bg-shell-hover"
                        style={{ color: KANBAN_COLORS.text_faint }}
                      />
                    )}
                  </div>
                  {drawer.editing_key === comment.id ? (
                    <CommentEditForm
                      value={drawer.edit_draft}
                      onChange={drawer.onEditDraftChange}
                      onSave={drawer.saveEditedComment}
                      onCancel={drawer.cancelEditingComment}
                      autoFocus
                    />
                  ) : (
                    <div className="text-[13px] leading-snug" style={{ color: KANBAN_COLORS.text_muted }}>
                      {comment.body}
                    </div>
                  )}
                  {comment.attachments.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {comment.attachments.map((attachment) => (
                        <CommentAttachmentChip key={attachment.id} attachment={attachment} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {drawer.composer_attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {drawer.composer_attachments.map((attachment) => (
                <CommentAttachmentChip key={attachment.id} attachment={attachment} onRemove={drawer.removeComposerAttachment} />
              ))}
            </div>
          )}

          <div className="flex items-start gap-2.5">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: KANBAN_COLORS.gray }}>
              {drawer.current_user.initials}
            </span>
            <input
              value={drawer.composer_text}
              onChange={(event) => drawer.onComposerTextChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  drawer.postComment();
                }
              }}
              placeholder="Add a comment..."
              className="flex-1 rounded-lg px-[11px] py-2 text-[13px] outline-none"
              style={{ border: `1px solid ${KANBAN_COLORS.border_subtle}`, color: KANBAN_COLORS.text_secondary }}
            />
            <label
              className="flex h-[34px] w-[34px] flex-none cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-shell-hover"
              style={{ color: KANBAN_COLORS.text_faint, border: `1px solid ${KANBAN_COLORS.border_subtle}` }}
              title="Attach a file"
            >
              <AttachmentIcon size={14} />
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) drawer.addComposerAttachments(Array.from(event.target.files));
                  event.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => drawer.postComment()}
              disabled={!drawer.composer_text.trim() && drawer.composer_attachments.length === 0}
              aria-label="Post comment"
              title="Post comment"
              className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-lg text-white transition-opacity disabled:opacity-40"
              style={{ background: KANBAN_COLORS.red }}
            >
              <SendIcon size={14} />
            </button>
          </div>
        </div>
      </div>
      )}
    </SlideOverPanel>
  );
}

export default KanbanItemDrawer;
