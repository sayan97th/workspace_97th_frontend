"use client";

import { useState } from "react";
import type { DependencyLinkType } from "../types";

/** One predecessor already linked, as the cell popover and the item drawer show it. */
export interface DependencyMenuLink {
  id: string;
  name: string;
  type: DependencyLinkType;
  lag_days: number;
  /** The predecessor's own date on the scheduled column, already formatted, or null when it has none. */
  date_label: string | null;
}

/** Timeline link types, worded from the dependent item's point of view. */
export const TIMELINE_TYPE_OPTIONS: { type: DependencyLinkType; label: string }[] = [
  { type: "fs", label: "Starts after it ends" },
  { type: "ss", label: "Starts when it starts" },
  { type: "ff", label: "Ends when it ends" },
  { type: "sf", label: "Ends when it starts" },
];

export const MAX_LAG_DAYS = 730;

/** "Same day", "7 days after", "1 day before": the offset as the cell and the popover say it. */
export function describeLag(lag_days: number): string {
  if (lag_days === 0) return "Same day";
  const days = Math.abs(lag_days);
  return `${days} ${days === 1 ? "day" : "days"} ${lag_days > 0 ? "after" : "before"}`;
}

/** The table's popover and the item drawer sit on different surfaces, each row follows its host's tokens. */
const PALETTES = {
  table: {
    card: "border-boardtree-border-soft",
    name: "text-boardtree-text",
    faint: "text-boardtree-text-faint",
    control: "border-boardtree-border bg-boardtree-surface text-boardtree-text focus:border-boardtree-accent",
    remove: "text-boardtree-text-faint hover:bg-boardtree-hover hover:text-boardtree-text",
  },
  drawer: {
    card: "border-shell-border",
    name: "text-shell-text",
    faint: "text-shell-text-faint",
    control: "border-shell-border-strong bg-shell-panel text-shell-text focus:border-boardtree-accent",
    remove: "text-shell-text-faint hover:bg-shell-hover hover:text-shell-text",
  },
} as const;

interface DependencyLinkRowProps {
  link: DependencyMenuLink;
  /** Whether the scheduled column is a Timeline, the only kind where a link's type matters. */
  is_timeline: boolean;
  palette?: keyof typeof PALETTES;
  /** Read only viewers see the link and its offset without the controls to change them. */
  is_read_only?: boolean;
  onPatch: (patch: { type?: DependencyLinkType; lag_days?: number }) => void;
  onRemove: () => void;
}

/** One linked predecessor: its name and date, then how many days before or after it the item is scheduled. */
export default function DependencyLinkRow({ link, is_timeline, palette = "table", is_read_only = false, onPatch, onRemove }: DependencyLinkRowProps) {
  const tone = PALETTES[palette];
  const [draft, setDraft] = useState(String(Math.abs(link.lag_days)));
  const direction = link.lag_days < 0 ? "before" : "after";

  // Picks up a lag the server changed (another edit, a manual date move) while this row stayed open.
  const [synced_lag, setSyncedLag] = useState(link.lag_days);
  if (synced_lag !== link.lag_days) {
    setSyncedLag(link.lag_days);
    setDraft(String(Math.abs(link.lag_days)));
  }

  const commit = (next_direction: "after" | "before" = direction) => {
    const parsed = Math.min(MAX_LAG_DAYS, Math.max(0, Math.round(Number(draft) || 0)));
    setDraft(String(parsed));
    const next_lag = next_direction === "before" ? -parsed : parsed;
    if (next_lag !== link.lag_days) onPatch({ lag_days: next_lag });
  };

  const type_label = TIMELINE_TYPE_OPTIONS.find((option) => option.type === link.type)?.label;

  return (
    <div className={`rounded-[8px] border px-2.5 py-2 ${tone.card}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[13px] font-medium ${tone.name}`} title={link.name}>{link.name}</div>
          <div className={`text-[11.5px] ${tone.faint}`}>{link.date_label ?? "No date yet"}</div>
        </div>
        {!is_read_only && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove dependency on ${link.name}`}
            className={`flex h-6 w-6 flex-none items-center justify-center rounded-[5px] ${tone.remove}`}
          >
            <svg viewBox="0 0 12 12" width="10" height="10"><path d="M3 3 L9 9 M9 3 L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        )}
      </div>
      {is_read_only ? (
        <div className={`mt-1 text-[12px] ${tone.faint}`}>
          {is_timeline && type_label ? `${type_label}, ` : ""}
          {describeLag(link.lag_days).toLowerCase()}
        </div>
      ) : (
        <>
          {is_timeline && (
            <select
              value={link.type}
              onChange={(e) => onPatch({ type: e.target.value as DependencyLinkType })}
              aria-label={`How this item follows ${link.name}`}
              className={`mt-1.5 h-7 w-full rounded-[6px] border px-1.5 text-[12px] outline-none ${tone.control}`}
            >
              {TIMELINE_TYPE_OPTIONS.map((option) => (
                <option key={option.type} value={option.type}>{option.label}</option>
              ))}
            </select>
          )}
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={MAX_LAG_DAYS}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commit()}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              aria-label={`Days from ${link.name}`}
              className={`h-7 w-16 rounded-[6px] border px-1.5 text-[12.5px] outline-none ${tone.control}`}
            />
            <select
              value={direction}
              onChange={(e) => commit(e.target.value as "after" | "before")}
              aria-label={`Before or after ${link.name}`}
              className={`h-7 flex-1 rounded-[6px] border px-1.5 text-[12px] outline-none ${tone.control}`}
            >
              <option value="after">{Number(draft) === 1 ? "day after" : "days after"}</option>
              <option value="before">{Number(draft) === 1 ? "day before" : "days before"}</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
