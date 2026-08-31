"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface StickyHorizontalScrollProps {
  /** The wide, horizontally-overflowing board content (group headings + tables). */
  children: ReactNode;
  /** Classes for the outer, non-scrolling wrapper (e.g. horizontal padding). */
  className?: string;
  /** Classes for the sticky scrollbar strip itself — background/border, themed per caller. */
  scrollbarClassName?: string;
}

/**
 * Wraps wide board content with a copy of its horizontal scrollbar pinned to
 * the bottom of the nearest scrolling ancestor, so the scrollbar stays
 * reachable without first scrolling past every table. The real scroll
 * container keeps native wheel/trackpad/keyboard behavior — only its own
 * scrollbar is hidden in favor of this synced one, which floats over
 * whatever row is currently at the bottom of the view instead of reserving
 * permanent space.
 */
const StickyHorizontalScroll = ({ children, className = "", scrollbarClassName = "" }: StickyHorizontalScrollProps) => {
  const content_ref = useRef<HTMLDivElement | null>(null);
  const scrollbar_ref = useRef<HTMLDivElement | null>(null);
  const syncing_from = useRef<"content" | "scrollbar" | null>(null);
  const [content_width, setContentWidth] = useState(0);
  const [visible_width, setVisibleWidth] = useState(0);

  // Re-measure after every render — cheap (two property reads) and catches
  // content-width changes (columns/rows added or removed) without needing a
  // subtree MutationObserver.
  useEffect(() => {
    const content_el = content_ref.current;
    if (!content_el) return;
    if (content_el.scrollWidth !== content_width) setContentWidth(content_el.scrollWidth);
    if (content_el.clientWidth !== visible_width) setVisibleWidth(content_el.clientWidth);
  });

  // Catches viewport-driven width changes (window resize, sidebar toggle)
  // that don't come from a React re-render.
  useEffect(() => {
    const content_el = content_ref.current;
    if (!content_el) return;
    const observer = new ResizeObserver(() => {
      setVisibleWidth(content_el.clientWidth);
      setContentWidth(content_el.scrollWidth);
    });
    observer.observe(content_el);
    return () => observer.disconnect();
  }, []);

  const handleContentScroll = () => {
    if (syncing_from.current === "scrollbar") {
      syncing_from.current = null;
      return;
    }
    if (!content_ref.current || !scrollbar_ref.current) return;
    syncing_from.current = "content";
    scrollbar_ref.current.scrollLeft = content_ref.current.scrollLeft;
  };

  const handleScrollbarScroll = () => {
    if (syncing_from.current === "content") {
      syncing_from.current = null;
      return;
    }
    if (!content_ref.current || !scrollbar_ref.current) return;
    syncing_from.current = "scrollbar";
    content_ref.current.scrollLeft = scrollbar_ref.current.scrollLeft;
  };

  const needs_scrollbar = content_width > visible_width + 1;

  return (
    <div className={className}>
      <div ref={content_ref} onScroll={handleContentScroll} className="no-scrollbar overflow-x-auto">
        {children}
      </div>
      {needs_scrollbar && (
        <div
          ref={scrollbar_ref}
          onScroll={handleScrollbarScroll}
          className={`shell-scrollbar sticky bottom-0 z-10 overflow-x-auto overflow-y-hidden ${scrollbarClassName}`}
          style={{ height: 14 }}
        >
          <div style={{ width: content_width, height: 1 }} />
        </div>
      )}
    </div>
  );
};

export default StickyHorizontalScroll;
