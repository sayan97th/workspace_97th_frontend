"use client";

import { useState } from "react";
import ToggleSwitch from "../../toolbar/ToggleSwitch";
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH, TEXT_FAMILY_KINDS } from "../constants";
import type { ColumnKind, ColumnValidation, ProgressColumnWeight, RatingIcon } from "../types";
import { evenWeights, type ProgressStatusColumn } from "../progressTracking";
import { RATING_ICON_LABELS, RATING_MAX_LIMIT, RatingGlyph } from "../cells/VoteRatingCells";
import { NUMBER_AGGREGATION_LABELS, type NumberAggregation } from "../summaryUtils";

/*
 * The small forms the column menu's Settings flyout opens to the side. Each one
 * renders only its content: `ColumnMenu`'s flyout wrapper adds the card, the
 * side placement and the `column-menu.css` look.
 */

interface ColumnSettingsPanelProps {
  width: number;
  hideable: boolean;
  pinnable: boolean;
  kind: ColumnKind;
  /** Number kind only: which aggregation the group summary footer shows for this column, see `summaryUtils.ts`. Undefined behaves as `"sum"`. */
  aggregation?: NumberAggregation;
  onWidthChange: (width: number) => void;
  onHideableChange: (value: boolean) => void;
  onPinnableChange: (value: boolean) => void;
  onAggregationChange: (aggregation: NumberAggregation) => void;
}

/** "Column options": width, whether people can hide or pin the column, and the Number summary's aggregation. */
export default function ColumnSettingsPanel({
  width, hideable, pinnable, kind, aggregation, onWidthChange, onHideableChange, onPinnableChange, onAggregationChange,
}: ColumnSettingsPanelProps) {
  const [draft, setDraft] = useState(String(width));

  const commitWidth = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed >= MIN_COLUMN_WIDTH && parsed <= MAX_COLUMN_WIDTH) onWidthChange(Math.round(parsed));
    else setDraft(String(width));
  };

  return (
    <div className="action-menu column-menu__form w-[264px]">
      <label className="column-menu__field">
        <span>Width</span>
        <input
          type="number"
          min={MIN_COLUMN_WIDTH}
          max={MAX_COLUMN_WIDTH}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitWidth}
          onKeyDown={(event) => {
            if (event.key === "Enter") (event.target as HTMLInputElement).blur();
          }}
          className="column-menu__input column-menu__input--short"
        />
      </label>
      <div className="column-menu__help">Between {MIN_COLUMN_WIDTH} and {MAX_COLUMN_WIDTH} pixels.</div>

      <div className="action-menu__divider" role="separator" />
      <button type="button" role="menuitemcheckbox" aria-checked={hideable} onClick={() => onHideableChange(!hideable)} className="action-menu__item">
        <span className="action-menu__label">Hideable</span>
        <ToggleSwitch is_on={hideable} size="sm" />
      </button>
      <button type="button" role="menuitemcheckbox" aria-checked={pinnable} onClick={() => onPinnableChange(!pinnable)} className="action-menu__item">
        <span className="action-menu__label">Pinnable</span>
        <ToggleSwitch is_on={pinnable} size="sm" />
      </button>

      {kind === "number" && (
        <>
          <div className="action-menu__divider" role="separator" />
          <label className="column-menu__field">
            <span>Group summary</span>
            <select
              value={aggregation ?? "sum"}
              onChange={(event) => onAggregationChange(event.target.value as NumberAggregation)}
              className="column-menu__input"
            >
              {(Object.keys(NUMBER_AGGREGATION_LABELS) as NumberAggregation[]).map((option) => (
                <option key={option} value={option}>{NUMBER_AGGREGATION_LABELS[option]}</option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}

/** Whether "Set column validation" has anything to offer for this kind. */
export const hasValidationRules = (kind: ColumnKind): boolean => kind === "number" || TEXT_FAMILY_KINDS.includes(kind);

interface ColumnValidationPanelProps {
  kind: ColumnKind;
  validation?: ColumnValidation;
  onChange: (patch: Partial<ColumnValidation>) => void;
}

/** "Set column validation": a Number column's min and max, or the pattern a text column's values must match. */
export function ColumnValidationPanel({ kind, validation, onChange }: ColumnValidationPanelProps) {
  const [pattern_draft, setPatternDraft] = useState(validation?.pattern ?? "");

  return (
    <div className="action-menu column-menu__form w-[264px]">
      <div className="column-menu__label">Values in this column must</div>
      {kind === "number" ? (
        <>
          <label className="column-menu__field">
            <span>Be at least</span>
            <input
              type="number"
              value={validation?.min ?? ""}
              placeholder="No min"
              onChange={(event) => onChange({ min: event.target.value === "" ? undefined : Number(event.target.value) })}
              className="column-menu__input column-menu__input--short"
            />
          </label>
          <label className="column-menu__field">
            <span>Be at most</span>
            <input
              type="number"
              value={validation?.max ?? ""}
              placeholder="No max"
              onChange={(event) => onChange({ max: event.target.value === "" ? undefined : Number(event.target.value) })}
              className="column-menu__input column-menu__input--short"
            />
          </label>
        </>
      ) : (
        <label className="column-menu__field column-menu__field--stacked">
          <span>Match this pattern (regex)</span>
          <input
            value={pattern_draft}
            onChange={(event) => setPatternDraft(event.target.value)}
            onBlur={() => onChange({ pattern: pattern_draft.trim() || undefined })}
            onKeyDown={(event) => {
              if (event.key === "Enter") (event.target as HTMLInputElement).blur();
            }}
            placeholder="e.g. ^[A-Z]{2}[0-9]+$"
            className="column-menu__input column-menu__input--mono"
          />
        </label>
      )}
      <div className="column-menu__help">Values that break the rule are flagged in their cell.</div>
    </div>
  );
}

interface ReminderSettingsPanelProps {
  reminder?: { enabled: boolean; days_before: number };
  onChange: (reminder: { enabled: boolean; days_before: number }) => void;
}

/** A Date column's "Set due date reminder": notifies the item's people once the date is close. */
export function ReminderSettingsPanel({ reminder, onChange }: ReminderSettingsPanelProps) {
  const is_enabled = !!reminder?.enabled;
  const days_before = reminder?.days_before ?? 0;

  return (
    <div className="action-menu column-menu__form w-[264px]">
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={is_enabled}
        onClick={() => onChange({ enabled: !is_enabled, days_before })}
        className="action-menu__item"
      >
        <span className="action-menu__label">Due date reminder</span>
        <ToggleSwitch is_on={is_enabled} size="sm" />
      </button>
      {is_enabled && (
        <label className="column-menu__field">
          <span>Days before</span>
          <input
            type="number"
            min={0}
            max={365}
            value={days_before}
            onChange={(event) => onChange({ enabled: true, days_before: Math.min(365, Math.max(0, Number(event.target.value) || 0)) })}
            className="column-menu__input column-menu__input--short"
          />
        </label>
      )}
      <div className="column-menu__help">Everyone assigned in a People column of the item gets notified.</div>
    </div>
  );
}

const BUTTON_COLORS = ["#579bfc", "#00c875", "#fdab3d", "#e2445c", "#a25ddc", "#323338", "#ff7575", "#037f4c"];

interface ButtonSettingsPanelProps {
  button?: { label: string; color: string };
  fallback_label: string;
  onSave: (button: { label: string; color: string }) => void;
}

/** A Button column's label and color. */
export function ButtonSettingsPanel({ button, fallback_label, onSave }: ButtonSettingsPanelProps) {
  const [label, setLabel] = useState(button?.label ?? fallback_label);
  const [color, setColor] = useState(button?.color ?? BUTTON_COLORS[0]);

  return (
    <div className="action-menu column-menu__form w-[240px]">
      <label className="column-menu__field column-menu__field--stacked">
        <span className="column-menu__label px-0">Button text</span>
        <input value={label} maxLength={40} onChange={(event) => setLabel(event.target.value)} className="column-menu__input" />
      </label>
      <div className="column-menu__label">Color</div>
      <div role="radiogroup" aria-label="Button color" className="column-menu__swatches">
        {BUTTON_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            role="radio"
            aria-checked={color === swatch}
            aria-label={swatch}
            title={swatch}
            onClick={() => setColor(swatch)}
            className="column-menu__swatch"
            style={{ background: swatch }}
          />
        ))}
      </div>
      <button type="button" disabled={!label.trim()} onClick={() => onSave({ label: label.trim(), color })} className="column-menu__primary">
        Save button
      </button>
    </div>
  );
}

const RATING_ICONS: RatingIcon[] = ["star", "heart", "thumbs_up", "smiley"];

interface RatingSettingsPanelProps {
  rating_max: number;
  rating_icon: RatingIcon;
  onChange: (patch: { rating_max?: number; rating_icon?: RatingIcon }) => void;
}

/** A Rating column's scale (how many icons) and the icon it is drawn with, saved as soon as one is picked. */
export function RatingSettingsPanel({ rating_max, rating_icon, onChange }: RatingSettingsPanelProps) {
  return (
    <div className={`action-menu column-menu__form rating-cell--${rating_icon} w-[264px]`}>
      <div className="column-menu__label">Icon</div>
      <div role="radiogroup" aria-label="Rating icon" className="column-menu__choices">
        {RATING_ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            role="radio"
            aria-checked={rating_icon === icon}
            aria-label={RATING_ICON_LABELS[icon]}
            title={RATING_ICON_LABELS[icon]}
            onClick={() => onChange({ rating_icon: icon })}
            className={`column-menu__choice column-menu__choice--icon rating-cell--${icon}`}
          >
            <RatingGlyph icon={icon} className="column-menu__choice-glyph" />
          </button>
        ))}
      </div>

      <div className="column-menu__label">Scale</div>
      <div role="radiogroup" aria-label="Rating scale" className="column-menu__choices">
        {Array.from({ length: RATING_MAX_LIMIT }, (_, index) => index + 1).map((max) => (
          <button
            key={max}
            type="button"
            role="radio"
            aria-checked={rating_max === max}
            aria-label={`${max} ${max === 1 ? "icon" : "icons"}`}
            onClick={() => onChange({ rating_max: max })}
            className="column-menu__choice"
          >
            {max}
          </button>
        ))}
      </div>

      <div className="column-menu__rating-preview" aria-hidden="true">
        {Array.from({ length: rating_max }, (_, index) => (
          <RatingGlyph key={index} icon={rating_icon} className={`column-menu__rating-preview-glyph${index < Math.ceil(rating_max / 2) ? " is-filled" : ""}`} />
        ))}
      </div>
      <div className="column-menu__help">Ratings above a smaller scale are capped when they are shown.</div>
    </div>
  );
}

interface ProgressTrackingSettingsPanelProps {
  /** The Status columns of the same table, in board order. */
  status_columns: ProgressStatusColumn[];
  progress_columns?: ProgressColumnWeight[];
  /** Null tracks every Status column with the same weight again. */
  onSave: (progress_columns: ProgressColumnWeight[] | null) => void;
}

/**
 * A Progress tracking column's settings: which Status columns fill the battery and,
 * optionally, how much each one weighs. Tracking them all with even weights saves
 * nothing, so Status columns added later are tracked too.
 */
export function ProgressTrackingSettingsPanel({ status_columns, progress_columns, onSave }: ProgressTrackingSettingsPanelProps) {
  const saved = (progress_columns ?? []).filter((entry) => status_columns.some((status_column) => status_column.id === entry.column_id));
  const [checked_ids, setCheckedIds] = useState<string[]>(saved.length ? saved.map((entry) => entry.column_id) : status_columns.map((status_column) => status_column.id));
  const [has_custom_weights, setHasCustomWeights] = useState(saved.length > 0 && new Set(saved.map((entry) => entry.weight)).size > 1);
  const [weights, setWeights] = useState<Record<string, number>>(() => Object.fromEntries(saved.map((entry) => [entry.column_id, entry.weight])));

  const ordered_checked_ids = status_columns.map((status_column) => status_column.id).filter((id) => checked_ids.includes(id));
  const weight_total = ordered_checked_ids.reduce((sum, id) => sum + (weights[id] ?? 0), 0);
  const is_weight_total_valid = !has_custom_weights || weight_total === 100;
  const can_save = ordered_checked_ids.length > 0 && is_weight_total_valid;

  const spreadEvenly = (ids: string[]) => {
    const even = evenWeights(ids.length);
    setWeights(Object.fromEntries(ids.map((id, index) => [id, even[index]])));
  };

  const toggleColumn = (id: string) => {
    const next_ids = checked_ids.includes(id) ? checked_ids.filter((entry) => entry !== id) : [...checked_ids, id];
    setCheckedIds(next_ids);
    if (has_custom_weights) spreadEvenly(status_columns.map((status_column) => status_column.id).filter((entry) => next_ids.includes(entry)));
  };

  const toggleCustomWeights = () => {
    if (!has_custom_weights) spreadEvenly(ordered_checked_ids);
    setHasCustomWeights(!has_custom_weights);
  };

  const save = () => {
    const tracks_everything = ordered_checked_ids.length === status_columns.length && !has_custom_weights;
    if (tracks_everything) return onSave(null);
    const even = evenWeights(ordered_checked_ids.length);
    onSave(ordered_checked_ids.map((id, index) => ({ column_id: id, weight: has_custom_weights ? weights[id] ?? 0 : even[index] })));
  };

  if (status_columns.length === 0) {
    return (
      <div className="action-menu column-menu__form w-[280px]">
        <div className="column-menu__label">Status columns</div>
        <div className="column-menu__help">Add a Status column to this board. The battery fills as its labels are set to Done.</div>
      </div>
    );
  }

  return (
    <div className="action-menu column-menu__form w-[296px]">
      <div className="column-menu__label">Status columns to track</div>
      <div className="column-menu__help">The battery fills as each column is set to Done.</div>
      <div className="column-menu__progress-list" role="group" aria-label="Status columns to track">
        {status_columns.map((status_column) => {
          const is_checked = checked_ids.includes(status_column.id);
          return (
            <div key={status_column.id} className="column-menu__progress-row">
              <label className="column-menu__progress-check">
                <input type="checkbox" checked={is_checked} onChange={() => toggleColumn(status_column.id)} />
                <span className="column-menu__progress-title" title={status_column.title}>{status_column.title}</span>
              </label>
              {has_custom_weights && is_checked && (
                <span className="column-menu__progress-weight">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights[status_column.id] ?? 0}
                    aria-label={`${status_column.title} weight`}
                    onChange={(event) => setWeights((current) => ({ ...current, [status_column.id]: Math.min(100, Math.max(0, Math.round(Number(event.target.value) || 0))) }))}
                    className="column-menu__input column-menu__input--short"
                  />
                  <span aria-hidden="true">%</span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="action-menu__divider" role="separator" />
      <button type="button" role="menuitemcheckbox" aria-checked={has_custom_weights} onClick={toggleCustomWeights} className="action-menu__item">
        <span className="action-menu__label">Custom weights</span>
        <ToggleSwitch is_on={has_custom_weights} size="sm" />
      </button>
      {has_custom_weights && (
        <div className={`column-menu__help${is_weight_total_valid ? "" : " column-menu__help--error"}`}>
          Total {weight_total}%. Weights must add up to 100%.{" "}
          <button type="button" className="column-menu__link" onClick={() => spreadEvenly(ordered_checked_ids)}>
            Split evenly
          </button>
        </div>
      )}
      {ordered_checked_ids.length === 0 && <div className="column-menu__help column-menu__help--error">Pick at least one Status column.</div>}
      <button type="button" disabled={!can_save} onClick={save} className="column-menu__primary">
        Save
      </button>
    </div>
  );
}
