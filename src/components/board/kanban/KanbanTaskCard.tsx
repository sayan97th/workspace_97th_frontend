"use client";
import React, { useRef, useState } from "react";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import { AttachmentIcon, CalendarViewIcon, CheckIcon, ChecklistIcon, RowChatIcon } from "@/icons/board-icons";
import { ListTree } from "lucide-react";
import { MoreDotsIcon } from "@/icons/workspace-icons";
import InlineTitleEditor from "../InlineTitleEditor";

export type KanbanDueDateTone = "overdue" | "soon" | "default";

export type KanbanTaskPill = {
  key: string;
  label: string;
  color: string;
  /** Solid fill instead of the soft tint, used for the priority pill so it reads first. */
  solid?: boolean;
};

export type KanbanTaskCardProps = {
  title: string;
  is_done: boolean;
  /** Omit to hide the round "Mark complete" check (no checkbox column on the board). */
  onToggleDone?: () => void;
  is_editing_title: boolean;
  onStartEditTitle?: () => void;
  onCommitTitle: (title: string) => void;
  onCancelEditTitle: () => void;
  description?: string | null;
  pills?: KanbanTaskPill[];
  /** Interactive label editor (the board's tags column), rendered after the pills. */
  labels_slot?: React.ReactNode;
  checklist?: { done: number; total: number } | null;
  due_date?: { label: string; tone: KanbanDueDateTone } | null;
  /** Interactive assignee stack (the board's people column), rendered first in the footer. */
  members_slot?: React.ReactNode;
  subitem_count?: number;
  comment_count?: number;
  attachment_count?: number;
  /** The card's "..." menu. Omit or pass no rows to hide the button. */
  menu_sections?: ActionMenuSection[];
};

/**
 * Keeps clicks, pointer presses and key presses inside an interactive card
 * control (menus, pickers, the rename input) from reaching the card itself:
 * no accidental "open details" click and no drag starting from inside a
 * picker. React events bubble through portals, so popovers need this too.
 */
const stop_card_events = {
  onClick: (event: React.SyntheticEvent) => event.stopPropagation(),
  onPointerDown: (event: React.SyntheticEvent) => event.stopPropagation(),
  onKeyDown: (event: React.SyntheticEvent) => event.stopPropagation(),
};

/**
 * One Kanban card's content, laid out the Asana way: a round completion check
 * next to the title, a short description, soft colored pills (priority first,
 * then project labels), a subtask progress bar, and a footer with the
 * assignees, the due date and the activity counters. The card shell (border,
 * hover lift, drag ghost) belongs to `BoardKanban`, this only owns the inside.
 */
const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({
  title,
  is_done,
  onToggleDone,
  is_editing_title,
  onStartEditTitle,
  onCommitTitle,
  onCancelEditTitle,
  description,
  pills = [],
  labels_slot,
  checklist,
  due_date,
  members_slot,
  subitem_count = 0,
  comment_count = 0,
  attachment_count = 0,
  menu_sections = [],
}) => {
  const [menu_anchor_el, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const menu_button_ref = useRef<HTMLButtonElement>(null);
  const has_menu = menu_sections.some((section) => section.items.length > 0);
  const has_checklist = Boolean(checklist && checklist.total > 0);
  const checklist_pct = checklist && checklist.total > 0 ? Math.round((100 * checklist.done) / checklist.total) : 0;
  const has_counters = subitem_count > 0 || comment_count > 0 || attachment_count > 0 || has_checklist;
  const has_footer = Boolean(members_slot || due_date || has_counters);

  return (
    <div className="kanban-task__body">
      <div className="kanban-task__head">
        {onToggleDone && (
          <button
            type="button"
            {...stop_card_events}
            onClick={(event) => {
              event.stopPropagation();
              onToggleDone();
            }}
            data-done={is_done || undefined}
            className="kanban-check"
            aria-pressed={is_done}
            aria-label={is_done ? "Mark incomplete" : "Mark complete"}
            title={is_done ? "Mark incomplete" : "Mark complete"}
          >
            <CheckIcon size={10} />
          </button>
        )}

        {is_editing_title ? (
          <div className="min-w-0 flex-1" {...stop_card_events}>
            <InlineTitleEditor
              value={title}
              onCommit={onCommitTitle}
              onCancel={onCancelEditTitle}
              className="w-full min-w-0 bg-transparent text-[14px] font-medium leading-5 text-[color:var(--kanban-text)] outline-none"
              aria_label="Rename task"
            />
          </div>
        ) : (
          <span
            className="kanban-task__title"
            data-done={is_done || undefined}
            onDoubleClick={
              onStartEditTitle
                ? (event) => {
                    event.stopPropagation();
                    onStartEditTitle();
                  }
                : undefined
            }
            title={onStartEditTitle ? "Double click to rename" : undefined}
          >
            {title}
          </span>
        )}

        {has_menu && (
          <span {...stop_card_events}>
            <button
              ref={menu_button_ref}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMenuAnchorEl((current) => (current ? null : event.currentTarget));
              }}
              className="kanban-icon-button kanban-task__menu"
              aria-label="Task options"
              aria-haspopup="menu"
              aria-expanded={menu_anchor_el !== null}
            >
              <MoreDotsIcon size={15} />
            </button>
            <ActionMenu
              anchor_el={menu_anchor_el}
              is_open={menu_anchor_el !== null}
              onClose={() => {
                setMenuAnchorEl(null);
                menu_button_ref.current?.focus({ preventScroll: true });
              }}
              sections={menu_sections}
              aria_label="Task options"
              width={232}
              align="end"
            />
          </span>
        )}
      </div>

      {description && <p className="kanban-task__description">{description}</p>}

      {(pills.length > 0 || labels_slot) && (
        <div className="kanban-task__pills">
          {pills.map((pill) => (
            <span
              key={pill.key}
              className="kanban-pill"
              data-solid={pill.solid || undefined}
              style={{ "--kanban-pill-color": pill.color } as React.CSSProperties}
              title={pill.label}
            >
              {pill.label}
            </span>
          ))}
          {labels_slot && (
            <span className="inline-flex min-w-0" {...stop_card_events}>
              {labels_slot}
            </span>
          )}
        </div>
      )}

      {has_checklist && checklist && (
        <div className="kanban-task__progress" title={`${checklist.done} of ${checklist.total} subtasks done`}>
          <div className="kanban-task__progress-track">
            <div className="kanban-task__progress-fill" style={{ width: `${checklist_pct}%` }} />
          </div>
        </div>
      )}

      {has_footer && (
        <div className="kanban-task__footer">
          {members_slot && (
            <span className="inline-flex flex-none" {...stop_card_events}>
              {members_slot}
            </span>
          )}
          {due_date && (
            <span className="kanban-task__due" data-tone={is_done ? "default" : due_date.tone}>
              <CalendarViewIcon size={13} />
              {due_date.label}
            </span>
          )}
          {has_counters && (
            <span className="kanban-task__meta">
              {has_checklist && checklist && (
                <span
                  className="kanban-task__meta-item"
                  data-complete={checklist.done === checklist.total || undefined}
                  title="Subtasks done"
                >
                  <ChecklistIcon size={13} />
                  {checklist.done}/{checklist.total}
                </span>
              )}
              {subitem_count > 0 && (
                <span className="kanban-task__meta-item" title="Subitems">
                  <ListTree size={13} strokeWidth={1.8} />
                  {subitem_count}
                </span>
              )}
              {comment_count > 0 && (
                <span className="kanban-task__meta-item" title="Comments">
                  <RowChatIcon size={13} />
                  {comment_count}
                </span>
              )}
              {attachment_count > 0 && (
                <span className="kanban-task__meta-item" title="Attachments">
                  <AttachmentIcon size={13} />
                  {attachment_count}
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default KanbanTaskCard;
