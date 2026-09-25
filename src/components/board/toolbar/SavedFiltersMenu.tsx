"use client";
import React, { useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon, EditPencilIcon } from "@/icons/board-icons";
import { BookmarkIcon, ChevronDownIcon, DeleteIcon } from "@/icons/workspace-icons";
import type { BoardSavedFilter, BoardSavedFilterActions, BoardToolbarApi } from "./types";

export type SavedFiltersMenuProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  actions: BoardSavedFilterActions;
};

const MAX_NAME_LENGTH = 80;

/** Whether the toolbar has anything a saved filter would keep. */
const hasSavableFilters = <TRow,>(toolbar: BoardToolbarApi<TRow>) =>
  toolbar.active_filter_count > 0 || toolbar.selected_person_ids.length > 0 || toolbar.selected_team_ids.length > 0;

/**
 * "Saved filters" dropdown in the Filter panel header: the viewer's own named
 * filters for this board, private to them and separate from the shared views.
 * Clicking one replaces the current filters (the search box is kept), and the
 * current filters can be saved under a new name, renamed or deleted.
 */
function SavedFiltersMenu<TRow>({ toolbar, actions }: SavedFiltersMenuProps<TRow>) {
  const [is_open, setIsOpen] = useState(false);
  const [new_name, setNewName] = useState("");
  const [editing_id, setEditingId] = useState<number | null>(null);
  const [editing_name, setEditingName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const container_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!is_open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!container_ref.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [is_open]);

  const run = async (callback: () => Promise<void>) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await callback();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const applySavedFilter = (saved_filter: BoardSavedFilter) => {
    toolbar.applyFilterState({
      ...saved_filter.filter_state,
      search_query: toolbar.search_query,
      search_column_ids: toolbar.search_column_ids,
      search_include_subitems: toolbar.search_include_subitems,
      search_include_updates: toolbar.search_include_updates,
    });
    setIsOpen(false);
  };

  const saveCurrent = () => {
    const name = new_name.trim();
    if (!name) return;
    void run(async () => {
      await actions.saveCurrentFilter(name);
      setNewName("");
    });
  };

  const saveRename = (id: number) => {
    const name = editing_name.trim();
    if (!name) return;
    void run(async () => {
      await actions.renameSavedFilter(id, name);
      setEditingId(null);
    });
  };

  const can_save = hasSavableFilters(toolbar);

  return (
    <div ref={container_ref} className="relative flex-none">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13.5px] font-semibold text-boardtree-text-secondary hover:bg-boardtree-hover hover:text-boardtree-text"
      >
        <BookmarkIcon size={14} />
        Saved filters
        {actions.saved_filters.length > 0 && (
          <span className="text-[12px] font-medium text-boardtree-text-faint">{actions.saved_filters.length}</span>
        )}
        <ChevronDownIcon size={10} className={`transition-transform ${is_open ? "rotate-180" : ""}`} />
      </button>

      {is_open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-[210] w-[300px] rounded-[9px] border border-boardtree-border bg-boardtree-surface p-1.5 shadow-2xl shadow-black/50">
          <p className="px-2 pb-1.5 pt-1 text-[11.5px] font-semibold tracking-wide text-boardtree-text-faint">
            Only you can see your saved filters
          </p>

          {actions.saved_filters.length === 0 ? (
            <p className="px-2 pb-2 text-[13px] text-boardtree-text-muted">No saved filters yet.</p>
          ) : (
            <div className="shell-scrollbar max-h-[240px] overflow-y-auto">
              {actions.saved_filters.map((saved_filter) =>
                editing_id === saved_filter.id ? (
                  <div key={saved_filter.id} className="flex items-center gap-1 px-1 py-1">
                    <input
                      autoFocus
                      value={editing_name}
                      maxLength={MAX_NAME_LENGTH}
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") saveRename(saved_filter.id);
                        if (event.key === "Escape") {
                          event.stopPropagation();
                          setEditingId(null);
                        }
                      }}
                      className="h-8 min-w-0 flex-1 rounded-md border border-boardtree-accent bg-boardtree-hover px-2 text-[13px] text-boardtree-text focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => saveRename(saved_filter.id)}
                      aria-label="Save name"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-boardtree-accent hover:bg-boardtree-hover"
                    >
                      <CheckIcon size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel rename"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-boardtree-text-faint hover:bg-boardtree-hover"
                    >
                      <CloseIcon size={11} />
                    </button>
                  </div>
                ) : (
                  <div key={saved_filter.id} className="group flex items-center rounded-md hover:bg-boardtree-hover">
                    <button
                      type="button"
                      onClick={() => applySavedFilter(saved_filter)}
                      className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-[13.5px] text-boardtree-text"
                      title={`Apply "${saved_filter.name}"`}
                    >
                      {saved_filter.name}
                    </button>
                    <span className="hidden flex-none items-center gap-0.5 pr-1 group-hover:flex">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(saved_filter.id);
                          setEditingName(saved_filter.name);
                        }}
                        aria-label={`Rename ${saved_filter.name}`}
                        className="flex h-6 w-6 items-center justify-center rounded text-boardtree-text-faint hover:text-boardtree-text"
                      >
                        <EditPencilIcon size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void run(() => actions.deleteSavedFilter(saved_filter.id))}
                        aria-label={`Delete ${saved_filter.name}`}
                        className="flex h-6 w-6 items-center justify-center rounded text-boardtree-text-faint hover:text-[#e2445c]"
                      >
                        <DeleteIcon size={13} />
                      </button>
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          <div className="mt-1.5 border-t border-boardtree-border-soft px-1 pt-2">
            <div className="flex items-center gap-1.5">
              <input
                value={new_name}
                maxLength={MAX_NAME_LENGTH}
                disabled={!can_save}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveCurrent();
                }}
                placeholder={can_save ? "Name these filters" : "Add filters to save them"}
                className="h-8 min-w-0 flex-1 rounded-md border border-boardtree-border bg-boardtree-hover px-2 text-[13px] text-boardtree-text placeholder:text-boardtree-text-faint focus:border-boardtree-accent focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                disabled={!can_save || !new_name.trim() || pending}
                onClick={saveCurrent}
                className="flex h-8 flex-none items-center rounded-md bg-boardtree-accent px-3 text-[13px] font-semibold text-white hover:bg-boardtree-accent-hover disabled:opacity-50"
              >
                Save
              </button>
            </div>
            {error && <p className="px-1 pt-1.5 text-[12px] text-[#e2445c]">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default SavedFiltersMenu;
