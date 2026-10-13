"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ListTree, Moon, Sun, X } from "lucide-react";
import { DocEditorProvider, DocEditorSurface, DocOutline } from "../editor";
import "../doc-page.css";

type PresentationTheme = "light" | "dark";

export type DocPresentationModeProps = {
  is_open: boolean;
  onClose: () => void;
  /** The doc body to present (editor JSON as a string), read once when the mode opens. */
  content: string | null;
  /** Title row and meta row shown above the body. */
  heading: React.ReactNode;
};

const noop = () => undefined;

/**
 * monday.com's doc "Presentation" mode: the doc alone on a full screen page,
 * read only, with the outline toggle on the left and a light/dark switch and
 * close button on the right. Uses the browser's full screen when allowed,
 * leaving full screen (Escape) closes the mode.
 */
const DocPresentationMode: React.FC<DocPresentationModeProps> = ({ is_open, onClose, content, heading }) => {
  const root_ref = useRef<HTMLDivElement>(null);
  const on_close_ref = useRef(onClose);
  const [theme, setTheme] = useState<PresentationTheme>("light");
  const [is_outline_open, setIsOutlineOpen] = useState(false);
  const [session_key, setSessionKey] = useState(0);

  useEffect(() => {
    on_close_ref.current = onClose;
  });

  useEffect(() => {
    if (!is_open) return;
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setIsOutlineOpen(false);
    setSessionKey((current) => current + 1);

    const root = root_ref.current;
    root?.requestFullscreen?.().catch(() => undefined);

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) on_close_ref.current();
    };
    // Outside full screen (blocked by the browser), Escape still closes the mode.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) on_close_ref.current();
    };
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, [is_open]);

  if (!is_open || typeof document === "undefined") return null;

  return createPortal(
    <div ref={root_ref} className="doc-theme doc-presentation" data-theme={theme} role="dialog" aria-modal="true" aria-label="Presentation">
      <DocEditorProvider key={session_key} initial_content={content} onChange={noop} editable={false}>
        <aside className="doc-presentation-side">
          <button
            type="button"
            className={`doc-icon-button${is_outline_open ? " is-active" : ""}`}
            aria-label={is_outline_open ? "Hide outline" : "Show outline"}
            title={is_outline_open ? "Hide outline" : "Show outline"}
            aria-pressed={is_outline_open}
            onClick={() => setIsOutlineOpen((current) => !current)}
          >
            <ListTree size={18} />
          </button>
          {is_outline_open && <DocOutline />}
        </aside>

        <div className="doc-presentation-actions">
          <button
            type="button"
            className="doc-icon-button"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button type="button" className="doc-icon-button" aria-label="Exit presentation" title="Exit presentation" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="doc-presentation-scroll">
          <div className="doc-presentation-page">
            {heading}
            <DocEditorSurface />
          </div>
        </div>
      </DocEditorProvider>
    </div>,
    document.body
  );
};

export default DocPresentationMode;
