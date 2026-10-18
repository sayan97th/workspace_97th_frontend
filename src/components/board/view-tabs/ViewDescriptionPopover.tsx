"use client";
import React, { useEffect, useState } from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import BoardPopover from "../toolbar/BoardPopover";

/** Mirrors the API's `max:1000` rule on `board_views.description`. */
export const VIEW_DESCRIPTION_MAX_LENGTH = 1000;
/** The counter turns amber once this close to the limit. */
export const VIEW_DESCRIPTION_WARNING_GAP = 100;

export type ViewDescriptionPopoverProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  view_label: string;
  description: string | null;
  onClose: () => void;
  /** Called with the new text, or null when it was cleared. */
  onSave: (description: string | null) => void;
};

/** "12/1000", amber when the text is close to the limit. */
export const DescriptionCounter: React.FC<{ length: number }> = ({ length }) => (
  <span className="vt-form-hint" data-near-limit={length >= VIEW_DESCRIPTION_MAX_LENGTH - VIEW_DESCRIPTION_WARNING_GAP}>
    {length}/{VIEW_DESCRIPTION_MAX_LENGTH}
  </span>
);

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
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} align="start" width={360} unstyled>
      <form
        className="vt-popover"
        aria-label="View description"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="vt-popover-header">
          <p className="vt-popover-title">{description ? "Edit description" : "Add description"}</p>
          <p className="vt-popover-subtitle">{view_label}</p>
        </div>
        <div className="vt-description-form">
          <textarea
            autoFocus
            value={draft}
            maxLength={VIEW_DESCRIPTION_MAX_LENGTH}
            rows={4}
            placeholder="What is this view for? Who should use it?"
            aria-label="View description"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                save();
              }
            }}
            className="vt-textarea shell-scrollbar"
          />
          <div className="vt-form-footer">
            <DescriptionCounter length={draft.length} />
            <div className="vt-form-actions">
              <button type="button" onClick={onClose} className="vt-button" data-variant="tertiary">
                Cancel
              </button>
              <PortalTooltip content="Save, or press Ctrl + Enter">
                <button type="submit" className="vt-button" data-variant="primary">
                  Save
                </button>
              </PortalTooltip>
            </div>
          </div>
        </div>
      </form>
    </BoardPopover>
  );
};

export default ViewDescriptionPopover;
