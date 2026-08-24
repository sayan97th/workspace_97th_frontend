"use client";
import { useCallback, useEffect, useState } from "react";
import type { BoardPersonOption } from "@/components/board";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { adminUsersService } from "@/services/administration/admin-users.service";
import { boardOwnershipService } from "@/services/administration/board-ownership.service";
import type { AdminBoardDto } from "@/types/administration/board-ownership";
import { toPersonOption } from "./adminUserMapping";

/** Generous enough to cover a typical account's staff/client roster in one shot for a picker. */
const DIRECTORY_PER_PAGE = 500;

export type BoardOwnershipManagerApi = {
  is_loading: boolean;
  error: string | null;

  members: BoardPersonOption[];

  board_current_owner_id: string | null;
  setBoardCurrentOwner: (id: string) => void;
  board_new_owner_id: string | null;
  setBoardNewOwner: (id: string) => void;
  can_transfer_boards: boolean;
  is_transferring: boolean;
  transferBoards: () => Promise<void>;
  board_transfer_notice: string | null;

  orphan_boards: AdminBoardDto[];
  assignOrphanBoardOwner: (board_id: number, owner_id: string) => Promise<void>;
};

/**
 * Owns the Board ownership section: a "move every board from person A to person B" bulk
 * transfer (backed by `POST /api/admin/board-ownership/reassign`, a genuinely
 * high-blast-radius write, so the frontend gates it behind `ConfirmActionModal` instead of
 * firing on click like the old mock version did) and the "boards without an owner" list.
 */
export function useBoardOwnershipManager(): BoardOwnershipManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<BoardPersonOption[]>([]);
  const [orphan_boards, setOrphanBoards] = useState<AdminBoardDto[]>([]);

  const [board_current_owner_id, setBoardCurrentOwner] = useState<string | null>(null);
  const [board_new_owner_id, setBoardNewOwner] = useState<string | null>(null);
  const [board_transfer_notice, setBoardTransferNotice] = useState<string | null>(null);
  const [is_transferring, setIsTransferring] = useState(false);

  const loadOrphans = useCallback(async () => {
    try {
      const boards = await boardOwnershipService.getOrphanBoards();
      setOrphanBoards(boards);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't load boards without an owner."));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      adminUsersService.getUsers({ per_page: DIRECTORY_PER_PAGE }),
      boardOwnershipService.getOrphanBoards(),
    ])
      .then(([users_page, boards]) => {
        if (cancelled) return;
        const mapped_members = users_page.data.map(toPersonOption);
        setMembers(mapped_members);
        setBoardCurrentOwner(mapped_members[0]?.id ?? null);
        setOrphanBoards(boards);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't load the board ownership data."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const can_transfer_boards = Boolean(
    board_current_owner_id && board_new_owner_id && board_current_owner_id !== board_new_owner_id
  );

  const transferBoards = async () => {
    if (!can_transfer_boards || !board_current_owner_id || !board_new_owner_id) return;
    setIsTransferring(true);
    setError(null);
    try {
      const count = await boardOwnershipService.bulkReassignOwner({
        current_owner_id: Number(board_current_owner_id),
        new_owner_id: Number(board_new_owner_id),
      });
      const new_owner = members.find((member) => member.id === board_new_owner_id);
      setBoardTransferNotice(
        new_owner
          ? `${count === 1 ? "1 board" : `${count} boards`} reassigned to ${new_owner.name}.`
          : null
      );
      setBoardCurrentOwner(board_new_owner_id);
      setBoardNewOwner(null);
      await loadOrphans();
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't reassign those boards."));
      throw err;
    } finally {
      setIsTransferring(false);
    }
  };

  const assignOrphanBoardOwner = async (board_id: number, owner_id: string) => {
    try {
      const updated = await boardOwnershipService.assignOrphanOwner(board_id, Number(owner_id));
      setOrphanBoards((current) => current.filter((board) => board.id !== updated.id));
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't assign that board's owner."));
    }
  };

  return {
    is_loading,
    error,
    members,

    board_current_owner_id,
    setBoardCurrentOwner,
    board_new_owner_id,
    setBoardNewOwner,
    can_transfer_boards,
    is_transferring,
    transferBoards,
    board_transfer_notice,

    orphan_boards,
    assignOrphanBoardOwner,
  };
}
