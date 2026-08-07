import React from "react";
import { ChevronRightIcon } from "@/icons/workspace-icons";

export type PaginationProps = {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  onPageChange: (page: number) => void;
};

/** Prev/next pager with a "X–Y of Z" summary, for any server-paginated table. */
const Pagination: React.FC<PaginationProps> = ({ current_page, last_page, total, per_page, onPageChange }) => {
  if (total === 0) return null;

  const range_start = (current_page - 1) * per_page + 1;
  const range_end = Math.min(current_page * per_page, total);

  return (
    <div className="mt-3 flex items-center justify-between">
      <div className="font-mono-accent text-[12.5px] tracking-[0.02em] text-shell-text-muted">
        {range_start}–{range_end} of {total}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(current_page - 1)}
          disabled={current_page <= 1}
          aria-label="Previous page"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-shell-text-secondary hover:bg-shell-hover disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRightIcon size={13} className="rotate-180" />
        </button>
        <span className="px-1.5 text-[12.5px] font-medium text-shell-text-secondary">
          {current_page} / {last_page}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(current_page + 1)}
          disabled={current_page >= last_page}
          aria-label="Next page"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-shell-text-secondary hover:bg-shell-hover disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRightIcon size={13} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
