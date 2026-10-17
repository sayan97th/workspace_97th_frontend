"use client";
import React from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { ChevronDownIcon } from "@/icons/workspace-icons";

export type UsersDirectoryFooterProps = {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  per_page_options: readonly number[];
  onPerPageChange: (per_page: number) => void;
  onPrevious: () => void;
  onNext: () => void;
};

/**
 * Bottom bar of the Manage users card: "1 to 25 of 57 users", a rows per page picker and
 * previous / next page buttons.
 */
const UsersDirectoryFooter: React.FC<UsersDirectoryFooterProps> = ({
  current_page,
  last_page,
  total,
  per_page,
  per_page_options,
  onPerPageChange,
  onPrevious,
  onNext,
}) => {
  const range_start = total === 0 ? 0 : (current_page - 1) * per_page + 1;
  const range_end = Math.min(current_page * per_page, total);

  return (
    <div className="ud-footer">
      <div className="ud-footer-start">
        <span>
          <strong>
            {range_start} to {range_end}
          </strong>{" "}
          of {total} {total === 1 ? "user" : "users"}
        </span>
        <PortalTooltip content="Rows per page">
          <span className="inv-field">
            <select
              value={per_page}
              aria-label="Rows per page"
              onChange={(event) => onPerPageChange(Number(event.target.value))}
              className="inv-select"
              style={{ paddingLeft: 10 }}
            >
              {per_page_options.map((option) => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
            <span className="inv-field-trailing">
              <ChevronDownIcon size={12} />
            </span>
          </span>
        </PortalTooltip>
      </div>

      <div className="inv-pager-buttons">
        <PortalTooltip content="Previous page">
          <button
            type="button"
            aria-label="Previous page"
            disabled={current_page <= 1}
            onClick={onPrevious}
            className="inv-icon-button"
          >
            <ChevronDownIcon size={14} className="rotate-90" />
          </button>
        </PortalTooltip>
        <span className="inv-pager-page">
          Page {current_page} of {Math.max(1, last_page)}
        </span>
        <PortalTooltip content="Next page">
          <button
            type="button"
            aria-label="Next page"
            disabled={current_page >= last_page}
            onClick={onNext}
            className="inv-icon-button"
          >
            <ChevronDownIcon size={14} className="-rotate-90" />
          </button>
        </PortalTooltip>
      </div>
    </div>
  );
};

export default UsersDirectoryFooter;
