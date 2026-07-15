"use client";
import React, { useRef, useState } from "react";
import { BoardPopover, ToolbarCheckbox } from "@/components/board";
import { FilterIcon } from "@/icons/workspace-icons";
import TrashTypeBadge from "./TrashTypeBadge";
import type { TrashItemType } from "./types";

export type TrashFilterPopoverProps = {
  available_types: TrashItemType[];
  active_type_filters: TrashItemType[];
  onToggleType: (type: TrashItemType) => void;
  onClear: () => void;
};

/**
 * "Filters" button + popover for the trash/archive table's Type column — a checklist of
 * the {@link TrashItemType}s present in the active tab, reusing the board toolbar's
 * `BoardPopover` anchoring and `ToolbarCheckbox` glyph instead of a bespoke dropdown.
 */
const TrashFilterPopover: React.FC<TrashFilterPopoverProps> = ({
  available_types,
  active_type_filters,
  onToggleType,
  onClear,
}) => {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);
  const has_active_filters = active_type_filters.length > 0;

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={is_open}
        className={`flex h-[36px] items-center gap-[7px] rounded-[9px] border px-3 text-[13px] font-medium transition-colors ${
          has_active_filters
            ? "border-brand-500 text-brand-200"
            : "border-white/10 text-[#c7d0d0] hover:bg-white/[0.06]"
        }`}
      >
        <FilterIcon size={14} />
        Filters
        {has_active_filters ? (
          <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10.5px] font-bold text-white">
            {active_type_filters.length}
          </span>
        ) : null}
      </button>

      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={() => setIsOpen(false)} width={220} align="start">
        <div className="p-1.5">
          <div className="px-2.5 pb-1 pt-1 text-[11.5px] font-semibold tracking-[0.04em] text-[#7e8889]">
            Filter by type
          </div>
          {available_types.length === 0 ? (
            <div className="px-2.5 py-2 text-[12.5px] text-[#7e8889]">Nothing to filter yet.</div>
          ) : (
            available_types.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onToggleType(type)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.08]"
              >
                <ToolbarCheckbox state={active_type_filters.includes(type) ? "checked" : "unchecked"} size={15} />
                <TrashTypeBadge type={type} />
              </button>
            ))
          )}
          {has_active_filters ? (
            <div className="mt-1 border-t border-white/[0.07] pt-1.5">
              <button
                type="button"
                onClick={onClear}
                className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-[#8a9495] transition-colors hover:bg-white/[0.08] hover:text-[#e9eded]"
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
      </BoardPopover>
    </>
  );
};

export default TrashFilterPopover;
