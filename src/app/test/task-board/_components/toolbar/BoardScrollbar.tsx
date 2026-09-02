"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

interface BoardScrollbarProps {
  scroll_ref: RefObject<HTMLDivElement | null>;
}

export default function BoardScrollbar({ scroll_ref }: BoardScrollbarProps) {
  const track_ref = useRef<HTMLDivElement | null>(null);
  const thumb_ref = useRef<HTMLDivElement | null>(null);
  const drag_ref = useRef<{ x: number; scroll_left: number } | null>(null);

  const syncBar = useCallback(() => {
    const el = scroll_ref.current;
    const tr = track_ref.current;
    const th = thumb_ref.current;
    if (!el || !tr || !th) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 1) {
      tr.style.opacity = "0";
      tr.style.pointerEvents = "none";
      return;
    }
    tr.style.opacity = "1";
    tr.style.pointerEvents = "auto";
    const track_w = tr.clientWidth;
    const w = Math.max(56, Math.round(track_w * (el.clientWidth / el.scrollWidth)));
    th.style.width = `${w}px`;
    th.style.left = `${Math.round((el.scrollLeft / max) * (track_w - w))}px`;
  }, [scroll_ref]);

  useEffect(() => {
    const el = scroll_ref.current;
    if (!el) return;
    syncBar();
    el.addEventListener("scroll", syncBar, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncBar) : null;
    ro?.observe(el);
    window.addEventListener("resize", syncBar);

    const onMove = (e: MouseEvent) => {
      const drag = drag_ref.current;
      const scroller = scroll_ref.current;
      const tr = track_ref.current;
      const th = thumb_ref.current;
      if (!drag || !scroller || !tr || !th) return;
      const span = tr.clientWidth - th.offsetWidth;
      if (span <= 0) return;
      scroller.scrollLeft = drag.scroll_left + (e.clientX - drag.x) * ((scroller.scrollWidth - scroller.clientWidth) / span);
    };
    const onUp = () => {
      if (drag_ref.current) {
        drag_ref.current = null;
        document.body.style.userSelect = "";
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);

    return () => {
      el.removeEventListener("scroll", syncBar);
      ro?.disconnect();
      window.removeEventListener("resize", syncBar);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [scroll_ref, syncBar]);

  const onThumbDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = scroll_ref.current;
    if (!el) return;
    drag_ref.current = { x: e.clientX, scroll_left: el.scrollLeft };
    document.body.style.userSelect = "none";
  };

  const onTrackDown = (e: React.MouseEvent) => {
    const el = scroll_ref.current;
    const tr = track_ref.current;
    const th = thumb_ref.current;
    if (!el || !tr || !th) return;
    const rect = tr.getBoundingClientRect();
    const w = th.offsetWidth;
    const span = rect.width - w;
    if (span <= 0) return;
    const pos = Math.min(Math.max(e.clientX - rect.left - w / 2, 0), span);
    el.scrollTo({ left: (pos / span) * (el.scrollWidth - el.clientWidth), behavior: "smooth" });
  };

  return (
    <div
      ref={track_ref}
      onMouseDown={onTrackDown}
      className="pointer-events-none absolute bottom-2 left-7 right-7 h-2 rounded-full opacity-0 transition-opacity"
    >
      <div ref={thumb_ref} onMouseDown={onThumbDown} className="absolute top-0 h-2 cursor-pointer rounded-full bg-[#c4cadb] hover:bg-[#a9b0c8]" />
    </div>
  );
}
