"use client";
import React, { useRef, useState } from "react";
import { CheckIcon, FilterIcon, LinkIcon } from "@/icons/board-icons";
import BoardPopover from "../toolbar/BoardPopover";
import "./view-tabs.scss";

/** What a filter view shares with its source tab, in the order monday.com lists them. */
const SHARED_WITH_SOURCE = ["Items and subitems", "Groups", "Columns and values", "Updates and files"];

/** What a filter view keeps for itself. */
const SAVED_IN_VIEW = ["Filters and search", "Sort", "Hidden columns", "Group by", "Row height and colors"];

export type FilterViewSourceBadgeProps = {
  /** The filter view's own label. */
  view_label: string;
  /** The label of the tab whose items the view shows, normally "Main table". */
  source_label: string;
  /** Toolbar changes are written to the view on their own (edit access and the view is not locked). */
  is_auto_saving: boolean;
  /** The viewer sees their own remembered changes instead of the view as saved. */
  has_personal_changes: boolean;
  /** Drops the viewer's remembered changes. Omit to hide the action. */
  onResetToView?: () => void;
  /** Switches to the source tab. */
  onOpenSource: () => void;
};

/**
 * The toolbar pill shown on a filter view, a tab that shows another tab's
 * items (like a Google Sheets filter view or a monday.com board view). It
 * names the source tab, and its card explains what is shared with that tab
 * and what is saved only to this view, with a shortcut back to the source.
 */
const FilterViewSourceBadge: React.FC<FilterViewSourceBadgeProps> = ({
  view_label,
  source_label,
  is_auto_saving,
  has_personal_changes,
  onResetToView,
  onOpenSource,
}) => {
  const anchor_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);

  const handleReset = () => {
    setIsOpen(false);
    onResetToView?.();
  };

  const handleOpenSource = () => {
    setIsOpen(false);
    onOpenSource();
  };

  return (
    <>
      <button
        ref={anchor_ref}
        type="button"
        className="vt-source-pill"
        data-open={is_open}
        aria-haspopup="dialog"
        aria-expanded={is_open}
        onClick={() => setIsOpen((current) => !current)}
      >
        <FilterIcon size={14} />
        <span className="vt-source-pill-label">
          Filter view <span className="vt-source-pill-of">of {source_label}</span>
        </span>
        {has_personal_changes && <span className="vt-source-pill-dot" aria-label="Showing your own changes" />}
      </button>

      <BoardPopover anchor_el={anchor_ref.current} is_open={is_open} onClose={() => setIsOpen(false)} width={360} align="end" unstyled>
        <div role="dialog" aria-label={`About the ${view_label} view`} className="vt-source-card">
          <div className="vt-source-card-header">
            <span className="vt-source-card-tile" aria-hidden>
              <FilterIcon size={18} />
            </span>
            <div className="min-w-0">
              <p className="vt-source-card-title">{view_label}</p>
              <p className="vt-source-card-subtitle">
                Filter view of <strong>{source_label}</strong>
              </p>
            </div>
          </div>

          <p className="vt-source-card-intro">
            This view shows every item of {source_label}. Edits to items sync both ways, while the way you filter and arrange
            them stays in this view.
          </p>

          <div className="vt-source-card-columns">
            <section>
              <h3 className="vt-source-card-heading">Shared with {source_label}</h3>
              <ul className="vt-source-card-list">
                {SHARED_WITH_SOURCE.map((label) => (
                  <li key={label} data-kind="shared">
                    <LinkIcon size={13} />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="vt-source-card-heading">Only in this view</h3>
              <ul className="vt-source-card-list">
                {SAVED_IN_VIEW.map((label) => (
                  <li key={label} data-kind="own">
                    <CheckIcon size={12} />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {has_personal_changes && (
            <div className="vt-source-card-notice">
              <span className="vt-source-pill-dot" aria-hidden />
              <span className="flex-1">You are seeing your own changes. Others still see this view as saved.</span>
              {onResetToView && (
                <button type="button" className="vt-button" data-variant="tertiary" onClick={handleReset}>
                  Reset
                </button>
              )}
            </div>
          )}

          <div className="vt-source-card-footer">
            <span className="vt-source-card-footnote">
              {is_auto_saving ? "Changes save to this view automatically" : "Changes here are only remembered for you"}
            </span>
            <button type="button" className="vt-button" data-variant="tertiary" onClick={handleOpenSource}>
              Open {source_label}
            </button>
          </div>
        </div>
      </BoardPopover>
    </>
  );
};

export default FilterViewSourceBadge;
