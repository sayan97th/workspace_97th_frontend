import React from "react";

export type UsersDirectoryFooterProps = {
  current_page: number;
  last_page: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
};

/**
 * Previous/Next pager for the Users table, sitting flush under `UsersDirectoryTable` as one
 * continuous bordered card. Unlike the shared `Pagination` component (a numeric "X-Y of Z"
 * range used by several other rosters in the app), this reads "Page X of Y, Z total" with
 * plain Previous/Next buttons, the layout asked for specifically for this table.
 */
const UsersDirectoryFooter: React.FC<UsersDirectoryFooterProps> = ({
  current_page,
  last_page,
  total,
  onPrevious,
  onNext,
}) => (
  <div className="flex items-center justify-between rounded-b-[10px] border border-t-0 border-shell-border bg-shell-panel-alt px-4 py-3">
    <div className="text-[12.5px] text-shell-text-muted">
      Page <span className="font-semibold text-shell-text">{current_page}</span> of{" "}
      <span className="font-semibold text-shell-text">{last_page}</span>
      {", "}
      {total} total
    </div>

    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={current_page <= 1}
        className="rounded-lg border border-shell-border-strong px-3 py-1.5 text-xs font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={current_page >= last_page}
        className="rounded-lg border border-shell-border-strong px-3 py-1.5 text-xs font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  </div>
);

export default UsersDirectoryFooter;
