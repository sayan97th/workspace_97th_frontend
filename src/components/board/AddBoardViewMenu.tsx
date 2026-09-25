"use client";
import React, { useEffect, useState } from "react";
import { SearchIcon } from "@/icons/workspace-icons";
import BoardPopover from "./toolbar/BoardPopover";
import { BOARD_VIEW_TYPES, type BoardViewKind, type BoardViewTypeOption } from "./boardViewTypes";

export type AddBoardViewMenuProps = {
  /** The "+" tab-bar button the menu is anchored beneath. */
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  /** Fired with the chosen type; the caller creates the tab. The menu closes itself first. */
  onSelectType: (type: BoardViewTypeOption) => void;
  /** Override the offered types (defaults to {@link BOARD_VIEW_TYPES}). */
  types?: BoardViewTypeOption[];
};

/** Browser storage key of the viewer's recently added view kinds, newest first. */
const RECENT_VIEW_TYPES_KEY = "board_view_recent_types";
const MAX_RECENT_VIEW_TYPES = 3;

/** Reads the recently added view kinds. Storage can be unavailable (private mode, blocked site data), so it falls back to none. */
function readRecentViewTypes(): BoardViewKind[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_VIEW_TYPES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((kind): kind is BoardViewKind => typeof kind === "string") : [];
  } catch {
    return [];
  }
}

function rememberRecentViewType(kind: BoardViewKind): void {
  try {
    const next = [kind, ...readRecentViewTypes().filter((other) => other !== kind)].slice(0, MAX_RECENT_VIEW_TYPES);
    window.localStorage.setItem(RECENT_VIEW_TYPES_KEY, JSON.stringify(next));
  } catch {
    // Remembering is a convenience only.
  }
}

/**
 * Monday-style "Board views" picker shown from a board's tab-bar "+" button.
 * Lets the user choose what *kind* of tab to add (Table, Kanban, …), so the
 * new tab renders through the matching component instead of always being
 * another table. A search box filters the kinds, and the kinds this viewer
 * added most recently are listed first. Purely presentational: it reports
 * the chosen {@link BoardViewTypeOption} and lets the consumer own creation,
 * mirroring {@link import("./AddColumnMenu").default}'s column-type picker.
 */
const AddBoardViewMenu: React.FC<AddBoardViewMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  onSelectType,
  types = BOARD_VIEW_TYPES,
}) => {
  const [query, setQuery] = useState("");
  const [recent_kinds, setRecentKinds] = useState<BoardViewKind[]>([]);

  useEffect(() => {
    if (!is_open) return;
    setQuery("");
    setRecentKinds(readRecentViewTypes());
  }, [is_open]);

  const handleSelect = (type: BoardViewTypeOption) => {
    rememberRecentViewType(type.kind);
    onSelectType(type);
    onClose();
  };

  const normalized_query = query.trim().toLowerCase();
  const matching_types = types.filter(
    (type) =>
      !normalized_query ||
      type.label.toLowerCase().includes(normalized_query) ||
      type.description.toLowerCase().includes(normalized_query)
  );
  const recent_types = normalized_query
    ? []
    : recent_kinds
        .map((kind) => types.find((type) => type.kind === kind))
        .filter((type): type is BoardViewTypeOption => Boolean(type));

  const renderType = (type: BoardViewTypeOption, key_prefix: string) => (
    <button
      key={`${key_prefix}-${type.kind}`}
      type="button"
      title={type.description}
      onClick={() => handleSelect(type)}
      className="flex items-center gap-2.5 rounded-[7px] px-2 py-2 text-left transition-colors hover:bg-shell-hover"
    >
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[6px] bg-shell-hover text-shell-text-muted">
        <type.Icon size={15} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-medium text-shell-text">{type.label}</span>
        <span className="truncate text-[11.5px] text-shell-text-faint">{type.description}</span>
      </span>
      {!type.is_available && (
        <span className="flex-none rounded-full bg-brand-500/[0.14] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-200">
          Soon
        </span>
      )}
    </button>
  );

  const section_title_class = "px-1.5 pb-1 pt-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-shell-text-faint";

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} align="start" width={280}>
      <div className="flex flex-col gap-1 p-2">
        <label className="mb-0.5 flex items-center gap-2 rounded-[8px] border border-shell-border-strong bg-shell-bg px-2.5 py-1.5 focus-within:border-brand-500">
          <span className="text-shell-text-faint">
            <SearchIcon size={13} />
          </span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && matching_types.length > 0) {
                event.preventDefault();
                handleSelect(matching_types[0]);
              }
            }}
            placeholder="Search view types"
            aria-label="Search view types"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-shell-text outline-none placeholder:text-shell-text-faint"
          />
        </label>

        <div className="shell-scrollbar flex max-h-[420px] flex-col gap-1 overflow-y-auto">
          {recent_types.length > 0 && (
            <>
              <span className={section_title_class}>Recently used</span>
              {recent_types.map((type) => renderType(type, "recent"))}
            </>
          )}

          <span className={section_title_class}>Board views</span>
          {matching_types.map((type) => renderType(type, "all"))}
          {matching_types.length === 0 && (
            <p className="px-1.5 py-3 text-center text-[12.5px] text-shell-text-faint">No view types match your search.</p>
          )}
        </div>
      </div>
    </BoardPopover>
  );
};

export default AddBoardViewMenu;
