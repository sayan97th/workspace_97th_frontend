"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { boardTreeFontClassName } from "@/components/board/board-tree-font";
import { fmtDateShort } from "@/components/board/table/dateUtils";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import UserAvatar from "@/components/common/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { BoardGridIcon, CheckIcon, ChevronDownIcon, CloseIcon } from "@/icons/workspace-icons";
import { getApiErrorMessage } from "@/lib/api-error";
import { personalService } from "@/services/personal.service";
import type { CreateMyWorkItemPayload, MyWorkBoardDto, MyWorkBoardFormDto, MyWorkFormStatusColumn, MyWorkStatus } from "@/types/personal";
import { EMPTY_LABEL_COLOR } from "./myWorkBuckets";

export type MyWorkNewItemTarget = {
  /** Due date the item gets: the section's date, or the calendar day "+ Add" was clicked on. */
  date: string | null;
  /** Board to preselect, the section's own board in Board view. */
  board_id: number | null;
};

type MyWorkNewItemDialogProps = {
  target: MyWorkNewItemTarget | null;
  /** Board the user created their last item on, preselected when the target has none. */
  last_board_id: number | null;
  onClose: () => void;
  onCreate: (payload: CreateMyWorkItemPayload) => Promise<boolean>;
};

const DEFAULT_ITEM_NAME = "New Item";

/** Boards only change when the user creates or joins one, so one load per page visit is enough. */
let boards_cache: MyWorkBoardDto[] | null = null;
const forms_cache = new Map<number, MyWorkBoardFormDto>();

type PickerKey = "group" | "status" | "priority";

/**
 * monday.com's "New Item" dialog for My Work: an editable title, the board
 * and group the item goes on, and the board's own Assignee, Status,
 * Priority and date columns. The API assigns the item to the user, so it
 * shows up on My Work right after it is created.
 */
const MyWorkNewItemDialog: React.FC<MyWorkNewItemDialogProps> = ({ target, last_board_id, onClose, onCreate }) => {
  const { user } = useAuth();
  const [boards, setBoards] = useState<MyWorkBoardDto[] | null>(boards_cache);
  const [boards_error, setBoardsError] = useState<string | null>(null);
  const [name, setName] = useState(DEFAULT_ITEM_NAME);
  const [board_id, setBoardId] = useState<number | null>(null);
  const [form, setForm] = useState<MyWorkBoardFormDto | null>(null);
  const [form_error, setFormError] = useState<string | null>(null);
  const [group_id, setGroupId] = useState<number | null>(null);
  const [status_id, setStatusId] = useState<string | null>(null);
  const [priority_id, setPriorityId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [open_picker, setOpenPicker] = useState<PickerKey | null>(null);
  const [is_saving, setIsSaving] = useState(false);
  const picker_anchors = useRef<Partial<Record<PickerKey, HTMLButtonElement | null>>>({});
  const date_input_ref = useRef<HTMLInputElement>(null);
  const title_ref = useRef<HTMLInputElement>(null);
  const is_open = target !== null;

  useEffect(() => {
    if (!is_open || boards_cache) return;
    let is_current = true;
    personalService
      .getMyWorkBoards()
      .then((result) => {
        boards_cache = result;
        if (is_current) setBoards(result);
      })
      .catch((error) => {
        if (is_current) setBoardsError(getApiErrorMessage(error, "We couldn't load your boards."));
      });
    return () => {
      is_current = false;
    };
  }, [is_open]);

  // A fresh form each time the dialog opens, with the title selected so typing replaces it.
  useEffect(() => {
    if (!target) return;
    setName(DEFAULT_ITEM_NAME);
    setBoardId(null);
    setDate(target.date);
    setOpenPicker(null);
    requestAnimationFrame(() => title_ref.current?.select());
  }, [target]);

  const selected_board_id = useMemo(() => {
    const candidates = [board_id, target?.board_id ?? null, last_board_id];
    return candidates.find((id) => id !== null && boards?.some((board) => board.id === id)) ?? boards?.[0]?.id ?? null;
  }, [board_id, target, last_board_id, boards]);

  // The picks belong to one board, so they start over whenever the board changes.
  useEffect(() => {
    setGroupId(null);
    setStatusId(null);
    setPriorityId(null);
    setFormError(null);
    if (!is_open || selected_board_id === null) {
      setForm(null);
      return;
    }

    const cached = forms_cache.get(selected_board_id);
    setForm(cached ?? null);
    if (cached) return;

    let is_current = true;
    personalService
      .getMyWorkBoardForm(selected_board_id)
      .then((result) => {
        forms_cache.set(selected_board_id, result);
        if (is_current) setForm(result);
      })
      .catch((error) => {
        if (is_current) setFormError(getApiErrorMessage(error, "We couldn't load this board's columns."));
      });
    return () => {
      is_current = false;
    };
  }, [is_open, selected_board_id]);

  useEffect(() => {
    if (!is_open) return;
    // Window level, so an open picker (which stops Escape at the document) closes first.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  const boards_by_workspace = useMemo(() => {
    const grouped = new Map<string, MyWorkBoardDto[]>();
    for (const board of boards ?? []) {
      const workspace_name = board.workspace?.name ?? "Other boards";
      grouped.set(workspace_name, [...(grouped.get(workspace_name) ?? []), board]);
    }
    return [...grouped.entries()];
  }, [boards]);

  if (!target) return null;

  const group = form?.groups.find((candidate) => candidate.id === group_id) ?? form?.groups[0] ?? null;
  const optionOf = (column: MyWorkFormStatusColumn | null, option_id: string | null) => column?.options.find((option) => option.id === option_id) ?? null;
  const status = optionOf(form?.status_column ?? null, status_id);
  const priority = optionOf(form?.priority_column ?? null, priority_id);
  const can_submit = name.trim() !== "" && selected_board_id !== null && form !== null && group !== null && !is_saving;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!can_submit || selected_board_id === null) return;

    setIsSaving(true);
    const is_created = await onCreate({
      board_id: selected_board_id,
      name: name.trim(),
      date: form?.date_column ? date : null,
      group_id: group?.id ?? null,
      status: status?.id ?? null,
      priority: priority?.id ?? null,
    });
    setIsSaving(false);
    if (is_created) onClose();
  };

  const pickerAnchor = (key: PickerKey) => (element: HTMLButtonElement | null) => {
    picker_anchors.current[key] = element;
  };

  const togglePicker = (key: PickerKey) => setOpenPicker((current) => (current === key ? null : key));

  const openDatePicker = () => {
    const input = date_input_ref.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  const status_pickers: { key: "status" | "priority"; column: MyWorkFormStatusColumn | null; value: MyWorkStatus | null; onPick: (id: string | null) => void }[] = [
    { key: "priority", column: form?.priority_column ?? null, value: priority, onPick: setPriorityId },
    { key: "status", column: form?.status_column ?? null, value: status, onPick: setStatusId },
  ];

  return createPortal(
    <div className={`my-work-theme my-work-dialog-overlay ${boardTreeFontClassName}`}>
      <div className="my-work-dialog-backdrop" onClick={onClose} aria-hidden="true" />

      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="my-work-new-item-title" className="my-work-dialog">
        <button type="button" onClick={onClose} aria-label="Close" className="my-work-icon-button absolute top-4 right-4">
          <CloseIcon size={16} />
        </button>

        <div className="my-work-scroll min-h-0 flex-1 overflow-y-auto px-6 pt-11 pb-6 sm:px-[60px]">
          <label htmlFor="my-work-new-item-title" className="sr-only">
            Item name
          </label>
          <input
            id="my-work-new-item-title"
            ref={title_ref}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
            placeholder={DEFAULT_ITEM_NAME}
            className="my-work-dialog-title"
          />

          <div className="mt-9 flex flex-col gap-3">
            <FieldRow icon={<BoardGridIcon size={16} />} label="Board">
              {boards_error ? (
                <FieldNote is_error>{boards_error}</FieldNote>
              ) : boards === null ? (
                <div className="my-work-dialog-skeleton" />
              ) : boards.length === 0 ? (
                <FieldNote>You can&apos;t add items to any board yet.</FieldNote>
              ) : (
                <span className="relative block">
                  <select
                    value={selected_board_id ?? ""}
                    onChange={(event) => setBoardId(Number(event.target.value))}
                    aria-label="Board"
                    className="my-work-dialog-select text-board-cell"
                  >
                    {boards_by_workspace.map(([workspace_name, workspace_boards]) => (
                      <optgroup key={workspace_name} label={workspace_name}>
                        {workspace_boards.map((board) => (
                          <option key={board.id} value={board.id}>
                            {board.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDownIcon size={12} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2" />
                </span>
              )}
            </FieldRow>

            {form_error && <FieldNote is_error>{form_error}</FieldNote>}

            {!form && !form_error && boards !== null && boards.length > 0 && (
              <>
                {[0, 1, 2].map((index) => (
                  <div key={index} className="my-work-dialog-row">
                    <div className="my-work-dialog-skeleton w-24" />
                    <div className="my-work-dialog-skeleton" />
                  </div>
                ))}
              </>
            )}

            {form && (
              <>
                <FieldRow icon={<FieldGlyph kind="group" />} label="Group">
                  {group ? (
                    <button
                      ref={pickerAnchor("group")}
                      type="button"
                      onClick={() => togglePicker("group")}
                      aria-haspopup="listbox"
                      aria-expanded={open_picker === "group"}
                      className="my-work-dialog-field my-work-dialog-field--start text-board-cell"
                    >
                      <span className="h-2 w-2 flex-none rounded-full" style={{ background: group.color }} aria-hidden="true" />
                      <span className="truncate">{group.name}</span>
                    </button>
                  ) : (
                    <FieldNote is_error>This board has no group to add the item to.</FieldNote>
                  )}
                </FieldRow>

                <FieldRow icon={<FieldGlyph kind="people" />} label={form.people_column?.label ?? "Assignee"}>
                  {form.people_column ? (
                    <div className="my-work-dialog-field" title="You'll be assigned to this item">
                      <UserAvatar user={user ? { full_name: user.full_name, profile_photo_url: user.profile_photo_url } : null} size={26} />
                    </div>
                  ) : (
                    <FieldNote>This board has no People column, so the item won&apos;t show up on My Work.</FieldNote>
                  )}
                </FieldRow>

                {status_pickers.map(
                  (picker) =>
                    picker.column && (
                      <FieldRow key={picker.key} icon={<FieldGlyph kind="status" />} label={picker.column.label}>
                        <button
                          ref={pickerAnchor(picker.key)}
                          type="button"
                          onClick={() => togglePicker(picker.key)}
                          aria-haspopup="listbox"
                          aria-expanded={open_picker === picker.key}
                          aria-label={`${picker.column.label}, ${picker.value?.label ?? "not set"}`}
                          className="my-work-dialog-field my-work-dialog-status text-board-cell"
                          style={{ background: picker.value?.color ?? EMPTY_LABEL_COLOR }}
                        >
                          {picker.value?.label}
                        </button>
                      </FieldRow>
                    )
                )}

                {form.date_column && (
                  <FieldRow icon={<FieldGlyph kind="date" />} label={form.date_column.label}>
                    <div className="my-work-dialog-field relative">
                      <button
                        type="button"
                        onClick={openDatePicker}
                        aria-label={`${form.date_column.label}, ${date ? fmtDateShort(date) : "not set"}`}
                        data-empty={!date}
                        className={`text-board-caption ${form.date_column.type === "timeline" ? "my-work-dialog-timeline" : "my-work-dialog-date"}`}
                      >
                        {date ? fmtDateShort(date) : "-"}
                      </button>
                      {date && (
                        <button type="button" onClick={() => setDate(null)} aria-label="Clear date" className="my-work-icon-button absolute right-1 h-6 w-6">
                          <CloseIcon size={10} />
                        </button>
                      )}
                      <input
                        ref={date_input_ref}
                        type="date"
                        tabIndex={-1}
                        aria-hidden="true"
                        value={date ?? ""}
                        onChange={(event) => setDate(event.target.value || null)}
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-0 opacity-0"
                      />
                    </div>
                  </FieldRow>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-none justify-end gap-2 border-t border-[var(--mw-border-soft)] px-4 py-4">
          <button type="button" onClick={onClose} className="my-work-ghost-button h-10 px-4 text-board-nav">
            Cancel
          </button>
          <button type="submit" disabled={!can_submit} className="my-work-primary-button h-10 px-4 text-board-nav">
            {is_saving ? "Creating..." : "Create Item"}
          </button>
        </div>
      </form>

      {form && group && (
        <BoardPopover anchor_el={picker_anchors.current.group ?? null} is_open={open_picker === "group"} onClose={() => setOpenPicker(null)} width={300} align="start">
          <ul role="listbox" aria-label="Group" className="my-work-theme flex max-h-72 flex-col overflow-y-auto rounded-lg p-1.5 text-board-cell">
            {form.groups.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === group.id}
                  onClick={() => {
                    setGroupId(option.id);
                    setOpenPicker(null);
                  }}
                  className="flex h-8 w-full items-center gap-2 rounded px-2 text-left hover:bg-[var(--mw-hover)]"
                >
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: option.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{option.name}</span>
                  {option.id === group.id && <CheckIcon size={14} className="text-[var(--mw-accent)]" />}
                </button>
              </li>
            ))}
          </ul>
        </BoardPopover>
      )}

      {status_pickers.map(
        (picker) =>
          picker.column && (
            <BoardPopover
              key={picker.key}
              anchor_el={picker_anchors.current[picker.key] ?? null}
              is_open={open_picker === picker.key}
              onClose={() => setOpenPicker(null)}
              width={220}
            >
              <ul role="listbox" aria-label={picker.column.label} className="my-work-theme flex max-h-80 flex-col gap-1.5 overflow-y-auto rounded-lg p-3 text-board-cell">
                {picker.column.options.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={picker.value?.id === option.id}
                      onClick={() => {
                        picker.onPick(option.id);
                        setOpenPicker(null);
                      }}
                      className="my-work-dialog-option"
                      style={{ background: option.color }}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={picker.value === null}
                    onClick={() => {
                      picker.onPick(null);
                      setOpenPicker(null);
                    }}
                    className="my-work-dialog-option"
                    style={{ background: EMPTY_LABEL_COLOR }}
                  >
                    Not set
                  </button>
                </li>
              </ul>
            </BoardPopover>
          )
      )}
    </div>,
    document.body
  );
};

const FieldRow: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div className="my-work-dialog-row">
    <span className="flex min-w-0 items-center gap-2 text-board-nav">
      <span className="flex h-5 w-5 flex-none items-center justify-center">{icon}</span>
      <span className="truncate" title={label}>
        {label}
      </span>
    </span>
    <div className="min-w-0">{children}</div>
  </div>
);

const FieldNote: React.FC<{ is_error?: boolean; children: React.ReactNode }> = ({ is_error = false, children }) => (
  <p className={`text-board-caption ${is_error ? "text-[#d83a52]" : "text-[var(--mw-text-secondary)]"}`}>{children}</p>
);

const GLYPH_COLORS: Record<"group" | "people" | "status" | "date", string> = {
  group: "#fdab3d",
  people: "#66ccff",
  status: "#00c875",
  date: "#a25ddc",
};

/** monday.com's column type badges: a small colored square with a white glyph. */
const FieldGlyph: React.FC<{ kind: keyof typeof GLYPH_COLORS }> = ({ kind }) => (
  <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true">
    <rect width={20} height={20} rx={4} fill={GLYPH_COLORS[kind]} />
    {kind === "group" && <circle cx={10} cy={10} r={4} fill="#ffffff" />}
    {kind === "people" && (
      <>
        <circle cx={10} cy={7.6} r={2.6} fill="#ffffff" />
        <path d="M5 15.2c.5-2.6 2.6-4 5-4s4.5 1.4 5 4" fill="#ffffff" />
      </>
    )}
    {(kind === "status" || kind === "date") && (
      <path d="M6 6.5h8M6 10h8M6 13.5h5" stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" />
    )}
  </svg>
);

export default MyWorkNewItemDialog;
