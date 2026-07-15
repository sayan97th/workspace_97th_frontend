"use client";
import React from "react";
import type { AdministrationManagerApi } from "../useAdministrationManager";
import OwnerTransferCard from "../OwnerTransferCard";
import SettingsDropdown from "../SettingsDropdown";

export type BoardOwnershipSectionProps = {
  admin: AdministrationManagerApi;
};

/** Administration > Directory > Board ownership — bulk-reassign a departed teammate's boards. */
const BoardOwnershipSection: React.FC<BoardOwnershipSectionProps> = ({ admin }) => {
  const owner_options = admin.members.map((member) => ({ id: member.id, label: member.name }));

  return (
    <div className="max-w-[640px]">
      <div className="mb-1.5 text-[15px] font-bold text-shell-text">Reassign a board&apos;s owner</div>
      <p className="mb-5 text-[13px] leading-relaxed text-shell-text-muted">
        Did someone leave the account? Move their boards — including private and shareable ones — to a new
        owner.
      </p>

      <OwnerTransferCard
        members={admin.members}
        current_owner_id={admin.board_current_owner_id}
        onChangeCurrentOwner={admin.setBoardCurrentOwner}
        new_owner_id={admin.board_new_owner_id}
        onChangeNewOwner={admin.setBoardNewOwner}
        can_transfer={admin.can_transfer_boards}
        onTransfer={admin.transferBoards}
        transfer_label="Reassign boards"
      />
      {admin.board_transfer_notice ? (
        <div className="mt-3 text-[12.5px] font-medium text-[#8fe3b8]">{admin.board_transfer_notice}</div>
      ) : null}

      <div className="my-7 h-px bg-shell-hover" />

      <div className="mb-1.5 text-[15px] font-bold text-shell-text">Boards without an owner</div>
      <p className="mb-4 text-[13px] leading-relaxed text-shell-text-muted">
        {admin.orphan_board_rows.length > 0
          ? "Assign an owner so these boards stay covered by an account admin."
          : "Every board in this account currently has an owner."}
      </p>

      {admin.orphan_board_rows.map((board) => (
        <div
          key={board.id}
          className="mb-2.5 flex items-center gap-[14px] rounded-[11px] border border-shell-border bg-shell-panel-alt px-[14px] py-3"
        >
          <span className="flex-1 text-[13.5px] font-semibold text-shell-text">{board.name}</span>
          <SettingsDropdown
            value={board.owner_id}
            options={owner_options}
            onChange={(owner_id) => admin.assignOrphanBoardOwner(board.id, owner_id)}
            placeholder="Assign owner"
            is_muted={!board.owner_id}
            className="w-[220px]"
          />
        </div>
      ))}
    </div>
  );
};

export default BoardOwnershipSection;
