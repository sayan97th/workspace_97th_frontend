"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  COLOR_PICKER_PALETTE,
  formatHour,
  isHexColor,
  isoWeekNumber,
  listCountries,
  parseIsoDay,
  startOfIsoWeek,
  toIsoDay,
} from "../columnValueFormats";
import PopoverPanel from "./PopoverPanel";
import "./value-picker.css";

/** Where every value picker opens: centered under its cell. */
const PANEL_CLASS = "left-1/2 top-full mt-1 -translate-x-1/2";

const SearchGlyph = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const ChevronGlyph = ({ direction }: { direction: "left" | "right" }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d={direction === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface SearchListOption {
  id: string;
  label: string;
  /** Extra words matched by the search box (a time zone's region, a country code). */
  keywords?: string;
  leading?: ReactNode;
  hint?: string;
}

interface SearchListPickerProps {
  title: string;
  placeholder: string;
  options: SearchListOption[];
  selected_id: string | null;
  onPick: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
  width?: number;
}

/** A searchable single choice list, the body of the Country picker. */
function SearchListPicker({ title, placeholder, options, selected_id, onPick, onClear, onClose, width = 280 }: SearchListPickerProps) {
  const [query, setQuery] = useState("");
  const list_ref = useRef<HTMLDivElement>(null);
  const term = query.trim().toLowerCase();
  const visible = useMemo(
    () => (term ? options.filter((option) => `${option.label} ${option.keywords ?? ""}`.toLowerCase().includes(term)) : options),
    [options, term]
  );

  // Opens scrolled to the current choice.
  useEffect(() => {
    list_ref.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "center" });
  }, []);

  const pick = (id: string) => {
    onPick(id);
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && visible[0]) {
      event.preventDefault();
      pick(visible[0].id);
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  return (
    <PopoverPanel unstyled onClose={onClose} className={PANEL_CLASS}>
      <div className="value-picker" style={{ width }}>
        <div className="value-picker__title">{title}</div>
        <label className="value-picker__field">
          <SearchGlyph />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            className="value-picker__input"
          />
        </label>
        <div ref={list_ref} className="value-picker__list" role="listbox" aria-label={title}>
          {visible.length === 0 ? (
            <div className="value-picker__empty">No results for &ldquo;{query.trim()}&rdquo;</div>
          ) : (
            visible.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={option.id === selected_id}
                onClick={() => pick(option.id)}
                className="value-picker__option"
              >
                {option.leading}
                <span className="value-picker__option-label">{option.label}</span>
                {option.hint && <span className="value-picker__option-hint">{option.hint}</span>}
              </button>
            ))
          )}
        </div>
        {selected_id && (
          <div className="value-picker__footer">
            <button
              type="button"
              className="value-picker__ghost"
              onClick={() => {
                onClear();
                onClose();
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </PopoverPanel>
  );
}

interface ValuePickerProps {
  value: string | null;
  onPick: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
}

/** The Country cell's picker: every country with its flag, searchable by name or code. */
export function CountryMenu(props: ValuePickerProps) {
  const options = useMemo(
    () =>
      listCountries().map((country) => ({
        id: country.code,
        label: country.name,
        keywords: country.code,
        leading: <span className="value-picker__flag" aria-hidden="true">{country.flag}</span>,
      })),
    []
  );
  return <SearchListPicker title="Choose a country" placeholder="Search a country" options={options} selected_id={props.value} {...props} />;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The Week cell's picker: a month calendar where a whole row (Monday to Sunday) is one choice, with ISO week numbers. */
export function WeekMenu({ value, onPick, onClear, onClose }: ValuePickerProps) {
  const selected_start = value ? parseIsoDay(value) : null;
  const [month, setMonth] = useState(() => {
    const anchor = selected_start ?? new Date();
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });
  const today_iso = toIsoDay(new Date());
  const selected_iso = selected_start ? toIsoDay(startOfIsoWeek(selected_start)) : null;

  // Every week touching the month, as its Monday.
  const weeks = useMemo(() => {
    const first = startOfIsoWeek(month);
    const last_day = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const result: Date[] = [];
    for (let cursor = first; cursor <= last_day; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)) {
      result.push(cursor);
    }
    return result;
  }, [month]);

  const shiftMonth = (delta: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  const pick = (monday: Date) => {
    onPick(toIsoDay(monday));
    onClose();
  };

  return (
    <PopoverPanel unstyled onClose={onClose} className={PANEL_CLASS}>
      <div className="value-picker" onKeyDown={(event) => event.key === "Escape" && onClose()}>
        <div className="value-picker__month-nav">
          <button type="button" aria-label="Previous month" className="value-picker__icon-button" onClick={() => shiftMonth(-1)}>
            <ChevronGlyph direction="left" />
          </button>
          <span className="value-picker__month-label">
            {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
          </span>
          <button type="button" aria-label="Next month" className="value-picker__icon-button" onClick={() => shiftMonth(1)}>
            <ChevronGlyph direction="right" />
          </button>
        </div>
        <div className="value-picker__week-grid" role="listbox" aria-label="Weeks">
          <div className="value-picker__week-head" aria-hidden="true">
            <span className="value-picker__weekday">Wk</span>
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="value-picker__weekday">
                {weekday}
              </span>
            ))}
          </div>
          {weeks.map((monday) => {
            const monday_iso = toIsoDay(monday);
            const days = Array.from({ length: 7 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index));
            return (
              <button
                key={monday_iso}
                type="button"
                role="option"
                aria-selected={monday_iso === selected_iso}
                aria-label={`Week ${isoWeekNumber(monday)}, starting ${monday.toDateString()}`}
                onClick={() => pick(monday)}
                className="value-picker__week-row"
              >
                <span className="value-picker__week-number">W{isoWeekNumber(monday)}</span>
                {days.map((day) => (
                  <span
                    key={day.getTime()}
                    className="value-picker__day"
                    data-outside={day.getMonth() !== month.getMonth() || undefined}
                    data-today={toIsoDay(day) === today_iso || undefined}
                  >
                    {day.getDate()}
                  </span>
                ))}
              </button>
            );
          })}
        </div>
        <div className="value-picker__footer">
          <button
            type="button"
            className="value-picker__ghost"
            disabled={!value}
            onClick={() => {
              onClear();
              onClose();
            }}
          >
            Clear
          </button>
          <button type="button" className="value-picker__ghost" onClick={() => pick(startOfIsoWeek(new Date()))}>
            This week
          </button>
        </div>
      </div>
    </PopoverPanel>
  );
}

/** Every half hour of the day, the Hour picker's quick choices. */
const HALF_HOURS = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`);

interface HourMenuProps extends ValuePickerProps {
  is_24_hour: boolean;
  onFormatChange: (is_24_hour: boolean) => void;
}

/** The Hour cell's picker: an exact time field plus every half hour, in 12 or 24 hour format. */
export function HourMenu({ value, onPick, onClear, onClose, is_24_hour, onFormatChange }: HourMenuProps) {
  const [draft, setDraft] = useState(value ?? "");
  const list_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = list_ref.current?.querySelector('[aria-selected="true"]') ?? list_ref.current?.querySelector('[data-hour="09:00"]');
    target?.scrollIntoView({ block: "center" });
  }, []);

  const pick = (hour: string) => {
    onPick(hour);
    onClose();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (draft) pick(draft);
  };

  return (
    <PopoverPanel unstyled onClose={onClose} className={PANEL_CLASS}>
      <div className="value-picker" style={{ width: 220 }} onKeyDown={(event) => event.key === "Escape" && onClose()}>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <label className="value-picker__field flex-1">
            <input
              autoFocus
              type="time"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label="Time"
              className="value-picker__input"
            />
          </label>
          <button type="submit" className="value-picker__primary" disabled={!draft}>
            Set
          </button>
        </form>
        <div ref={list_ref} className="value-picker__list" role="listbox" aria-label="Times">
          {HALF_HOURS.map((hour) => (
            <button
              key={hour}
              type="button"
              role="option"
              data-hour={hour}
              aria-selected={hour === value}
              onClick={() => pick(hour)}
              className="value-picker__option"
            >
              <span className="value-picker__option-label">{formatHour(hour, is_24_hour)}</span>
            </button>
          ))}
        </div>
        <div className="value-picker__footer">
          <button
            type="button"
            className="value-picker__ghost"
            disabled={!value}
            onClick={() => {
              onClear();
              onClose();
            }}
          >
            Clear
          </button>
          <div className="value-picker__segmented" role="group" aria-label="Time format">
            <button type="button" className="value-picker__segment" aria-pressed={!is_24_hour} onClick={() => onFormatChange(false)}>
              12h
            </button>
            <button type="button" className="value-picker__segment" aria-pressed={is_24_hour} onClick={() => onFormatChange(true)}>
              24h
            </button>
          </div>
        </div>
      </div>
    </PopoverPanel>
  );
}

/** The Color picker cell's picker: monday's palette, a hex field and the system color dialog. */
export function ColorPickerMenu({ value, onPick, onClear, onClose }: ValuePickerProps) {
  const [draft, setDraft] = useState(value ?? "");
  const normalized_draft = draft.startsWith("#") ? draft : `#${draft}`;

  const pick = (color: string) => {
    onPick(color.toLowerCase());
    onClose();
  };

  return (
    <PopoverPanel unstyled onClose={onClose} className={PANEL_CLASS}>
      <div className="value-picker" onKeyDown={(event) => event.key === "Escape" && onClose()}>
        <div className="value-picker__title">Choose a color</div>
        <div className="value-picker__swatches" role="radiogroup" aria-label="Colors">
          {COLOR_PICKER_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={value?.toLowerCase() === color}
              aria-label={color}
              title={color}
              onClick={() => pick(color)}
              className="value-picker__swatch"
              style={{ background: color }}
            />
          ))}
        </div>
        <form
          className="value-picker__color-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (isHexColor(normalized_draft)) pick(normalized_draft);
          }}
        >
          <input
            type="color"
            aria-label="Custom color"
            value={isHexColor(normalized_draft) ? normalized_draft : value ?? "#579bfc"}
            onChange={(event) => setDraft(event.target.value)}
            className="value-picker__native-color"
          />
          <label className="value-picker__field flex-1">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value.trim())}
              placeholder="#579bfc"
              aria-label="Hex color"
              maxLength={7}
              className="value-picker__input"
            />
          </label>
          <button type="submit" className="value-picker__primary" disabled={!isHexColor(normalized_draft)}>
            Set
          </button>
        </form>
        {value && (
          <div className="value-picker__footer">
            <button
              type="button"
              className="value-picker__ghost"
              onClick={() => {
                onClear();
                onClose();
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </PopoverPanel>
  );
}
