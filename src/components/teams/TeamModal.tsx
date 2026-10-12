"use client";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type TeamModalProps = {
  is_open: boolean;
  title: string;
  onClose: () => void;
  /** Shown before the title, like monday's team glyph on "Create new team". */
  icon?: React.ReactNode;
  /** Smaller heading for short dialogs such as "Add users". */
  is_compact?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Dialog frame shared by every Teams dialog: monday's white rounded card with a large title,
 * a close button, the body and a right aligned footer. Escape and a click on the dimmed
 * backdrop close it. Portaled to `document.body` so it never inherits the page's scroll.
 */
const TeamModal: React.FC<TeamModalProps> = ({ is_open, title, onClose, icon, is_compact = false, footer, children }) => {
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open || typeof document === "undefined") return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="teams-modal-root teams-theme">
      <div className="teams-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="teams-modal">
        <div className="teams-modal-header">
          {icon}
          <h2 className={`teams-modal-title${is_compact ? " teams-modal-title-sm" : ""}`}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="teams-icon-button teams-modal-close">
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="teams-modal-body">{children}</div>
        {footer ? <div className="teams-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
};

export default TeamModal;
