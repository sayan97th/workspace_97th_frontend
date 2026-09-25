"use client";
import React, { useEffect, useState } from "react";
import BoardPopover from "../toolbar/BoardPopover";

/** Mirrors the API's `max:1000` rule on `board_views.description`. */
export const VIEW_DESCRIPTION_MAX_LENGTH = 1000;

export type ViewDescriptionPopoverProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  view_label: string;
  description: string | null;
  onClose: () => void;
  /** Called with the new text, or null when it was cleared. */
  onSave: (description: string | null) => void;
};

/** Small editor anchored under a tab for its "Edit description" menu item. Ctrl/Cmd + Enter saves. */
const ViewDescriptionPopover: React.FC<ViewDescriptionPopoverProps> = ({
  anchor_el,
  is_open,
  view_label,
  description,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState(description ?? "");

  useEffect(() => {
    if (is_open) setDraft(description ?? "");
  }, [is_open, description]);

  const save = () => {
    const trimmed = draft.trim();
    onSave(trimmed ? trimmed : null);
    onClose();
  };

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} align="start" width={320}>
      <form
        className="flex flex-col gap-2.5 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div>
          <p className="text-[13px] font-semibold text-shell-text">View description</p>
          <p className="truncate text-[11.5px] text-shell-text-faint">{view_label}</p>
        </div>
        <textarea
          autoFocus
          value={draft}
          maxLength={VIEW_DESCRIPTION_MAX_LENGTH}
          rows={4}
          placeholder="What is this view for?"
          aria-label="View description"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              save();
            }
          }}
          className="shell-scrollbar w-full resize-none rounded-[9px] border border-shell-border-strong bg-shell-bg px-2.5 py-2 text-[13px] leading-[1.45] text-shell-text outline-none placeholder:text-shell-text-faint focus:border-brand-500"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-shell-text-faint">
            {draft.length}/{VIEW_DESCRIPTION_MAX_LENGTH}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </BoardPopover>
  );
};

export default ViewDescriptionPopover;
