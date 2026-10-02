"use client";

import { useState } from "react";
import DependencyLinkRow, { describeLag, type DependencyMenuLink } from "@/components/board/table/menus/DependencyLinkRow";
import { DEPENDENCY_MODE_OPTIONS } from "@/components/board/table/menus/DependencySettingsPanel";
import type { DependencyLinkInput, DependencyLinkType, DependencyMode } from "@/components/board/table/types";

/** An item scheduled from the open one: its name, date and how far after (or before) the open item it sits. */
export interface ItemDependent {
  id: string;
  name: string;
  lag_days: number;
  date_label: string | null;
}

/** One Dependency column of the open item's table, everything its section shows. */
export interface ItemDependencySection {
  column_id: string;
  column_title: string;
  /** The Date or Timeline column it schedules, null when none is picked yet. */
  date_column: { title: string; kind: "date" | "timeline" } | null;
  mode: DependencyMode;
  /** The open item's own date on that column, already formatted. */
  own_date_label: string | null;
  /** What the open item depends on. */
  links: DependencyMenuLink[];
  /** What depends on the open item. */
  dependents: ItemDependent[];
  /** Rows the open item may still depend on, without closing a loop. */
  candidates: { id: string; name: string }[];
  /** Column permissions: the viewer may see this column's links but not change them. */
  is_read_only?: boolean;
}

interface ItemDependenciesPanelProps {
  sections: ItemDependencySection[];
  can_edit: boolean;
  /** The column's whole new list of links, same contract as the cell popover. */
  onChangeLinks: (column_id: string, links: DependencyLinkInput[]) => void;
  /** Opens another item in the drawer. Omit to show dependents as plain text. */
  onOpenItem?: (item_id: string) => void;
}

const SECTION_LABEL = "mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-shell-text-faint";

/** Search box plus results to link one more predecessor. */
function AddPredecessor({ candidates, onPick }: { candidates: { id: string; name: string }[]; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q ? candidates.filter((candidate) => candidate.name.toLowerCase().includes(q)).slice(0, 8) : [];

  return (
    <div className="mt-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={candidates.length === 0 ? "No other items to depend on yet" : "Search an item this one depends on"}
        disabled={candidates.length === 0}
        aria-label="Add a dependency"
        className="h-9 w-full rounded-[8px] border border-shell-border-strong bg-shell-panel px-3 text-[13px] text-shell-text outline-none placeholder:text-shell-text-faint focus:border-boardtree-accent disabled:opacity-60"
      />
      {q && (
        <div className="mt-1 flex flex-col gap-0.5 rounded-[8px] border border-shell-border p-1">
          {matches.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => {
                onPick(candidate.id);
                setQuery("");
              }}
              className="flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left text-[13px] text-shell-text hover:bg-shell-hover"
            >
              <span className="min-w-0 flex-1 truncate">{candidate.name}</span>
              <svg viewBox="0 0 12 12" width="11" height="11" className="flex-none text-shell-text-faint"><path d="M6 2.5 V9.5 M2.5 6 H9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </button>
          ))}
          {matches.length === 0 && <div className="px-2.5 py-1.5 text-[12.5px] text-shell-text-faint">No matches</div>}
        </div>
      )}
    </div>
  );
}

/**
 * The item drawer's Dependencies tab, monday.com style: for each Dependency column of the item's
 * table, what the item depends on (with each link's offset in days, editable) and which items
 * depend on it. Editing a link here reschedules the item and everything after it, exactly like
 * the table's Dependency cell.
 */
export default function ItemDependenciesPanel({ sections, can_edit, onChangeLinks, onOpenItem }: ItemDependenciesPanelProps) {
  if (sections.length === 0) {
    return (
      <div className="px-6 py-5 text-[13px] leading-relaxed text-shell-text-muted">
        This table has no Dependency column yet. Add one from the column menu to schedule this item a number of days before or after other items.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      {sections.map((section) => {
        const ids = section.links.map((link) => ({ predecessor_id: link.id }));
        const change = (links: DependencyLinkInput[]) => onChangeLinks(section.column_id, links);
        const patchLink = (id: string, patch: { type?: DependencyLinkType; lag_days?: number }) =>
          change(ids.map((entry) => (entry.predecessor_id === id ? { ...entry, ...patch } : entry)));
        const mode_label = DEPENDENCY_MODE_OPTIONS.find((option) => option.mode === section.mode)?.label ?? "No action";
        const is_timeline = section.date_column?.kind === "timeline";
        const is_editable = can_edit && !section.is_read_only;

        return (
          <section key={section.column_id} className="mb-7 last:mb-0">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="m-0 text-[15px] font-semibold text-shell-text">{section.column_title}</h3>
              <span className="text-[12px] text-shell-text-faint">
                {section.date_column ? `Schedules ${section.date_column.title}, ${mode_label}` : "No date column picked yet"}
              </span>
            </div>

            {section.date_column && (
              <div className="mb-4 rounded-[8px] bg-shell-hover px-3 py-2 text-[12.5px] text-shell-text-secondary">
                {section.date_column.title} of this item: <span className="font-semibold text-shell-text">{section.own_date_label ?? "No date yet"}</span>
                {section.mode === "none" && <span className="block pt-0.5 text-shell-text-faint">This column is set to No action, so dates will not move by themselves.</span>}
              </div>
            )}

            <div className={SECTION_LABEL}>Depends on</div>
            {section.links.length === 0 && <div className="pb-1 text-[13px] text-shell-text-muted">This item does not depend on any other item.</div>}
            <div className="flex flex-col gap-1.5">
              {section.links.map((link) => (
                <DependencyLinkRow
                  key={link.id}
                  link={link}
                  is_timeline={is_timeline}
                  palette="drawer"
                  is_read_only={!is_editable}
                  onPatch={(patch) => patchLink(link.id, patch)}
                  onRemove={() => change(ids.filter((entry) => entry.predecessor_id !== link.id))}
                />
              ))}
            </div>
            {is_editable && <AddPredecessor candidates={section.candidates.filter((candidate) => !section.links.some((link) => link.id === candidate.id))} onPick={(id) => change([...ids, { predecessor_id: id }])} />}

            <div className={`${SECTION_LABEL} mt-5`}>Items that depend on this one</div>
            {section.dependents.length === 0 ? (
              <div className="text-[13px] text-shell-text-muted">No item depends on this one yet.</div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {section.dependents.map((dependent) => {
                  const body = (
                    <>
                      <span className="min-w-0 flex-1 truncate text-shell-text">{dependent.name}</span>
                      <span className="flex-none text-shell-text-faint">{describeLag(dependent.lag_days)}</span>
                      <span className="w-[104px] flex-none text-right text-shell-text-secondary">{dependent.date_label ?? "No date"}</span>
                    </>
                  );
                  return (
                    <li key={dependent.id}>
                      {onOpenItem ? (
                        <button type="button" onClick={() => onOpenItem(dependent.id)} className="flex w-full items-center gap-3 rounded-[6px] px-2.5 py-1.5 text-left text-[13px] hover:bg-shell-hover">
                          {body}
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 px-2.5 py-1.5 text-[13px]">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
