"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { workspaceService } from "@/services/workspace.service";
import type { WorkspaceContentItem } from "@/types/workspace";
import ToggleSwitch from "../../toolbar/ToggleSwitch";
import { connectedBoardIds } from "../cells/ConnectItemsCell";
import type { ColumnDef } from "../types";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";

/** Matches the API's `ConnectBoardColumnService::MAX_LINKED_BOARDS`. */
const MAX_LINKED_BOARDS = 10;
/** Boards listed to choose from, the Content endpoint's largest page. */
const BOARD_PAGE_SIZE = 100;

interface ConnectBoardSettingsProps {
  column: ColumnDef;
  state: BoardTableState;
  actions: BoardTableActions;
  onClose: () => void;
}

interface BoardChoice {
  id: string;
  label: string;
  workspace_name: string | null;
}

const OPTION_ROW = "flex h-9 w-full items-center gap-2.5 rounded-[4px] px-2.5 text-left text-[14px] text-boardtree-text hover:bg-boardtree-hover disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY_BUTTON = "flex h-8 items-center justify-center rounded-[4px] px-4 text-[14px] font-medium text-boardtree-text hover:bg-boardtree-hover";
const PRIMARY_BUTTON = "flex h-8 items-center justify-center rounded-[4px] bg-[#0073ea] px-4 text-[14px] font-medium text-white hover:bg-[#0060b9] disabled:opacity-40";

/**
 * The Connect boards column's "Boards settings", monday.com style: pick up to ten boards whose
 * items the column links, whether a cell may link more than one item, and whether the links
 * also show in a new column on the connected board (two-way, a single board only).
 */
export default function ConnectBoardSettings({ column, state, actions, onClose }: ConnectBoardSettingsProps) {
  const [query, setQuery] = useState("");
  const [boards, setBoards] = useState<WorkspaceContentItem[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [selected_ids, setSelectedIds] = useState<string[]>(() => connectedBoardIds(column));
  const [allow_multiple_items, setAllowMultipleItems] = useState(column.connect?.allow_multiple_items ?? true);
  const [two_way, setTwoWay] = useState(column.connect?.two_way ?? false);
  const [is_saving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    workspaceService
      .getContentItems(1, BOARD_PAGE_SIZE, { asset_type: ["board"] })
      .then((page) => {
        if (!cancelled) setBoards(page.data);
      })
      .catch(() => {
        if (!cancelled) setError("The boards could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Connected boards first, so they stay in reach. A board beyond the first page still shows by the name the picker data knows.
  const choices = useMemo(() => {
    const known_names = new Map((state.connect_options[column.id]?.boards ?? []).map((board) => [board.id, board.name]));
    const by_id = new Map<string, BoardChoice>(boards.map((board) => [String(board.id), { id: String(board.id), label: board.label, workspace_name: board.workspace?.name ?? null }]));
    const selected = selected_ids.map((id) => by_id.get(id) ?? { id, label: known_names.get(id) ?? "Unavailable board", workspace_name: known_names.has(id) ? null : "Private or deleted" });
    const others = [...by_id.values()].filter((board) => !selected_ids.includes(board.id));
    return { selected, others };
    // `selected_ids` is read only for the initial order, so checking a box does not make rows jump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, state.connect_options, column.id]);

  const normalized_query = query.trim().toLowerCase();
  const listed = [...choices.selected, ...choices.others].filter(
    (board) => !normalized_query || board.label.toLowerCase().includes(normalized_query) || board.workspace_name?.toLowerCase().includes(normalized_query)
  );
  const is_full = selected_ids.length >= MAX_LINKED_BOARDS;
  const can_two_way = selected_ids.length === 1;
  const single_board_name = can_two_way ? [...choices.selected, ...choices.others].find((board) => board.id === selected_ids[0])?.label : null;

  const toggleBoard = (id: string) => {
    setError(null);
    setSelectedIds((current) => (current.includes(id) ? current.filter((board_id) => board_id !== id) : current.length >= MAX_LINKED_BOARDS ? current : [...current, id]));
  };

  const save = async () => {
    if (selected_ids.length === 0 || is_saving) return;
    setIsSaving(true);
    setError(null);
    try {
      await actions.updateConnectSettings(column.id, { linked_board_ids: selected_ids, allow_multiple_items, two_way: two_way && can_two_way });
      onClose();
    } catch (save_error) {
      setError(getApiErrorMessage(save_error, "The settings could not be saved."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <p className="mb-4 text-[14px] leading-5 text-boardtree-text-muted">Choose the boards whose items this column can link. Items from every chosen board show in the cell picker.</p>

      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-[14px] font-semibold text-boardtree-text">Connected boards</div>
        <div className="text-[12.5px] text-boardtree-text-muted">
          {selected_ids.length} of {MAX_LINKED_BOARDS} selected
        </div>
      </div>
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search boards"
        aria-label="Search boards"
        className="mb-2 h-8 w-full rounded-[4px] border border-boardtree-border bg-transparent px-2.5 text-[14px] text-boardtree-text outline-none hover:border-boardtree-text focus:border-[#0073ea]"
      />
      <div className="flex max-h-[220px] flex-col gap-0.5 overflow-y-auto" role="group" aria-label="Boards">
        {listed.map((board) => {
          const is_selected = selected_ids.includes(board.id);
          return (
            <button key={board.id} type="button" role="checkbox" aria-checked={is_selected} disabled={!is_selected && is_full} onClick={() => toggleBoard(board.id)} className={OPTION_ROW}>
              <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-[3px] border ${is_selected ? "border-[#0073ea] bg-[#0073ea] text-white" : "border-boardtree-border"}`}>
                {is_selected && (
                  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                    <path d="M2.2 6.3 L4.8 8.8 L9.8 3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{board.label}</span>
              {board.workspace_name && <span className="max-w-[40%] flex-none truncate text-[12px] text-boardtree-text-faint">{board.workspace_name}</span>}
            </button>
          );
        })}
        {!is_loading && listed.length === 0 && <div className="px-2.5 py-1.5 text-[13px] text-boardtree-text-faint">No boards found.</div>}
        {is_loading && <div className="px-2.5 py-1.5 text-[13px] text-boardtree-text-faint">Loading...</div>}
      </div>
      {is_full && <div className="mt-1.5 text-[12.5px] text-boardtree-text-muted">You can connect up to {MAX_LINKED_BOARDS} boards.</div>}

      <div className="my-4 h-px bg-boardtree-border-soft" />

      <SettingToggle
        label="Allow linking to multiple items"
        description="When off, each cell links a single item and picking another one replaces it."
        is_on={allow_multiple_items}
        onToggle={() => setAllowMultipleItems((current) => !current)}
      />
      <SettingToggle
        label="Two-way connection"
        description={
          can_two_way
            ? `Also show these links in a column on ${single_board_name ?? "the connected board"}, and keep both sides in sync.`
            : "Available when a single board is connected."
        }
        is_on={two_way && can_two_way}
        disabled={!can_two_way}
        onToggle={() => setTwoWay((current) => !current)}
      />

      {error && (
        <div role="alert" className="mt-3 text-[13px] text-boardtree-danger">
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
          Cancel
        </button>
        <button type="button" disabled={selected_ids.length === 0 || is_saving} onClick={() => void save()} className={PRIMARY_BUTTON}>
          {is_saving ? "Saving..." : "Save"}
        </button>
      </div>
    </>
  );
}

function SettingToggle({ label, description, is_on, disabled = false, onToggle }: { label: string; description: string; is_on: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={is_on}
      disabled={disabled}
      onClick={onToggle}
      className="mb-2 flex w-full items-start gap-3 rounded-[6px] px-1 py-1.5 text-left hover:bg-boardtree-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-boardtree-text">{label}</span>
        <span className="block text-[12.5px] leading-[18px] text-boardtree-text-muted">{description}</span>
      </span>
      <span className="flex flex-none pt-0.5">
        <ToggleSwitch is_on={is_on} />
      </span>
    </button>
  );
}
