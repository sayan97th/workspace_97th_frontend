"use client";
import React, { useMemo, useState } from "react";
import { SearchIcon } from "@/icons/workspace-icons";
import { useOutsideClick } from "../../table/useOutsideClick";

/** Shared pieces of the sentence builder: the underlined token with its popover, and the searchable picker list. */

export const POPOVER_INPUT =
  "h-8 w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 text-[13px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent";
export const POPOVER_LABEL = "mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint";
export const POPOVER_DONE =
  "h-8 rounded-[6px] bg-boardtree-accent px-3 text-[12.5px] font-medium text-white hover:bg-boardtree-accent-hover disabled:opacity-40";
export const POPOVER_SECONDARY = "h-8 rounded-[6px] px-3 text-[12.5px] text-boardtree-text-secondary hover:bg-boardtree-hover";

export type TokenProps = {
  label: string;
  /** Still unset: shown in the faint placeholder color, like monday's gray "something". */
  is_placeholder?: boolean;
  /** The popover body. Receives `close` so a pick can dismiss it. */
  children: (close: () => void) => React.ReactNode;
  popover_width?: number;
  /** Accessible name of the popover, defaults to the label. */
  aria_label?: string;
  disabled?: boolean;
};

/** One underlined, clickable word of the sentence. Opens its editor in a popover right under it. */
export function Token({ label, is_placeholder = false, children, popover_width = 300, aria_label, disabled = false }: TokenProps) {
  const [is_open, setIsOpen] = useState(false);
  const ref = useOutsideClick<HTMLSpanElement>(is_open, () => setIsOpen(false));
  const close = () => setIsOpen(false);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={is_open}
        onClick={() => setIsOpen((open) => !open)}
        className={`border-b-2 leading-[1.15] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          is_open
            ? "border-boardtree-accent text-boardtree-accent"
            : is_placeholder
              ? "border-boardtree-text-faint/70 text-boardtree-text-faint hover:border-boardtree-accent hover:text-boardtree-accent"
              : "border-boardtree-text/60 text-boardtree-text hover:border-boardtree-accent hover:text-boardtree-accent"
        }`}
      >
        {label}
      </button>
      {is_open && (
        <div
          role="dialog"
          aria-label={aria_label ?? label}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
          style={{ width: popover_width }}
          className="absolute left-0 top-full z-40 mt-2 max-w-[86vw] rounded-[8px] border border-boardtree-border bg-boardtree-surface p-2 text-left text-[13px] font-normal leading-normal text-boardtree-text shadow-[0_12px_32px_rgba(30,34,55,0.20)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
        >
          {children(close)}
        </div>
      )}
    </span>
  );
}

export type PickerEntry<T extends string> = {
  id: T;
  label: string;
  hint?: string;
  /** A color dot before the label, for status options and groups. */
  color?: string;
  /** Anything else before the label, an icon or an avatar. */
  leading?: React.ReactNode;
};

export type PickerListProps<T extends string> = {
  sections: { title?: string; entries: PickerEntry<T>[] }[];
  selected?: T | T[] | null;
  onPick: (id: T) => void;
  placeholder?: string;
  empty_text?: string;
  /** Hides the search box, for short lists. */
  is_searchable?: boolean;
  max_height?: number;
};

/** A search box over sectioned rows, monday's "Most used" style list. Enter picks the first match. */
export function PickerList<T extends string>({ sections, selected, onPick, placeholder = "Search", empty_text = "Nothing matches your search.", is_searchable = true, max_height = 280 }: PickerListProps<T>) {
  const [query, setQuery] = useState("");
  const selected_ids = useMemo(() => new Set(selected == null ? [] : Array.isArray(selected) ? selected : [selected]), [selected]);

  const text = query.trim().toLowerCase();
  const visible = sections
    .map((section) => ({ ...section, entries: section.entries.filter((entry) => `${entry.label} ${entry.hint ?? ""}`.toLowerCase().includes(text)) }))
    .filter((section) => section.entries.length > 0);
  const first = visible[0]?.entries[0];

  return (
    <div>
      {is_searchable && (
        <label className="relative mb-1.5 block">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-boardtree-text-faint"><SearchIcon size={13} /></span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && first) {
                event.preventDefault();
                onPick(first.id);
              }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className={`${POPOVER_INPUT} pl-8`}
          />
        </label>
      )}
      <div className="overflow-y-auto" style={{ maxHeight: max_height }}>
        {visible.length === 0 && <div className="px-2 py-3 text-center text-[12.5px] text-boardtree-text-faint">{empty_text}</div>}
        {visible.map((section, section_index) => (
          <div key={section.title ?? section_index} role="group" aria-label={section.title}>
            {section.title && <div className="px-2 pb-1 pt-2 text-[11.5px] text-boardtree-text-faint first:pt-1">{section.title}</div>}
            {section.entries.map((entry) => {
              const is_selected = selected_ids.has(entry.id);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onPick(entry.id)}
                  aria-pressed={is_selected}
                  className={`flex min-h-8 w-full items-center gap-2.5 rounded-[6px] px-2 py-1 text-left text-[13px] ${is_selected ? "bg-boardtree-accent-surface text-boardtree-accent" : "text-boardtree-text hover:bg-boardtree-hover"}`}
                >
                  {entry.leading}
                  {entry.color && <span className="h-3.5 w-3.5 flex-none rounded-[3px]" style={{ background: entry.color }} />}
                  <span className="min-w-0 flex-1 truncate">{entry.label || "(blank)"}</span>
                  {entry.hint && <span className="flex-none text-[11.5px] text-boardtree-text-faint">{entry.hint}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A small round avatar with initials, for people rows. */
export function MiniAvatar({ initials, color }: { initials: string; color: string }) {
  return (
    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[9.5px] font-semibold text-white" style={{ background: color }}>
      {initials}
    </span>
  );
}

/** Popover footer with a Done button, for editors that are not a one click pick. */
export function PopoverFooter({ onDone, done_label = "Done", is_disabled = false, extra }: { onDone: () => void; done_label?: string; is_disabled?: boolean; extra?: React.ReactNode }) {
  return (
    <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-boardtree-border-soft pt-2">
      {extra}
      <button type="button" onClick={onDone} disabled={is_disabled} className={POPOVER_DONE}>
        {done_label}
      </button>
    </div>
  );
}

/** A two or three way switch inside a popover, e.g. before / on / after. */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex overflow-hidden rounded-[6px] border border-boardtree-border">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={`h-8 flex-1 px-2 text-[12.5px] ${value === option.id ? "bg-boardtree-accent-surface font-medium text-boardtree-accent" : "text-boardtree-text-secondary hover:bg-boardtree-hover"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
