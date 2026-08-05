import React from "react";
import { getBoardViewTypeOption, type BoardViewKind } from "./boardViewTypes";

export type BoardComingSoonViewProps = {
  view_type: BoardViewKind;
};

/**
 * Placeholder body for a tab whose {@link BoardViewKind} has been categorized
 * (selectable from the "+" picker, persisted on the tab) but doesn't have a
 * dedicated renderer yet — see `BOARD_VIEW_TYPES[].is_available` and
 * `getBoardViewBodyComponent` in `workspace-nav/view-registry.tsx`. Keeps the
 * tab itself (rename/duplicate/delete/…) fully usable while its content
 * renderer is still being built.
 */
const BoardComingSoonView: React.FC<BoardComingSoonViewProps> = ({ view_type }) => {
  const type = getBoardViewTypeOption(view_type);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
        <type.Icon size={26} />
      </span>
      <h2 className="text-lg font-semibold text-shell-text">{type.label} view coming soon</h2>
      <p className="text-[13.5px] text-shell-text-muted">
        This tab is already saved as a {type.label} view — its content editor is still being built. Check back
        soon, or switch to another tab in the meantime.
      </p>
    </div>
  );
};

export default BoardComingSoonView;
