"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import "./expanding-cell-editor.scss";

/** Gap (px) the editor keeps from every viewport edge. */
const VIEWPORT_MARGIN_PX = 8;
/** Smallest top and bottom text padding (px), reached once the text is taller than the cell. */
const MIN_PADDING_Y_PX = 8;
/** Room kept on the right for the `trailing` button. */
const TRAILING_SPACE_PX = 24;
/** Height of the length counter tab that hangs under the frame. */
const COUNTER_TAB_PX = 20;

export interface ExpandingCellEditorProps {
  /** The cell the editor opens over. Its rect is the editor's minimum size and its top left corner. */
  anchor_ref: RefObject<HTMLElement | null>;
  /**
   * Where the text column starts inside the cell (the name box after the expand arrow). The space before it
   * stays see through on the cell's own row, so leading controls keep showing, and wrapped lines align under
   * the first one. Defaults to the cell's left edge.
   */
  text_start_ref?: RefObject<HTMLElement | null>;
  /** Horizontal text padding (px), matching the resting label so the text does not move when the editor opens. */
  text_padding_x?: number;
  value: string;
  onChange: (next_value: string) => void;
  /** Enter, Tab, or a click outside the editor. */
  onCommit: () => void;
  /** Escape. */
  onCancel: () => void;
  /**
   * Enter combined with Option/Alt, Shift, Command or Control inserts a line break inside the cell, like Google
   * Sheets (Text and Long Text). Without it, pasted line
   * breaks become spaces.
   */
  allow_line_breaks?: boolean;
  /** Selects the whole value on open instead of placing the caret at the end. */
  select_all?: boolean;
  placeholder?: string;
  /** Widest the editor grows (px) before the text wraps and the editor grows down instead. */
  max_width?: number;
  /** Tallest the editor grows (px) before it scrolls. */
  max_height?: number;
  /** Hard character cap (item names are `varchar(255)` in the API). A small counter shows under the field once the value gets close. */
  max_length?: number;
  /** Lets the caller reach the textarea, for example to splice an emoji in at the caret. */
  textarea_ref?: RefObject<HTMLTextAreaElement | null>;
  /** Pinned to the editor's top right corner (an emoji button). Space is reserved so text never runs under it. */
  trailing?: ReactNode;
  /** While true a blur is not treated as a commit, for a portaled picker (emoji palette) that steals focus. */
  is_blur_suspended_ref?: RefObject<boolean>;
  /** Extra classes for the textarea, for per column text color. */
  text_class_name?: string;
  aria_label?: string;
}

/**
 * Google Sheets style in place editor for long text in a table cell.
 *
 * It opens exactly on the cell's rect with the text where the resting label
 * was, so a short value looks like the cell itself became editable. As the value grows the editor first widens to the right over the
 * neighbouring cells (one line, like Sheets) until `max_width` or the window
 * edge, then wraps and grows down until `max_height`, after which it scrolls.
 * It is portaled to `document.body` with fixed positioning so the table's
 * scroll containers and sticky columns never clip it, and it follows the cell
 * while the page or the table scrolls.
 */
export default function ExpandingCellEditor({
  anchor_ref,
  text_start_ref,
  text_padding_x = 12,
  value,
  onChange,
  onCommit,
  onCancel,
  allow_line_breaks = false,
  select_all = false,
  placeholder,
  max_width = 560,
  max_height = 320,
  max_length,
  textarea_ref,
  trailing,
  is_blur_suspended_ref,
  text_class_name = "",
  aria_label,
}: ExpandingCellEditorProps) {
  const frame_ref = useRef<HTMLDivElement>(null);
  const own_textarea_ref = useRef<HTMLTextAreaElement>(null);
  const measure_ref = useRef<HTMLSpanElement>(null);
  const lead_fill_ref = useRef<HTMLSpanElement>(null);
  const trailing_ref = useRef<HTMLSpanElement>(null);
  const has_trailing = !!trailing;
  const is_counter_shown = max_length !== undefined && value.length >= max_length * 0.8;
  // Enter/Escape already settled the edit, so the blur that follows the unmount must not commit again.
  const is_settled_ref = useRef(false);

  const setTextareaRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      own_textarea_ref.current = el;
      if (textarea_ref) (textarea_ref as { current: HTMLTextAreaElement | null }).current = el;
    },
    [textarea_ref]
  );

  /**
   * Sizes and places the editor from the cell's current rect and the text's natural width. Writes styles
   * directly so typing never re-renders twice.
   *
   * The frame sits exactly on the cell and the text keeps the resting label's position (same left inset,
   * vertically centered while it fits), so opening the editor reads as the cell turning editable rather than
   * a box landing on top. Only when the text needs more room does the frame grow, right first and then down.
   */
  const layout = useCallback(() => {
    const anchor_el = anchor_ref.current;
    const frame_el = frame_ref.current;
    const textarea_el = own_textarea_ref.current;
    const measure_el = measure_ref.current;
    if (!anchor_el || !frame_el || !textarea_el || !measure_el) return;

    const rect = anchor_el.getBoundingClientRect();
    const viewport_width = window.innerWidth;
    const viewport_height = window.innerHeight;
    const text_start_rect = text_start_ref?.current?.getBoundingClientRect();
    const lead_width = text_start_rect ? Math.max(0, Math.round(text_start_rect.left - rect.left)) : 0;
    const padding_right = text_padding_x + (has_trailing ? TRAILING_SPACE_PX : 0);

    for (const el of [textarea_el, measure_el]) {
      el.style.paddingLeft = `${text_padding_x}px`;
      el.style.paddingRight = `${padding_right}px`;
    }

    // Natural width of the longest line, measured with the textarea's own font and padding.
    measure_el.textContent = `${textarea_el.value || placeholder || ""}\u200b`;
    const natural_width = lead_width + Math.ceil(measure_el.getBoundingClientRect().width) + 2;

    const room_right = viewport_width - VIEWPORT_MARGIN_PX - Math.max(rect.left, VIEWPORT_MARGIN_PX);
    const width_limit = Math.max(rect.width, Math.min(max_width, room_right));
    const width = Math.min(Math.max(natural_width, rect.width), width_limit);

    let left = rect.left;
    if (left + width > viewport_width - VIEWPORT_MARGIN_PX) left = viewport_width - VIEWPORT_MARGIN_PX - width;
    left = Math.max(VIEWPORT_MARGIN_PX, left);

    frame_el.style.width = `${width}px`;
    frame_el.style.left = `${left}px`;
    textarea_el.style.marginLeft = `${lead_width}px`;
    textarea_el.style.width = `${width - lead_width}px`;

    // Text height without padding, read after the width is applied.
    textarea_el.style.paddingTop = "0px";
    textarea_el.style.paddingBottom = "0px";
    textarea_el.style.height = "auto";
    const text_height = textarea_el.scrollHeight;

    // Centered in the cell while it fits, like the resting label. The padding meets the minimum exactly when
    // the text outgrows the cell, so the first line never jumps as the editor starts growing down.
    const padding_y = Math.max(MIN_PADDING_Y_PX, Math.floor((rect.height - text_height) / 2));
    textarea_el.style.paddingTop = `${padding_y}px`;
    textarea_el.style.paddingBottom = `${padding_y}px`;

    const counter_space = is_counter_shown ? COUNTER_TAB_PX : 0;
    const height_limit = Math.max(rect.height, Math.min(max_height, viewport_height - VIEWPORT_MARGIN_PX * 2 - counter_space));
    const content_height = text_height + padding_y * 2;
    const height = Math.min(Math.max(content_height, rect.height), height_limit);
    textarea_el.style.height = `${height}px`;
    textarea_el.style.overflowY = content_height > height_limit ? "auto" : "hidden";
    frame_el.style.height = `${height}px`;

    // Under the cell's own row the leading strip is filled, so rows below never show through a grown editor.
    const lead_fill_el = lead_fill_ref.current;
    if (lead_fill_el) {
      lead_fill_el.style.top = `${rect.height}px`;
      lead_fill_el.style.width = `${lead_width}px`;
      lead_fill_el.style.height = `${Math.max(0, height - rect.height)}px`;
    }

    // The emoji button stays level with the first line.
    const trailing_el = trailing_ref.current;
    if (trailing_el) {
      const line_height = parseFloat(getComputedStyle(textarea_el).lineHeight) || 20;
      trailing_el.style.top = `${padding_y + (line_height - trailing_el.offsetHeight) / 2}px`;
    }

    const is_expanded = width > rect.width + 1 || height > rect.height + 1;
    frame_el.dataset.expanded = is_expanded ? "true" : "false";

    // Grows down from the cell, and shifts up only when the window bottom would cut it off.
    const total_height = height + counter_space;
    let top = rect.top;
    if (top + total_height > viewport_height - VIEWPORT_MARGIN_PX) top = viewport_height - VIEWPORT_MARGIN_PX - total_height;
    top = Math.max(VIEWPORT_MARGIN_PX, top);
    frame_el.style.top = `${top}px`;
  }, [anchor_ref, text_start_ref, text_padding_x, has_trailing, is_counter_shown, max_height, max_width, placeholder]);

  // Focus on open, with the caret at the end (Sheets) or the whole value selected (a fresh row).
  useLayoutEffect(() => {
    layout();
    const textarea_el = own_textarea_ref.current;
    if (!textarea_el) return;
    textarea_el.focus({ preventScroll: true });
    if (select_all) textarea_el.select();
    else textarea_el.setSelectionRange(textarea_el.value.length, textarea_el.value.length);
    // Only on open, later layouts run from the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    layout();
  }, [value, layout]);

  // Follows the cell while any scroll container or the window moves or resizes.
  useEffect(() => {
    let frame_id = 0;
    const scheduleLayout = () => {
      cancelAnimationFrame(frame_id);
      frame_id = requestAnimationFrame(layout);
    };
    window.addEventListener("scroll", scheduleLayout, true);
    window.addEventListener("resize", scheduleLayout);
    const anchor_el = anchor_ref.current;
    const resize_observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleLayout) : null;
    if (anchor_el) resize_observer?.observe(anchor_el);
    if (text_start_ref?.current) resize_observer?.observe(text_start_ref.current);
    return () => {
      cancelAnimationFrame(frame_id);
      window.removeEventListener("scroll", scheduleLayout, true);
      window.removeEventListener("resize", scheduleLayout);
      resize_observer?.disconnect();
    };
  }, [anchor_ref, text_start_ref, layout]);

  /**
   * Inserts the line break in the DOM first, so the caret moves with it right away and keys typed right after
   * land after the break. Updating only React state would reset the caret to the end on the next render.
   * `insertText` also keeps the browser's own Cmd/Ctrl+Z history, `setRangeText` is the fallback.
   */
  const insertLineBreak = (textarea_el: HTMLTextAreaElement) => {
    // A full field takes no more characters, the same as the browser's own `maxLength` does for typing.
    const selected_length = textarea_el.selectionEnd - textarea_el.selectionStart;
    if (max_length !== undefined && textarea_el.value.length - selected_length >= max_length) return;
    const is_inserted = typeof document.execCommand === "function" && document.execCommand("insertText", false, "\n");
    if (is_inserted) return; // Fires `input`, so `onChange` runs through the textarea's own handler.
    textarea_el.setRangeText("\n", textarea_el.selectionStart, textarea_el.selectionEnd, "end");
    onChange(textarea_el.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Never settle the edit in the middle of an IME composition.
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      is_settled_ref.current = true;
      onCancel();
      return;
    }
    if (event.key !== "Enter") return;
    // Google Sheets takes every modifier for a line break, so whichever one a Mac or Windows user reaches for works:
    // Option/Alt+Enter, Shift+Enter, Command+Enter and Control+Enter.
    if (allow_line_breaks && (event.altKey || event.shiftKey || event.metaKey || event.ctrlKey)) {
      // Only Shift+Enter is a native line break in a textarea, the others are inserted by hand.
      if (!event.shiftKey) {
        event.preventDefault();
        insertLineBreak(event.currentTarget);
      }
      return;
    }
    event.preventDefault();
    is_settled_ref.current = true;
    onCommit();
  };

  const handleBlur = () => {
    if (is_settled_ref.current || is_blur_suspended_ref?.current) return;
    is_settled_ref.current = true;
    onCommit();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div ref={frame_ref} className="expanding-cell-editor" data-expanded="false" data-expanding-cell-editor="true">
      <span ref={lead_fill_ref} aria-hidden className="expanding-cell-editor__lead-fill" />
      <textarea
        ref={setTextareaRef}
        value={value}
        rows={1}
        spellCheck
        aria-label={aria_label}
        placeholder={placeholder}
        maxLength={max_length}
        onChange={(event) => onChange(allow_line_breaks ? event.target.value : event.target.value.replace(/\r?\n/g, " "))}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`expanding-cell-editor__field ${text_class_name}`}
      />
      {/* Off screen twin of the textarea, used to read the text's one line width. */}
      <span ref={measure_ref} aria-hidden className="expanding-cell-editor__field expanding-cell-editor__measure" />
      {trailing && (
        <span ref={trailing_ref} className="expanding-cell-editor__trailing">
          {trailing}
        </span>
      )}
      {/* Hangs under the frame only near the cap, so the text never shifts and a user whose typing stops can see why. */}
      {is_counter_shown && max_length !== undefined && (
        <div
          className={`expanding-cell-editor__counter ${value.length >= max_length ? "expanding-cell-editor__counter--full" : ""}`}
          style={{ "--counter-fill": `${Math.min(100, (value.length / max_length) * 100)}%` } as CSSProperties}
          aria-live="polite"
        >
          <span className="expanding-cell-editor__counter-bar" aria-hidden />
          {max_length - value.length === 0 ? "Limit reached" : `${max_length - value.length} left`}
        </div>
      )}
    </div>,
    document.body
  );
}
