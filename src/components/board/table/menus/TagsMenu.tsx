import type { TagDef } from "../types";
import PopoverPanel from "./PopoverPanel";

interface TagsMenuProps {
  tag_defs: TagDef[];
  selected: string[];
  query: string;
  onQueryChange: (value: string) => void;
  onToggle: (label: string) => void;
  onCreateTag: () => void;
  onManageTags: () => void;
  onClose: () => void;
}

export default function TagsMenu({ tag_defs, selected, query, onQueryChange, onToggle, onCreateTag, onManageTags, onClose }: TagsMenuProps) {
  const q = query.trim().toLowerCase();
  const filtered = tag_defs.filter((t) => t.label.toLowerCase().includes(q));
  const exact_match = tag_defs.some((t) => t.label.toLowerCase() === q);
  const can_create = q.length > 0 && !exact_match;

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[292px] -translate-x-1/2 p-3 pb-2.5">
      <input
        autoFocus
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Add tags"
        className="mb-2.5 h-8 w-full border-b border-[#e3e6ef] px-1 text-[13px] text-[#262b45] outline-none"
      />
      <div className="flex max-h-[236px] flex-col gap-0.5 overflow-y-auto">
        {filtered.map((tag) => {
          const is_on = selected.includes(tag.label);
          return (
            <button
              type="button"
              key={tag.id}
              onClick={() => onToggle(tag.label)}
              className="flex items-center gap-2.5 rounded-[5px] px-2.5 py-1.5 hover:brightness-[0.96]"
              style={{ background: is_on ? `${tag.color}1a` : "transparent" }}
            >
              <div className="flex-1 truncate text-left text-[13px] font-medium" style={{ color: tag.color }}>{tag.label}</div>
              <div className="flex-none rounded-[10px] border px-2.5 py-px text-[11.5px]" style={{ color: tag.color, borderColor: tag.color }}>
                {is_on ? "on" : ""}
              </div>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="px-1.5 pb-1.5 pt-1.5 text-[12.5px] text-[#a4aac2]">No tags found</div>}
      <button
        type="button"
        disabled={!can_create}
        onClick={onCreateTag}
        className="my-2.5 flex h-8 w-full items-center justify-center rounded-[5px] bg-[#eeeff5] text-[12.5px] hover:brightness-[0.98] disabled:cursor-default disabled:opacity-50"
        style={{ color: can_create ? "#4f6bed" : "#a4aac2" }}
      >
        + Create new tag
      </button>
      <button type="button" onClick={onManageTags} className="flex h-[30px] w-full items-center justify-center text-[12.5px] text-[#2074d4] hover:underline">
        Manage tags
      </button>
    </PopoverPanel>
  );
}
