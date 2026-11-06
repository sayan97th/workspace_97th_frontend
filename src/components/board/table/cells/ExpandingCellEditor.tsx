"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import "./expanding-cell-editor.css";

/** Gap (px) the editor keeps from every viewport edge. */
const VIEWPORT_MARGIN_PX = 8;

export interface ExpandingCellEditorProps {
  /** The cell the editor opens over. Its rect is the editor's minimum size and its top left corner. */
  anchor_ref: RefObject<HTMLElement | null>;
  value: string;
  onChange: (next_value: string) => void;
  /** Enter, Tab, or a click outside the editor. */
  onCommit: () => void;
  /** Escape. */
  onCancel: () => void;
  /** Shift+Enter and Alt+Enter insert a line break (Long Text). Without it, pasted line breaks become spaces. */
  allow_line_breaks?: boolean;
  /** Selects the whole value on open instead of placing the caret at the end. */
  select_all?: boolean;
  placeholder?: string;
  /** Widest the editor grows (px) before the text wraps and the editor grows down instead. */
  max_width?: number;
  /** Tallest the editor grows (px) before it scrolls. */
  max_height?: number;
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
 * It opens exactly over the cell, so a short value looks like it is edited in
 * place. As the value grows the editor first widens to the right over the
 * neighbouring cells (one line, like Sheets) until `max_width` or the window
 * edge, then wraps and grows down until `max_height`, after which it scrolls.
 * It is portaled to `document.body` with fixed positioning so the table's
 * scroll containers and sticky columns never clip it, and it follows the cell
 * while the page or the table scrolls.
 */
export default function ExpandingCellEditor({
  anchor_ref,
  value,
  onChange,
  onCommit,
  onCancel,
  allow_line_breaks = false,
  select_all = false,
  placeholder,
  max_width = 560,
  max_height = 320,
  textarea_ref,
  trailing,
  is_blur_suspended_ref,
  text_class_name = "",
  aria_label,
}: ExpandingCellEditorProps) {
  const frame_ref = useRef<HTMLDivElement>(null);
  const own_textarea_ref = useRef<HTMLTextAreaElement>(null);
  const measure_ref = useRef<HTMLSpanElement>(null);
  // Enter/Escape already settled the edit, so the blur that follows the unmount must not commit again.
  const is_settled_ref = useRef(false);

  const setTextareaRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      own_textarea_ref.current = el;
      if (textarea_ref) (textarea_ref as { current: HTMLTextAreaElement | null }).current = el;
    },
    [textarea_ref]
  );

  /** Sizes and places the editor from the cell's current rect and the text's natural width. Writes styles directly so typing never re-renders twice. */
  const layout = useCallback(() => {
    const anchor_el = anchor_ref.current;
    const frame_el = frame_ref.current;
    const textarea_el = own_textarea_ref.current;
    const measure_el = measure_ref.current;
    if (!anchor_el || !frame_el || !textarea_el || !measure_el) return;

    const rect = anchor_el.getBoundingClientRect();
    const viewport_width = window.innerWidth;
    const viewport_height = window.innerHeight;

    // Natural width of the longest line, measured with the textarea's own font and padding.
    measure_el.textContent = `${textarea_el.value || placeholder || ""}​`;
    const natural_width = Math.ceil(measure_el.getBoundingClientRect().width) + 2;

    const room_right = viewport_width - VIEWPORT_MARGIN_PX - Math.max(rect.left, VIEWPORT_MARGIN_PX);
    const width_limit = Math.max(rect.width, Math.min(max_width, room_right));
    const width = Math.min(Math.max(natural_width, rect.width), width_limit);

    let left = rect.left;
    if (left + width > viewport_width - VIEWPORT_MARGIN_PX) left = viewport_width - VIEWPORT_MARGIN_PX - width;
    left = Math.max(VIEWPORT_MARGIN_PX, left);

    frame_el.style.width = `${width}px`;
    frame_el.style.left = `${left}px`;

    // Height follows the wrapped content, measured after the width is applied.
    textarea_el.style.height = "auto";
    const height_limit = Math.max(rect.height, Math.min(max_height, viewport_height - VIEWPORT_MARGIN_PX * 2));
    const content_height = textarea_el.scrollHeight;
    const height = Math.min(Math.max(content_height, rect.height), height_limit);
    textarea_el.style.height = `${height}px`;
    textarea_el.style.overflowY = content_height > height_limit ? "auto" : "hidden";

    // Grows down from the cell, and shifts up only when the window bottom would cut it off.
    let top = rect.top;
    if (top + height > viewport_height - VIEWPORT_MARGIN_PX) top = viewport_height - VIEWPORT_MARGIN_PX - height;
    top = Math.max(VIEWPORT_MARGIN_PX, top);
    frame_el.style.top = `${top}px`;
  }, [anchor_ref, max_height, max_width, placeholder]);

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
    return () => {
      cancelAnimationFrame(frame_id);
      window.removeEventListener("scroll", scheduleLayout, true);
      window.removeEventListener("resize", scheduleLayout);
      resize_observer?.disconnect();
    };
  }, [anchor_ref, layout]);

  const insertLineBreak = (textarea_el: HTMLTextAreaElement) => {
    const { selectionStart, selectionEnd } = textarea_el;
    const next_value = `${value.slice(0, selectionStart)}\n${value.slice(selectionEnd)}`;
    onChange(next_value);
    requestAnimationFrame(() => textarea_el.setSelectionRange(selectionStart + 1, selectionStart + 1));
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
    if (allow_line_breaks && (event.shiftKey || event.altKey)) {
      // Shift+Enter is a native line break in a textarea, Alt+Enter is not, so it is inserted by hand.
      if (event.altKey) {
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
    <div ref={frame_ref} className="expanding-cell-editor" data-expanding-cell-editor="true">
      <textarea
        ref={setTextareaRef}
        value={value}
        rows={1}
        spellCheck
        aria-label={aria_label}
        placeholder={placeholder}
        onChange={(event) => onChange(allow_line_breaks ? event.target.value : event.target.value.replace(/\r?\n/g, " "))}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`expanding-cell-editor__field ${trailing ? "expanding-cell-editor__field--with-trailing" : ""} ${text_class_name}`}
      />
      {/* Off screen twin of the textarea, used to read the text's one line width. */}
      <span
        ref={measure_ref}
        aria-hidden
        className={`expanding-cell-editor__field expanding-cell-editor__measure ${trailing ? "expanding-cell-editor__field--with-trailing" : ""}`}
      />
      {trailing && <span className="expanding-cell-editor__trailing">{trailing}</span>}
    </div>,
    document.body
  );
}
