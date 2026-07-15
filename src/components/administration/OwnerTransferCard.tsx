"use client";
import React from "react";
import type { BoardPersonOption } from "@/components/board";
import SettingsDropdown from "./SettingsDropdown";

export type OwnerTransferCardProps = {
  members: BoardPersonOption[];
  current_owner_id: string | null;
  onChangeCurrentOwner: (id: string) => void;
  new_owner_id: string | null;
  onChangeNewOwner: (id: string) => void;
  can_transfer: boolean;
  onTransfer: () => void;
  transfer_label: string;
  /** Renders a horizontal arrow glyph between the two pickers instead of a bare two-column grid (matches the Automations ownership layout). */
  show_arrow?: boolean;
};

/**
 * "Move ownership from one person to another" form shared by the Board ownership and
 * Automations ownership sections — a current-owner picker, a new-owner picker, and a
 * transfer button that's disabled until the two differ.
 */
const OwnerTransferCard: React.FC<OwnerTransferCardProps> = ({
  members,
  current_owner_id,
  onChangeCurrentOwner,
  new_owner_id,
  onChangeNewOwner,
  can_transfer,
  onTransfer,
  transfer_label,
  show_arrow = false,
}) => {
  const options = members.map((member) => ({ id: member.id, label: member.name }));

  return (
    <div>
      <div
        className={`grid gap-[14px] ${show_arrow ? "grid-cols-[1fr_auto_1fr] items-end" : "grid-cols-2"}`}
      >
        <div>
          <div className="mb-[7px] text-[12.5px] font-semibold text-shell-text-muted">Current owner</div>
          <SettingsDropdown
            value={current_owner_id}
            options={options}
            onChange={onChangeCurrentOwner}
            className="w-full"
          />
        </div>

        {show_arrow ? (
          <span className="pb-[11px] text-shell-text-faint">
            <svg width="14" height="14" viewBox="0 0 16 16">
              <path
                d="M2 8h11M9 4l4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}

        <div>
          <div className="mb-[7px] text-[12.5px] font-semibold text-shell-text-muted">New owner</div>
          <SettingsDropdown
            value={new_owner_id}
            options={options}
            onChange={onChangeNewOwner}
            placeholder="Choose a person"
            className="w-full"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onTransfer}
        disabled={!can_transfer}
        className="mt-[18px] rounded-lg px-[18px] py-[10px] text-[13.5px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 enabled:bg-brand-500 enabled:hover:bg-brand-600"
      >
        {transfer_label}
      </button>
    </div>
  );
};

export default OwnerTransferCard;
