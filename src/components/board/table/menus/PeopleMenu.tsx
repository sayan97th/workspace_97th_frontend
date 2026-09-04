import type { PersonDef } from "../types";
import PopoverPanel from "./PopoverPanel";

interface PeopleMenuProps {
  people: PersonDef[];
  selected: string[];
  query: string;
  onQueryChange: (value: string) => void;
  onToggle: (person_id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function PeopleMenu({ people, selected, query, onQueryChange, onToggle, onClear, onClose }: PeopleMenuProps) {
  const filtered = people.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[300px] -translate-x-1/2 p-3">
      <div className="mb-2.5 flex h-8 items-center gap-[7px] rounded-[6px] border border-boardtree-border px-[9px] focus-within:border-boardtree-accent">
        <svg viewBox="0 0 16 16" width="13" height="13" className="flex-none text-boardtree-text-faint">
          <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 10.5 L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search names"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-boardtree-text outline-none"
        />
      </div>
      <div className="px-0.5 pb-[7px] text-[12px] text-boardtree-text-muted">People in this account</div>
      <div className="shell-scrollbar flex max-h-[236px] flex-col gap-0.5 overflow-y-auto">
        {filtered.map((person) => {
          const is_on = selected.includes(person.id);
          return (
            <button
              type="button"
              key={person.id}
              onClick={() => onToggle(person.id)}
              className="flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 hover:bg-boardtree-hover"
            >
              <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[9.5px] font-semibold text-white" style={{ background: person.color }}>
                {person.initials}
              </div>
              <div className="flex-1 text-left text-[13px] text-boardtree-text">{person.name}</div>
              {is_on && (
                <div className="flex h-[17px] w-[17px] items-center justify-center rounded-[4px] bg-boardtree-accent">
                  <svg viewBox="0 0 14 14" width="11" height="11"><path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
                </div>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && <div className="px-2 py-1 text-[12.5px] text-boardtree-text-faint">No people found</div>}
      </div>
      <button type="button" onClick={onClear} className="pt-2.5 text-[12px] text-boardtree-text-muted hover:text-boardtree-accent">
        Clear value
      </button>
    </PopoverPanel>
  );
}
