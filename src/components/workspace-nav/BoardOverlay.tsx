"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import type { WorkspaceNavNode } from "@/types/workspace";
import { CloseIcon, OpenInNewTabIcon } from "@/icons/workspace-icons";
import NavItemIcon from "./NavItemIcon";
import { getLeafHref } from "./helpers";

export type BoardOverlayProps = {
  /** The board to show, null while closed. */
  node: WorkspaceNavNode | null;
  onClose: () => void;
};

/**
 * monday.com's "Open in overlay": the board opens in a large panel above the
 * current page, so it can be checked without leaving it. The board runs in a
 * same origin frame (the app drops its shell there, see `useIsEmbedded`),
 * which keeps its own URL changes (tabs, item drawer, filters) inside the
 * overlay instead of rewriting the page underneath. Escape, the backdrop or
 * the close button dismiss it, "Open in new tab" pops it out.
 */
const BoardOverlayPanel: React.FC<{ node: WorkspaceNavNode; onClose: () => void }> = ({ node, onClose }) => {
  const pathname = usePathname();
  const [is_loaded, setIsLoaded] = useState(false);
  // The page the overlay was opened on; it closes when the page underneath navigates away.
  const [opened_on] = useState(pathname);

  useEffect(() => {
    if (pathname !== opened_on) onClose();
  }, [pathname, opened_on, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previous_overflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const href = getLeafHref(node);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={node.label} className="fixed inset-0 z-[400] flex p-3 sm:p-6 lg:px-10 lg:py-8">
      <div className="absolute inset-0 bg-[#060e0e]/[0.55]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[401] flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-bg shadow-2xl">
        <div className="flex h-12 flex-none items-center gap-2.5 border-b border-shell-border bg-shell-panel pl-4 pr-2 text-shell-text">
          <NavItemIcon source={node} size={16} className="text-shell-text-muted" />
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{node.label}</span>
          <a
            href={href}
            target="_blank"
            rel="noopener"
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-shell-text-secondary transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <OpenInNewTabIcon size={15} />
            <span className="hidden sm:inline">Open in new tab</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close overlay"
            title="Close (Esc)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          {!is_loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-shell-bg">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          )}
          <iframe
            src={href}
            title={node.label}
            onLoad={() => setIsLoaded(true)}
            className="h-full w-full border-0 bg-shell-bg"
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

/** Remounted per board (keyed by id), so each one starts with its own spinner. */
const BoardOverlay: React.FC<BoardOverlayProps> = ({ node, onClose }) =>
  node && typeof document !== "undefined" ? <BoardOverlayPanel key={node.id} node={node} onClose={onClose} /> : null;

export default BoardOverlay;
