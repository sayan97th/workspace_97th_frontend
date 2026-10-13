"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DocEditorProvider, DocEditorSurface, DocToolbar } from "../../doc/editor";
import type { DocMember } from "../../doc/editor";
import type { DocCellValue } from "../types";
import "./doc-cell-modal.css";

interface DocCellModalProps {
  value: DocCellValue | null;
  /** The row's name, the title a new doc starts with. */
  item_name: string;
  members?: DocMember[];
  is_editable: boolean;
  onSave: (value: DocCellValue) => void;
  onClose: () => void;
}

/** How long typing pauses before the doc is saved to its cell. */
const SAVE_DELAY_MS = 700;

/**
 * A Doc cell opened as a centered dialog: an editable title and the same
 * Notion style editor board Docs use (toolbar, "/" blocks, "@" mentions).
 * Edits save to the cell a moment after typing stops, and on close.
 */
export default function DocCellModal({ value, item_name, members, is_editable, onSave, onClose }: DocCellModalProps) {
  const [title, setTitle] = useState(value?.title || item_name || "Untitled doc");
  const content_ref = useRef<string | null>(value?.content ?? null);
  const title_ref = useRef(title);
  const timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const is_dirty_ref = useRef(false);

  const flush = useCallback(() => {
    if (timer_ref.current) clearTimeout(timer_ref.current);
    timer_ref.current = null;
    if (!is_dirty_ref.current) return;
    is_dirty_ref.current = false;
    onSave({ title: title_ref.current.trim() || "Untitled doc", content: content_ref.current, updated_at: new Date().toISOString() });
  }, [onSave]);

  const queueSave = useCallback(() => {
    is_dirty_ref.current = true;
    if (timer_ref.current) clearTimeout(timer_ref.current);
    timer_ref.current = setTimeout(flush, SAVE_DELAY_MS);
  }, [flush]);

  const close = useCallback(() => {
    flush();
    onClose();
  }, [flush, onClose]);

  // A new doc is saved right away, so the cell shows it even if nothing is typed.
  useEffect(() => {
    if (!value && is_editable) {
      is_dirty_ref.current = true;
      flush();
    }
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // The editor's own "/" and "@" menus, the bubble menus and the media dialog close first.
      if (document.querySelector(".doc-menu-list, .doc-menu-row, .doc-dialog-overlay")) return;
      event.stopPropagation();
      close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  useEffect(() => () => {
    if (timer_ref.current) clearTimeout(timer_ref.current);
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="doc-cell-modal doc-theme" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="doc-cell-modal__dialog" role="dialog" aria-modal="true" aria-label={title}>
        <DocEditorProvider
          initial_content={value?.content ?? null}
          editable={is_editable}
          members={members}
          onChange={(content) => {
            content_ref.current = content;
            queueSave();
          }}
          onBlur={flush}
        >
          <header className="doc-cell-modal__header">
            <span className="doc-cell-modal__icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.25 2.75h5l2.5 2.5v8h-7.5z" />
                <path d="M6.25 8h3.5M6.25 10.5h3.5" />
              </svg>
            </span>
            <span className="doc-cell-modal__context">{item_name}</span>
            <button type="button" aria-label="Close doc" onClick={close} className="doc-cell-modal__close">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          {is_editable && (
            <div className="doc-cell-modal__toolbar">
              <DocToolbar />
            </div>
          )}
          <div className="doc-cell-modal__body">
            <input
              value={title}
              readOnly={!is_editable}
              onChange={(event) => {
                setTitle(event.target.value);
                title_ref.current = event.target.value;
                queueSave();
              }}
              onBlur={flush}
              placeholder="Untitled doc"
              aria-label="Doc title"
              className="doc-cell-modal__title"
            />
            <DocEditorSurface className="doc-cell-modal__surface" />
          </div>
        </DocEditorProvider>
      </div>
    </div>,
    document.body
  );
}
