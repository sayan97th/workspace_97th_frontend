"use client";
import React, { useState } from "react";
import type { BoardToolbarViewActions } from "./types";

export type SaveViewButtonsProps = {
  view_actions?: BoardToolbarViewActions;
};

type PendingAction = "save" | "save_as_new" | null;

/**
 * The "Save to this view" / "Save as new view" pair shown in the Filter, Person,
 * Sort, Group by and Conditional coloring panels. "Save to this view" only shows
 * while the toolbar differs from the tab's saved state. Renders nothing when the
 * board has no saved views or the viewer cannot edit them.
 */
function SaveViewButtons({ view_actions }: SaveViewButtonsProps) {
  const [pending, setPending] = useState<PendingAction>(null);
  if (!view_actions?.can_save) return null;

  const run = async (action: Exclude<PendingAction, null>, callback: () => Promise<void>) => {
    if (pending) return;
    setPending(action);
    try {
      await callback();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-none items-center gap-2">
      {view_actions.is_dirty && (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void run("save", view_actions.saveToActiveView)}
          title={view_actions.active_view_label ? `Save changes to "${view_actions.active_view_label}"` : undefined}
          className="flex h-8 items-center rounded-lg bg-boardtree-accent px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-boardtree-accent-hover disabled:opacity-60"
        >
          {pending === "save" ? "Saving..." : "Save to this view"}
        </button>
      )}
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => void run("save_as_new", view_actions.saveAsNewView)}
        className="flex h-8 items-center rounded-lg border border-boardtree-border px-3.5 text-[13px] font-semibold text-boardtree-text-secondary transition-colors hover:border-boardtree-text-faint hover:text-boardtree-text disabled:opacity-60"
      >
        {pending === "save_as_new" ? "Creating..." : "Save as new view"}
      </button>
    </div>
  );
}

export default SaveViewButtons;
