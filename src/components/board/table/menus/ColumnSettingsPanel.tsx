"use client";

import { useState } from "react";
import ToggleSwitch from "../../toolbar/ToggleSwitch";
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH, TEXT_FAMILY_KINDS } from "../constants";
import type { ColumnKind, ColumnValidation } from "../types";
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
