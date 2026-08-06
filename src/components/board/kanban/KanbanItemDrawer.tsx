"use client";
import React from "react";
import { AttachmentIcon, CheckIcon, CloseIcon } from "@/icons/board-icons";
import { MoreDotsIcon } from "@/icons/workspace-icons";
import type { BoardItemDrawerApi } from "../drawer/types";
import CommentAttachmentChip from "../drawer/CommentAttachmentChip";
import SlideOverPanel from "../drawer/SlideOverPanel";
import { useLatchWhileOpen } from "../drawer/useLatchWhileOpen";
import PersonAvatar from "../PersonAvatar";
import PersonAvatarStack, { type PersonAvatarStackPerson } from "../PersonAvatarStack";
import KanbanCardLabels from "./KanbanCardLabels";
import KanbanCardMembers from "./KanbanCardMembers";
import type { BoardCellOption } from "../cells/OptionPicker";
import { KANBAN_COLORS } from "./kanbanDesign";

export type KanbanItemDrawerProps<TRow> = {
  drawer: BoardItemDrawerApi<TRow>;
  title: string;
  onRenameTitle: (title: string) => void;

  is_done: boolean;
  /** Omit to hide the "mark complete" toggle entirely — the board has no checkbox column. */
  onToggleDone?: () => void;

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
  };

  /** Omit to hide the Project row — the board has no tags/labels column. */
  project?: {
    options: BoardCellOption[];
    selected_ids: string[];
    onToggle: (option_id: string) => void;
    onCreateOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  };
};

const toDateInputValue = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

/**
 * Task detail drawer for the Kanban board, built to be a literal reproduction
 * of `design/design_2/97 Workspace Menu.dc.html`'s drawer — a single flowing
 * panel (no tab bar), not the richer multi-tab `BoardItemDrawer` every other
 * board view uses. Every field here still round-trips through the exact same
 * real persistence those other views use (`useBoardItemDrawer`'s comments/
 * description, `handleUpdateCellValue` for Status/Priority/Due date/People/
 * Project) — only the presentation is Kanban-specific, which is why this
 * lives beside `BoardKanban` instead of replacing `BoardItemDrawer`.
 */
function KanbanItemDrawer<TRow>(props: KanbanItemDrawerProps<TRow>) {
  // Latches the whole props bundle (not just `drawer`) so the panel keeps
  // showing the card it was open for while `SlideOverPanel` slides it
  // closed — `title`/`people`/`due_date`/`priority`/`project` are all
  // derived by the caller from the (now-cleared) open row too.
  const { drawer, title, onRenameTitle, is_done, onToggleDone, people, due_date, priority, project } =
    useLatchWhileOpen(props, props.drawer.is_open);

  if (!props.drawer.is_open && !drawer.is_open) return null;

  const done_border = is_done ? KANBAN_COLORS.success : KANBAN_COLORS.text_hairline;
  const done_bg = is_done ? KANBAN_COLORS.success : "#FFFFFF";

  return (
    <SlideOverPanel
      is_open={props.drawer.is_open}
      onClose={props.drawer.close}
      overlay_class_name="bg-[rgba(10,23,23,0.32)]"
      panel_class_name="w-[440px] max-w-[94vw] bg-white shadow-[-8px_0_32px_rgba(10,23,23,0.14)]"
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
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] transition-colors hover:bg-[#F4F4F2]"
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
            className="flex h-7 w-7 items-center justify-center rounded-[7px] transition-colors hover:bg-[#F4F4F2]"
            style={{ color: KANBAN_COLORS.text_faint }}
          >
            <MoreDotsIcon size={16} />
          </span>
          <button
            type="button"
            onClick={drawer.close}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-[7px] transition-colors hover:bg-[#F4F4F2]"
            style={{ color: KANBAN_COLORS.text_faint }}
          >
            <CloseIcon size={14} />
          </button>
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "20px 22px 28px" }}>
        <input
          value={title}
          onChange={(event) => onRenameTitle(event.target.value)}
          placeholder="Task name"
          className="mb-[18px] w-full border-none py-0.5 text-[20px] font-extrabold outline-none"
          style={{ color: KANBAN_COLORS.text_strong, textDecoration: is_done ? "line-through" : "none" }}
        />

        <div className="mb-[22px] flex flex-col gap-3.5">
          {people && (
            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-[12.5px] font-semibold" style={{ color: KANBAN_COLORS.text_disabled }}>
                Assignee
              </span>
              <div className="group flex items-center gap-1.5">
                {people.selected.length > 0 ? (
                  <>
                    <PersonAvatarStack people={people.selected.slice(0, 1)} size={22} />
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
                <KanbanCardMembers people={people.roster} selected={people.selected} onToggle={people.onToggle} />
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
                      className="rounded-[6px] px-2.5 py-1 text-[11.5px] font-bold transition-colors"
                      style={{
                        background: active ? `${option.color}1A` : "#FFFFFF",
                        color: active ? option.color : KANBAN_COLORS.text_disabled,
                        border: `1.5px solid ${active ? option.color : KANBAN_COLORS.border_default}`,
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
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
                <CommentAttachmentChip key={attachment.id} attachment={attachment} />
              ))}
            </div>
          )}

          <label
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-[#F4F4F2]"
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
                  <div className="mb-0.5 flex items-baseline gap-1.5">
                    <span className="text-[12.5px] font-bold" style={{ color: KANBAN_COLORS.text_secondary }}>
                      {comment.author.name}
                    </span>
                    <span className="text-[11px]" style={{ color: KANBAN_COLORS.text_faded }}>
                      {comment.posted_at}
                    </span>
                  </div>
                  <div className="text-[13px] leading-snug" style={{ color: KANBAN_COLORS.text_muted }}>
                    {comment.body}
                  </div>
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
              className="flex h-[34px] w-[34px] flex-none cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[#F4F4F2]"
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
          </div>
        </div>
      </div>
    </SlideOverPanel>
  );
}

export default KanbanItemDrawer;
