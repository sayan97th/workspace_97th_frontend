"use client";

import { useState } from "react";
import type { DependencyLinkInput, DependencyLinkType } from "../types";
import PopoverPanel from "./PopoverPanel";

/** One predecessor already linked, as the popover shows it. */
export interface DependencyMenuLink {
  id: string;
  name: string;
  type: DependencyLinkType;
  lag_days: number;
  /** The predecessor's own date on the scheduled column, already formatted, or null when it has none. */
  date_label: string | null;
}

interface DependencyMenuProps {
  candidates: { id: string; name: string }[];
  links: DependencyMenuLink[];
  /** Whether the scheduled column is a Timeline, the only kind where a link's type matters. */
  is_timeline: boolean;
  /** Why dates will not move by themselves (no date column picked, or "No action" mode), shown above the links. Null while scheduling works. */
  schedule_notice: string | null;
  /** The whole new list of links. Only a link the user just changed carries its `type`/`lag_days`, the others keep what the server has. */
  onChange: (links: DependencyLinkInput[]) => void;
  onClose: () => void;
}

/** Timeline link types, worded from the dependent item's point of view. */
const TIMELINE_TYPE_OPTIONS: { type: DependencyLinkType; label: string }[] = [
  { type: "fs", label: "Starts after it ends" },
  { type: "ss", label: "Starts when it starts" },
  { type: "ff", label: "Ends when it ends" },
  { type: "sf", label: "Ends when it starts" },
];

const MAX_LAG_DAYS = 730;

/** "Same day", "7 days after", "1 day before": the offset as the cell and the popover say it. */
export function describeLag(lag_days: number): string {
  if (lag_days === 0) return "Same day";
  const days = Math.abs(lag_days);
  return `${days} ${days === 1 ? "day" : "days"} ${lag_days > 0 ? "after" : "before"}`;
}

/** One linked predecessor: its name and date, then how many days before or after it this item is scheduled. */
function LinkRow({ link, is_timeline, onPatch, onRemove }: { link: DependencyMenuLink; is_timeline: boolean; onPatch: (patch: { type?: DependencyLinkType; lag_days?: number }) => void; onRemove: () => void }) {
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

  return (
    <div className="rounded-[8px] border border-boardtree-border-soft px-2.5 py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-boardtree-text" title={link.name}>{link.name}</div>
          <div className="text-[11.5px] text-boardtree-text-faint">{link.date_label ?? "No date yet"}</div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove dependency on ${link.name}`}
          className="flex h-6 w-6 flex-none items-center justify-center rounded-[5px] text-boardtree-text-faint hover:bg-boardtree-hover hover:text-boardtree-text"
        >
          <svg viewBox="0 0 12 12" width="10" height="10"><path d="M3 3 L9 9 M9 3 L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      {is_timeline && (
        <select
          value={link.type}
          onChange={(e) => onPatch({ type: e.target.value as DependencyLinkType })}
          aria-label={`How this item follows ${link.name}`}
          className="mt-1.5 h-7 w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface px-1.5 text-[12px] text-boardtree-text outline-none focus:border-boardtree-accent"
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
          className="h-7 w-16 rounded-[6px] border border-boardtree-border px-1.5 text-[12.5px] text-boardtree-text outline-none focus:border-boardtree-accent"
        />
        <select
          value={direction}
          onChange={(e) => commit(e.target.value as "after" | "before")}
          aria-label={`Before or after ${link.name}`}
          className="h-7 flex-1 rounded-[6px] border border-boardtree-border bg-boardtree-surface px-1.5 text-[12px] text-boardtree-text outline-none focus:border-boardtree-accent"
        >
          <option value="after">{Number(draft) === 1 ? "day after" : "days after"}</option>
          <option value="before">{Number(draft) === 1 ? "day before" : "days before"}</option>
        </select>
      </div>
    </div>
  );
}

/**
 * A Dependency cell's popover: the items this one depends on, each with how many days before or
 * after it this item is scheduled, then a search to link more. Mirrors monday.com's Dependency
 * column, where a link's lag keeps "Write show notes" a week after "Record Episode".
 */
export default function DependencyMenu({ candidates, links, is_timeline, schedule_notice, onChange, onClose }: DependencyMenuProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const linked_ids = new Set(links.map((link) => link.id));
  const filtered = candidates.filter((candidate) => !linked_ids.has(candidate.id) && candidate.name.toLowerCase().includes(q));

  const ids = links.map((link) => ({ predecessor_id: link.id }));
  const patchLink = (id: string, patch: { type?: DependencyLinkType; lag_days?: number }) =>
    onChange(ids.map((entry) => (entry.predecessor_id === id ? { ...entry, ...patch } : entry)));
  const removeLink = (id: string) => onChange(ids.filter((entry) => entry.predecessor_id !== id));
  const addLink = (id: string) => {
    onChange([...ids, { predecessor_id: id }]);
    setQuery("");
  };

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[320px] -translate-x-1/2 p-3 pb-2.5">
      {schedule_notice && (
        <div className="mb-2.5 rounded-[6px] bg-boardtree-hover px-2.5 py-1.5 text-[11.5px] leading-snug text-boardtree-text-muted">{schedule_notice}</div>
      )}
      {links.length > 0 && (
        <>
          <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Depends on</div>
          <div className="mb-3 flex max-h-[260px] flex-col gap-1.5 overflow-y-auto">
            {links.map((link) => (
              <LinkRow key={link.id} link={link} is_timeline={is_timeline} onPatch={(patch) => patchLink(link.id, patch)} onRemove={() => removeLink(link.id)} />
            ))}
          </div>
        </>
      )}
      <input
        autoFocus={links.length === 0}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={links.length > 0 ? "Add another item" : "Search items this one depends on"}
        className="mb-2 h-8 w-full border-b border-boardtree-border px-1 text-[13px] text-boardtree-text outline-none"
      />
      <div className="flex max-h-[180px] flex-col gap-0.5 overflow-y-auto">
        {filtered.map((candidate) => (
          <button
            type="button"
            key={candidate.id}
            onClick={() => addLink(candidate.id)}
            className="flex items-center gap-2.5 rounded-[5px] px-2.5 py-1.5 hover:bg-boardtree-hover"
          >
            <span className="min-w-0 flex-1 truncate text-left text-[13px] text-boardtree-text">{candidate.name}</span>
            <svg viewBox="0 0 12 12" width="11" height="11" className="flex-none text-boardtree-text-faint"><path d="M6 2.5 V9.5 M2.5 6 H9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="px-1.5 pb-1.5 pt-1.5 text-[12.5px] text-boardtree-text-faint">
          {candidates.length === 0 ? "No other items to depend on yet." : q ? "No matches" : "Every item is already linked."}
        </div>
      )}
    </PopoverPanel>
  );
}
