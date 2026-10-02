"use client";

import { useState } from "react";
import type { DependencyLinkInput, DependencyLinkType } from "../types";
import DependencyLinkRow, { type DependencyMenuLink } from "./DependencyLinkRow";
import PopoverPanel from "./PopoverPanel";

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
              <DependencyLinkRow key={link.id} link={link} is_timeline={is_timeline} onPatch={(patch) => patchLink(link.id, patch)} onRemove={() => removeLink(link.id)} />
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
