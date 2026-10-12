"use client";

interface PeopleSelectionFooterProps {
  has_changes: boolean;
  onCancel: () => void;
  onSave: () => void;
  /**
   * "default" is the compact Tailwind row the Kanban pickers use. "monday" uses the
   * `people-picker__*` rules from `table/menus/people-picker.css`, for the table's People picker.
   */
  variant?: "default" | "monday";
}

const FOOTER_CLASSES = {
  default: {
    row: "flex items-center gap-2",
    hint: "min-w-0 flex-1 truncate text-[11.5px] text-boardtree-text-faint",
    cancel: "h-7 rounded-[6px] px-2.5 text-[12.5px] text-boardtree-text-muted hover:bg-boardtree-hover hover:text-boardtree-text",
    save: "h-7 rounded-[6px] bg-boardtree-accent px-3.5 text-[12.5px] font-medium text-white hover:bg-boardtree-accent-hover disabled:cursor-not-allowed disabled:opacity-40",
  },
  monday: {
    row: "people-picker__footer",
    hint: "people-picker__hint",
    cancel: "people-picker__button people-picker__button--secondary",
    save: "people-picker__button people-picker__button--primary",
  },
} as const;

/**
 * Cancel / Save row shared by every people picker. Picking people only edits a local draft
 * (see `usePeopleSelectionDraft`), "Save" is the single place a new assignment is committed,
 * and closing the picker any other way (Cancel, Escape, clicking outside) drops the draft.
 */
export default function PeopleSelectionFooter({ has_changes, onCancel, onSave, variant = "default" }: PeopleSelectionFooterProps) {
  const classes = FOOTER_CLASSES[variant];

  return (
    <div className={classes.row}>
      <span className={classes.hint} aria-live="polite">
        {has_changes ? "Unsaved changes" : ""}
      </span>
      <button type="button" onClick={onCancel} className={classes.cancel}>
        Cancel
      </button>
      <button type="button" onClick={onSave} disabled={!has_changes} className={classes.save}>
        Save
      </button>
    </div>
  );
}
