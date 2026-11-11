"use client";
import React, { useEffect, useRef, useState } from "react";
import type { CommentDraftRecord } from "@/lib/comment-drafts";
import { formatRelativeTime } from "./commentMapping";
import "./composer-draft.scss";

export type ComposerDraftStatusProps = {
  draft: CommentDraftRecord;
  onDiscard: () => void;
  /** Reply boxes are narrow: the label shortens to "Draft" and the time moves into the tooltip. */
  compact?: boolean;
};

/** How often the "5m ago" part refreshes while the composer stays open. */
const RELATIVE_TIME_TICK_MS = 30000;

/** A pencil drawing a line, the draft glyph. */
const DraftPencilIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M10.6 2.6a1.6 1.6 0 0 1 2.3 2.3L6 11.8l-3 .8.8-3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M9.4 3.8l2.3 2.3M8.5 13.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

/** A cloud with a slash, the draft only lives in this browser for now. */
const CloudOffIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M5 12.5h6.3a2.7 2.7 0 0 0 .6-5.3A4 4 0 0 0 5.2 5.5M3.7 6.8A2.9 2.9 0 0 0 5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M2.5 2.5l11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2.8 4.3h10.4M6.3 4.3V3a.8.8 0 0 1 .8-.8h1.8a.8.8 0 0 1 .8.8v1.3M4.2 4.3l.6 8.6a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9l.6-8.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.7 7v4M9.3 7v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/** Re-renders every {@link RELATIVE_TIME_TICK_MS}, so "Just now" turns into "1m" on its own. */
const useNowTick = (): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), RELATIVE_TIME_TICK_MS);
    return () => clearInterval(interval);
  }, []);
  return now;
};

/**
 * The quiet "Draft saved" pill in a composer's action row, Slack and monday
 * style: it says the text is safe (or still being saved, or only kept on this
 * device while offline), when it was last saved, and offers Discard. A draft
 * that was already there when the composer opened reads "Draft restored", so
 * coming back to an item makes it clear the text was kept on purpose.
 */
const ComposerDraftStatus: React.FC<ComposerDraftStatusProps> = ({ draft, onDiscard, compact = false }) => {
  useNowTick();
  // Drafts last changed before this composer mounted were restored, not typed just now.
  const mounted_at_ref = useRef(Date.now());
  const is_restored = draft.updated_at < mounted_at_ref.current && draft.status === "saved";
  const relative_time = formatRelativeTime(new Date(draft.updated_at).toISOString());
  const time_suffix = relative_time === "Just now" ? "" : ` ${relative_time} ago`;

  let tone: "saving" | "saved" | "offline" = "saved";
  let label = is_restored ? "Draft restored" : "Draft saved";
  let tooltip = `Your draft is saved${time_suffix ? `, last change${time_suffix}` : ""}. It will be here when you come back.`;
  if (draft.status === "pending" || draft.status === "saving") {
    tone = "saving";
    label = "Saving draft";
    tooltip = "Saving your draft...";
  } else if (draft.status === "offline") {
    tone = "offline";
    label = compact ? "On this device" : "Saved on this device";
    tooltip = "We could not reach the server. Your draft is kept in this browser and will sync once you are back online.";
  }

  const show_time = !compact && tone === "saved" && time_suffix !== "";

  return (
    <span className="composer-draft" data-compact={compact ? "true" : undefined}>
      <span className="composer-draft__pill" data-tone={tone} title={tooltip} role="status" aria-live="polite">
        <span className="composer-draft__icon">{tone === "offline" ? <CloudOffIcon /> : tone === "saving" ? <span className="composer-draft__dot" /> : <DraftPencilIcon />}</span>
        <span className="composer-draft__label">{compact && tone !== "offline" ? (tone === "saving" ? "Saving" : "Draft") : label}</span>
        {show_time && <span className="composer-draft__time">· {relative_time}</span>}
      </span>
      <button type="button" onClick={onDiscard} className="composer-draft__discard" aria-label="Discard draft" title="Discard draft">
        <TrashIcon />
      </button>
    </span>
  );
};

export default ComposerDraftStatus;
