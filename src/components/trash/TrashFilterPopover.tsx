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
            : "border-shell-border-strong text-shell-text-secondary hover:bg-shell-hover"
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
          <div className="px-2.5 pb-1 pt-1 text-[11.5px] font-semibold tracking-[0.04em] text-shell-text-faint">
            Filter by type
          </div>
          {available_types.length === 0 ? (
            <div className="px-2.5 py-2 text-[12.5px] text-shell-text-faint">Nothing to filter yet.</div>
          ) : (
            available_types.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onToggleType(type)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-shell-hover"
              >
                <ToolbarCheckbox state={active_type_filters.includes(type) ? "checked" : "unchecked"} size={15} />
                <TrashTypeBadge type={type} />
              </button>
            ))
          )}
          {has_active_filters ? (
            <div className="mt-1 border-t border-shell-border pt-1.5">
              <button
                type="button"
                onClick={onClear}
                className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
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
