"use client";

interface PeopleSelectionFooterProps {
  has_changes: boolean;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * Cancel / Save row shared by every people picker. Picking people only edits a local draft
 * (see `usePeopleSelectionDraft`), "Save" is the single place a new assignment is committed,
 * and closing the picker any other way (Cancel, Escape, clicking outside) drops the draft.
 */
export default function PeopleSelectionFooter({ has_changes, onCancel, onSave }: PeopleSelectionFooterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-[11.5px] text-boardtree-text-faint" aria-live="polite">
        {has_changes ? "Unsaved changes" : ""}
      </span>
      <button
        type="button"
        onClick={onCancel}
        className="h-7 rounded-[6px] px-2.5 text-[12.5px] text-boardtree-text-muted hover:bg-boardtree-hover hover:text-boardtree-text"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={!has_changes}
        className="h-7 rounded-[6px] bg-boardtree-accent px-3.5 text-[12.5px] font-medium text-white hover:bg-boardtree-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        Save
      </button>
    </div>
  );
}
