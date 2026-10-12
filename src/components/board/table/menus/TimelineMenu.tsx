"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { buildCalendarDays, fmtDateInput, monthOf, parseDateInput, todayIso, type MonthCursor } from "../dateUtils";
import DatePickerMonthNav, { WEEKDAY_LABELS } from "./DatePickerMonthNav";
import PopoverPanel from "./PopoverPanel";
import "./date-picker.css";

interface TimelineMenuProps {
  start_iso: string;
  end_iso: string;
  onChange: (start_iso: string, end_iso: string) => void;
  onClear: () => void;
  onClose: () => void;
}

type RangeEdge = "start" | "end";

interface RangeFieldProps {
  input_ref: RefObject<HTMLInputElement | null>;
  text: string;
  placeholder: string;
  is_active: boolean;
  has_value: boolean;
  onTextChange: (text: string) => void;
  onFocus: () => void;
  onCommit: () => void;
  onEnter: () => void;
  onClear: () => void;
}

/** One of the two "Start date" / "End date" boxes. The box of the edge the next day click sets keeps the blue border. */
function RangeField({ input_ref, text, placeholder, is_active, has_value, onTextChange, onFocus, onCommit, onEnter, onClear }: RangeFieldProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onEnter();
  };

  return (
    <div className={`date-picker__field date-picker__field--range${is_active ? " date-picker__field--active" : ""}`}>
      <input
        ref={input_ref}
        type="text"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className="date-picker__input date-picker__input--date"
      />
      {has_value && (
        <button type="button" onClick={onClear} aria-label={`Clear ${placeholder.toLowerCase()}`} title={`Clear ${placeholder.toLowerCase()}`} className="date-picker__clear">
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
            <path d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * The table's Timeline cell picker, styled after monday.com: a "Set dates" title, the editable
 * "Start date" and "End date" fields, the month and year dropdowns with arrows (shared with
 * `DateMenu`), and a day grid that paints the range. The first click sets the start, the next
 * one the end, and while the end is pending the grid previews the range under the pointer.
 * A day before the start begins a new range. The card draws its own chrome (`date-picker.css`),
 * so the panel is `unstyled`.
 */
export default function TimelineMenu({ start_iso, end_iso, onChange, onClear, onClose }: TimelineMenuProps) {
  const [active_edge, setActiveEdge] = useState<RangeEdge>(start_iso && !end_iso ? "end" : "start");
  const [cursor, setCursor] = useState<MonthCursor>(() => monthOf(start_iso));
  const [hover_iso, setHoverIso] = useState("");
  const [start_text, setStartText] = useState(() => fmtDateInput(start_iso));
  const [end_text, setEndText] = useState(() => fmtDateInput(end_iso));
  // The stored range the text fields were last filled from. When it changes from outside
  // (another tab, a realtime update) the fields follow it, see React's "adjusting state on prop change".
  const [synced_range, setSyncedRange] = useState(`${start_iso}..${end_iso}`);
  const start_input_ref = useRef<HTMLInputElement>(null);
  const end_input_ref = useRef<HTMLInputElement>(null);

  if (synced_range !== `${start_iso}..${end_iso}`) {
    setSyncedRange(`${start_iso}..${end_iso}`);
    setStartText(fmtDateInput(start_iso));
    setEndText(fmtDateInput(end_iso));
  }

  const inputOf = (edge: RangeEdge) => (edge === "start" ? start_input_ref : end_input_ref);

  // Opens with the caret in the field the next click fills, like monday.com. Mount only, on purpose.
  // Deferred a frame, since the click that opened the menu still hands focus to the cell button.
  useEffect(() => {
    const frame_id = requestAnimationFrame(() => inputOf(active_edge).current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusEdge = (edge: RangeEdge) => {
    setActiveEdge(edge);
    inputOf(edge).current?.focus({ preventScroll: true });
  };

  const saveRange = (next_start_iso: string, next_end_iso: string) => {
    setStartText(fmtDateInput(next_start_iso));
    setEndText(fmtDateInput(next_end_iso));
    onChange(next_start_iso, next_end_iso);
  };

  /** Sets one edge of the range. An end before the start, or a start after the end, begins a new range from that day. */
  const applyDate = (edge: RangeEdge, iso: string, move_focus: boolean) => {
    if (edge === "end" && start_iso && iso >= start_iso) {
      saveRange(start_iso, iso);
      return;
    }
    saveRange(iso, edge === "start" && end_iso >= iso ? end_iso : "");
    if (move_focus) focusEdge("end");
  };

  /** Clearing the start empties the whole range, clearing the end keeps a one day range on the start. */
  const clearEdge = (edge: RangeEdge) => {
    if (edge === "start" || !start_iso) {
      setStartText("");
      setEndText("");
      onClear();
      focusEdge("start");
      return;
    }
    saveRange(start_iso, "");
    focusEdge("end");
  };

  // Typed text is committed on Enter or blur, not on every keystroke, so a half typed
  // value never reaches the server. Text that doesn't parse goes back to the stored value.
  const commitText = (edge: RangeEdge, move_focus: boolean) => {
    const text = edge === "start" ? start_text : end_text;
    const stored_iso = edge === "start" ? start_iso : end_iso;
    const setText = edge === "start" ? setStartText : setEndText;
    if (!text.trim()) {
      if (stored_iso) clearEdge(edge);
      return;
    }
    const parsed_iso = parseDateInput(text);
    if (!parsed_iso) {
      setText(fmtDateInput(stored_iso));
      return;
    }
    if (parsed_iso === stored_iso) {
      setText(fmtDateInput(parsed_iso));
      return;
    }
    setCursor(monthOf(parsed_iso));
    applyDate(edge, parsed_iso, move_focus);
  };

  const days = buildCalendarDays(cursor);
  const today_iso = todayIso();
  // While the end is pending, the grid previews the range up to the hovered day.
  const is_previewing = active_edge === "end" && !!start_iso && !!hover_iso && hover_iso >= start_iso && hover_iso !== end_iso;
  const shown_end_iso = is_previewing ? hover_iso : end_iso;

  return (
    <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-full w-max -translate-x-1/2">
      <div className="date-picker date-picker--range" role="dialog" aria-label="Set dates">
        <div className="date-picker__title">Set dates</div>

        <div className="date-picker__range-fields">
          <RangeField
            input_ref={start_input_ref}
            text={start_text}
            placeholder="Start date"
            is_active={active_edge === "start"}
            has_value={!!start_iso}
            onTextChange={setStartText}
            onFocus={() => setActiveEdge("start")}
            onCommit={() => commitText("start", false)}
            onEnter={() => commitText("start", true)}
            onClear={() => clearEdge("start")}
          />
          <RangeField
            input_ref={end_input_ref}
            text={end_text}
            placeholder="End date"
            is_active={active_edge === "end"}
            has_value={!!end_iso}
            onTextChange={setEndText}
            onFocus={() => setActiveEdge("end")}
            onCommit={() => commitText("end", false)}
            onEnter={() => commitText("end", true)}
            onClear={() => clearEdge("end")}
          />
        </div>

        <DatePickerMonthNav cursor={cursor} onCursorChange={setCursor} />

        <div className="date-picker__grid" role="grid" onMouseLeave={() => setHoverIso("")}>
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} role="columnheader" className="date-picker__weekday">
              {label}
            </div>
          ))}
          {days.map((day) => {
            const is_start = day.iso === start_iso;
            const is_end = !!shown_end_iso && day.iso === shown_end_iso && shown_end_iso !== start_iso;
            const is_inside = !!start_iso && !!shown_end_iso && day.iso > start_iso && day.iso < shown_end_iso;
            const day_class = [
              "date-picker__day",
              !day.in_month && "date-picker__day--outside",
              day.iso === today_iso && "date-picker__day--today",
              is_start && "date-picker__day--range-start",
              is_end && (is_previewing ? "date-picker__day--range-end-preview" : "date-picker__day--range-end"),
              is_start && !!shown_end_iso && shown_end_iso !== start_iso && "date-picker__day--range-open",
              is_inside && "date-picker__day--in-range",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                type="button"
                role="gridcell"
                key={day.iso}
                aria-selected={is_start || (is_end && !is_previewing)}
                onClick={() => applyDate(active_edge, day.iso, true)}
                onMouseEnter={() => setHoverIso(day.iso)}
                className={day_class}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>
    </PopoverPanel>
  );
}
