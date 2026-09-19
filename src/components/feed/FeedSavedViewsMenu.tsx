"use client";
import React, { useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { BookmarkIcon, ChevronDownIcon, CloseIcon } from "@/icons/workspace-icons";
import type { FeedSavedView } from "@/data/update-feed-data";

export type FeedSavedViewsMenuProps = {
  saved_views: FeedSavedView[];
  onApply: (view: FeedSavedView) => void;
  onDelete: (id: number) => void;
  /** Saves the current tab, board and filters under `name`. Rejecting shows the error inline. */
  onSave: (name: string) => Promise<void>;
  /** False when nothing is narrowing the feed, so there is nothing worth saving yet. */
  can_save: boolean;
};

const MAX_NAME_LENGTH = 60;

/** The feed's "Views" chip: applies, deletes and saves named combinations of tab, board and filters. */
const FeedSavedViewsMenu: React.FC<FeedSavedViewsMenuProps> = ({ saved_views, onApply, onDelete, onSave, can_save }) => {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [is_saving, setIsSaving] = useState(false);

  const close = () => {
    setIsOpen(false);
    setError(null);
  };

  const apply = (view: FeedSavedView) => {
    onApply(view);
    close();
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || is_saving) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setName("");
    } catch {
      setError("Couldn't save this view. You can keep up to 20 views.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        ref={trigger_ref}
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={is_open}
        className="flex items-center gap-1.5 rounded-[8px] border border-shell-border px-2.5 py-1.5 text-[12px] font-medium text-shell-text-muted transition-colors hover:text-shell-text"
      >
        <BookmarkIcon size={11} />
        Views{saved_views.length > 0 ? ` (${saved_views.length})` : ""}
        <ChevronDownIcon size={10} className="flex-none" />
      </button>
      <BoardPopover anchor_el={trigger_ref.current} is_open={is_open} onClose={close} width={260} align="start">
        <div className="p-2">
          {saved_views.length === 0 ? (
            <p className="px-2 py-2 text-[12.5px] text-shell-text-muted">
              No saved views yet. Set up some filters, then save them here.
            </p>
          ) : (
            <ul className="shell-scrollbar max-h-[220px] overflow-y-auto">
              {saved_views.map((view) => (
                <li key={view.id} className="group flex items-center gap-1 rounded-lg hover:bg-shell-hover">
                  <button
                    type="button"
                    onClick={() => apply(view)}
                    className="min-w-0 flex-1 truncate px-3 py-2 text-left text-[12.5px] font-medium text-shell-text-secondary"
                  >
                    {view.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(view.id)}
                    aria-label={`Delete the ${view.name} view`}
                    className="mr-1 flex h-6 w-6 flex-none items-center justify-center rounded-md text-shell-text-faint opacity-0 transition-opacity hover:text-shell-text group-hover:opacity-100 focus:opacity-100"
                  >
                    <CloseIcon size={11} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-1 border-t border-shell-border px-1 pt-2">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={MAX_NAME_LENGTH}
                placeholder={can_save ? "Name this view" : "Apply a filter to save it"}
                disabled={!can_save}
                aria-label="Saved view name"
                className="min-w-0 flex-1 rounded-[8px] border border-shell-border bg-shell-panel-alt px-2.5 py-1.5 text-[12.5px] text-shell-text placeholder:text-shell-text-muted focus:border-brand-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!can_save || name.trim() === "" || is_saving}
                className="flex-none rounded-[8px] bg-brand-500 px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </form>
            {error && <p className="mt-1.5 text-[11.5px] font-semibold text-[#e2445c]">{error}</p>}
          </div>
        </div>
      </BoardPopover>
    </>
  );
};

export default FeedSavedViewsMenu;
