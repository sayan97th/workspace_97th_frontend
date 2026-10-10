"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { useOutsideClick } from "../table/useOutsideClick";
import type { SlackMessageField } from "./slack/slackMessageTokens";

/** One insert button of the message popover. */
export function FieldChip({ field, onInsert }: { field: SlackMessageField; onInsert: (field: SlackMessageField) => void }) {
  return (
    <button type="button" onClick={() => onInsert(field)} title={`Insert ${field.label}`} className="rounded-[4px] border border-boardtree-border px-3 py-1 text-[13px] text-boardtree-text hover:border-boardtree-accent hover:text-boardtree-accent">
      {field.label}
    </button>
  );
}

/** Space kept between a popover and the edge of the flow it opens in. */
const EDGE_GAP_PX = 16;

/** One clickable word of an integration recipe sentence (Slack, Gmail, Outlook, Google Calendar), its picker opens in a white popover right under it. */
export function SentenceToken({ label, is_set, is_optional = false, aria_label, width = 280, onOpen, children }: { label: string; is_set: boolean; is_optional?: boolean; aria_label: string; width?: number; onOpen?: () => void; children: (close: () => void) => React.ReactNode }) {
  const [is_open, setIsOpen] = useState(false);
  const ref = useOutsideClick<HTMLSpanElement>(is_open, () => setIsOpen(false));
  const popover_ref = useRef<HTMLDivElement>(null);
  const [shift_px, setShiftPx] = useState(0);
  const close = () => setIsOpen(false);

  // A word near the right end of a line would open its popover past the dialog, it is moved left to fit.
  useLayoutEffect(() => {
    const popover = popover_ref.current;
    if (!is_open || !popover) {
      setShiftPx(0);
      return;
    }
    const bounds = popover.closest('[role="region"]')?.getBoundingClientRect() ?? { left: 0, right: window.innerWidth };
    const rect = popover.getBoundingClientRect();
    const overflow = rect.right - shift_px - (bounds.right - EDGE_GAP_PX);
    const room_left = rect.left - shift_px - (bounds.left + EDGE_GAP_PX);
    setShiftPx(overflow > 0 ? Math.min(overflow, Math.max(room_left, 0)) : 0);
    // Measured once per opening, the shift itself must not trigger another measure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open, width]);

  const tone = is_open
    ? "border-[#4ba7ff] text-[#4ba7ff]"
    : is_set
      ? "border-white text-white hover:border-[#4ba7ff] hover:text-[#4ba7ff]"
      : is_optional
        ? "border-white/45 text-white/55 hover:border-[#4ba7ff] hover:text-[#4ba7ff]"
        : "border-white/80 text-white/80 hover:border-[#4ba7ff] hover:text-[#4ba7ff]";

  return (
    <span ref={ref} className="relative inline-block">
      <button type="button" aria-haspopup="dialog" aria-expanded={is_open} aria-label={`${aria_label}: ${label}`} onClick={() => {
          if (!is_open) onOpen?.();
          setIsOpen(!is_open);
        }} className={`border-b-2 pb-1 leading-[1.15] transition-colors ${tone}`}>
        {label}
      </button>
      {is_open && (
        <div
          role="dialog"
          aria-label={aria_label}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
          ref={popover_ref}
          style={{ width, transform: shift_px ? `translateX(-${shift_px}px)` : undefined }}
          className="absolute left-0 top-full z-40 mt-3 max-w-[86vw] rounded-[6px] bg-boardtree-surface p-2 text-left text-[13px] font-normal leading-normal text-boardtree-text shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
        >
          {children(close)}
        </div>
      )}
    </span>
  );
}
