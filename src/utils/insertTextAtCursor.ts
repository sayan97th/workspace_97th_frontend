/**
 * Splices `insert` into `text` at `cursor_index`, clamping the index to a
 * valid range so a stale/out-of-bounds cursor position (the caret moved
 * since it was captured) can never throw or silently drop the insertion.
 */
export function spliceTextAtCursor(
  text: string,
  insert: string,
  cursor_index: number
): { next_text: string; next_cursor: number } {
  const safe_index = Math.max(0, Math.min(cursor_index, text.length));
  const next_text = text.slice(0, safe_index) + insert + text.slice(safe_index);
  return { next_text, next_cursor: safe_index + insert.length };
}
