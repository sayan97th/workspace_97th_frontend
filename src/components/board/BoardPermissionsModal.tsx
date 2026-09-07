"use client";
import React, { useEffect, useState } from "react";
import { CloseIcon, CrownIcon, WorkspaceTypeIcon } from "@/icons/workspace-icons";
import { boardInvitationService } from "@/services/board-invitation.service";
import type { BoardAccessEntry } from "@/types/board-invitation";
import type { BoardType } from "@/types/workspace";
import { BOARD_TYPE_OPTIONS } from "./BoardTypePicker";

export type BoardPermissionsModalProps = {
  is_open: boolean;
  onClose: () => void;
  board_id: number;
  board_type: BoardType;
  /** Whether the current user may change the board type / remove people — read-only otherwise. */
  can_manage: boolean;
  access: BoardAccessEntry[];
  onAccessChange: (access: BoardAccessEntry[]) => void;
  onChangeBoardTypeClick: () => void;
};

const getInitials = (name: string | null, fallback: string): string =>
  (name ?? fallback)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Board options menu's "Permissions" — a read/manage-focused summary of who
 * can access the board (mirrors {@link BoardInviteModal}'s own roster, since
 * that's the same access data) plus its board type, as opposed to "Invite"'s
 * add-people-by-email focus.
 */
const BoardPermissionsModal: React.FC<BoardPermissionsModalProps> = ({
  is_open,
  onClose,
  board_id,
  board_type,
  can_manage,
  access,
  onAccessChange,
  onChangeBoardTypeClick,
}) => {
  const [removing_key, setRemovingKey] = useState<string | null>(null);
  const [error_message, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open) return null;

  const board_type_label = BOARD_TYPE_OPTIONS.find((option) => option.value === board_type)?.label ?? "Main";

  const handleRemove = async (entry: BoardAccessEntry) => {
    setRemovingKey(entry.key);
    setErrorMessage(null);
    try {
      if (entry.kind === "invitation") {
        await boardInvitationService.revokeInvitation(board_id, entry.id);
      } else {
        await boardInvitationService.removeCollaborator(board_id, entry.id);
      }
      onAccessChange(access.filter((row) => row.key !== entry.key));
    } catch {
      setErrorMessage("We couldn't remove that access. Please try again.");
    } finally {
      setRemovingKey(null);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Permissions" className="fixed inset-0 z-[400] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.62]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[401] flex max-h-[86vh] w-[480px] max-w-full flex-col overflow-hidden rounded-[18px] border border-shell-border bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-shell-border px-7 py-5">
          <h2 className="text-xl font-extrabold tracking-[-0.01em]">Permissions</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="shell-scrollbar min-h-0 flex-1 overflow-y-auto px-7 py-5">
          <button
            type="button"
            onClick={onChangeBoardTypeClick}
            disabled={!can_manage}
            className="flex w-full items-center gap-3 rounded-xl border border-shell-border-strong px-4 py-3 text-left transition-colors hover:bg-shell-hover disabled:cursor-default disabled:opacity-70"
          >
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-shell-hover text-shell-text-muted">
              <WorkspaceTypeIcon size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold text-shell-text">{board_type_label}</span>
              <span className="block text-[12px] text-shell-text-muted">
                {can_manage ? "Tap to change who can find this board" : "Board type"}
              </span>
            </span>
          </button>

          {error_message && (
            <p className="mt-4 rounded-[10px] border border-error-500/30 bg-error-500/10 px-3.5 py-3 text-[13px] leading-[1.5] text-error-400">
              {error_message}
            </p>
          )}

          <label className="mb-2.5 mt-6 block text-[12.5px] font-semibold text-shell-text-secondary">
            People with access
          </label>
          <div className="flex flex-col">
            {access.length === 0 ? (
              <p className="py-3 text-[13px] text-shell-text-faint">No one else has access yet.</p>
            ) : (
              access.map((entry) => (
                <div key={entry.key} className="group flex items-center gap-3 rounded-[10px] px-1.5 py-2 hover:bg-shell-hover">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#E5623E,#8A2018)] text-[11px] font-bold text-white">
                    {getInitials(entry.full_name, entry.email)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-shell-text">{entry.full_name ?? entry.email}</p>
                    <p className="truncate text-[12px] text-shell-text-muted">
                      {entry.kind === "owner"
                        ? "Owner"
                        : entry.status === "pending"
                          ? "Invitation pending"
                          : "Viewer"}
                    </p>
                  </div>
                  {entry.kind === "owner" && (
                    <span className="flex-none text-sunset-200" title="Board owner">
                      <CrownIcon size={15} />
                    </span>
                  )}
                  {can_manage && entry.removable && (
                    <button
                      type="button"
                      onClick={() => handleRemove(entry)}
                      disabled={removing_key === entry.key}
                      aria-label={`Remove ${entry.full_name ?? entry.email}`}
                      className="flex flex-none items-center justify-center rounded-lg p-1 text-shell-text-faint opacity-0 transition-opacity hover:bg-shell-hover-strong hover:text-shell-text group-hover:opacity-100 disabled:opacity-50"
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-shell-border px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoardPermissionsModal;
