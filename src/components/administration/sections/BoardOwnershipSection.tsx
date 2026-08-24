"use client";
import React, { useState } from "react";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import OwnerTransferCard from "../OwnerTransferCard";
import SettingsDropdown from "../SettingsDropdown";
import type { BoardOwnershipManagerApi } from "../useBoardOwnershipManager";

export type BoardOwnershipSectionProps = {
  board_ownership: BoardOwnershipManagerApi;
};

/** Administration > Directory > Board ownership — bulk-reassign a departed teammate's boards. */
const BoardOwnershipSection: React.FC<BoardOwnershipSectionProps> = ({ board_ownership }) => {
  const [is_confirm_open, setIsConfirmOpen] = useState(false);
  const owner_options = board_ownership.members.map((member) => ({ id: member.id, label: member.name }));
  const current_owner = board_ownership.members.find((m) => m.id === board_ownership.board_current_owner_id);
  const new_owner = board_ownership.members.find((m) => m.id === board_ownership.board_new_owner_id);

  if (board_ownership.is_loading) {
    return <div className="text-[13px] text-shell-text-faint">Loading board ownership…</div>;
  }

  return (
    <div className="max-w-[640px]">
      {board_ownership.error ? (
        <div className="mb-5 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {board_ownership.error}
        </div>
      ) : null}

      <div className="mb-1.5 text-[15px] font-bold text-shell-text">Reassign a board&apos;s owner</div>
      <p className="mb-5 text-[13px] leading-relaxed text-shell-text-muted">
        Did someone leave the account? Move their boards, including private and shareable ones, to a new
        owner.
      </p>

      <OwnerTransferCard
        members={board_ownership.members}
        current_owner_id={board_ownership.board_current_owner_id}
        onChangeCurrentOwner={board_ownership.setBoardCurrentOwner}
        new_owner_id={board_ownership.board_new_owner_id}
        onChangeNewOwner={board_ownership.setBoardNewOwner}
        can_transfer={board_ownership.can_transfer_boards && !board_ownership.is_transferring}
        onTransfer={() => setIsConfirmOpen(true)}
        transfer_label={board_ownership.is_transferring ? "Reassigning…" : "Reassign boards"}
      />
      {board_ownership.board_transfer_notice ? (
        <div className="mt-3 text-[12.5px] font-medium text-[#8fe3b8]">{board_ownership.board_transfer_notice}</div>
      ) : null}

      <ConfirmActionModal
        is_open={is_confirm_open}
        title="Reassign boards"
        description={`Every board currently owned by "${current_owner?.name}" (including private and shareable boards) will be reassigned to "${new_owner?.name}". This can't be undone.`}
        confirm_label="Reassign boards"
        danger
        onConfirm={board_ownership.transferBoards}
        onClose={() => setIsConfirmOpen(false)}
      />

      <div className="my-7 h-px bg-shell-hover" />

      <div className="mb-1.5 text-[15px] font-bold text-shell-text">Boards without an owner</div>
      <p className="mb-4 text-[13px] leading-relaxed text-shell-text-muted">
        {board_ownership.orphan_boards.length > 0
          ? "Assign an owner so these boards stay covered by an account admin."
          : "Every board in this account currently has an owner."}
      </p>

      {board_ownership.orphan_boards.map((board) => (
        <div
          key={board.id}
          className="mb-2.5 flex items-center gap-[14px] rounded-[11px] border border-shell-border bg-shell-panel-alt px-[14px] py-3"
        >
          <span className="flex-1 text-[13.5px] font-semibold text-shell-text">{board.label}</span>
          <SettingsDropdown
            value={board.owner ? String(board.owner.id) : null}
            options={owner_options}
            onChange={(owner_id) => void board_ownership.assignOrphanBoardOwner(board.id, owner_id)}
            placeholder="Assign owner"
            is_muted={!board.owner}
            className="w-[220px]"
          />
        </div>
      ))}
    </div>
  );
};

export default BoardOwnershipSection;
