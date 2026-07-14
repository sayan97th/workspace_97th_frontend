"use client";
import React, { useEffect } from "react";
import PeopleMultiSelect from "@/components/common/PeopleMultiSelect";
import { CloseIcon } from "@/icons/board-icons";
import { TeamsIcon } from "@/icons/workspace-icons";
import type { TeamsManagerApi } from "./useTeamsManager";

export type CreateTeamModalProps = {
  teams: TeamsManagerApi;
};

/**
 * "Create new team" sub-dialog opened from {@link TeamsRail}. Sits on top of the Teams
 * modal (higher z-index) so both can be open at once, matching the approved design.
 */
const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ teams }) => {
  useEffect(() => {
    if (!teams.is_create_team_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") teams.closeCreateTeam();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [teams]);

  if (!teams.is_create_team_open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create new team"
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div
        className="absolute inset-0 bg-[#060e0e]/[0.68]"
        onClick={teams.closeCreateTeam}
        aria-hidden="true"
      />

      <div className="relative z-[421] flex max-h-[90vh] w-[480px] max-w-full flex-col overflow-hidden rounded-2xl border border-white/[0.10] bg-[#132424] text-[#e9eded] shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-[22px] py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-500/[0.16] text-brand-200">
              <TeamsIcon size={18} />
            </span>
            <span className="text-[18px] font-extrabold tracking-[-0.01em]">Create new team</span>
          </div>
          <button
            type="button"
            onClick={teams.closeCreateTeam}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-[#9aa4a5] transition-colors hover:bg-white/[0.08]"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {/* min-h-0 lets this scroll instead of growing the dialog past max-h-[90vh] once
            the member picker's candidate list (rendered in-flow, not floated) opens. */}
        <div className="shell-scrollbar flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-[22px] py-5">
          <div>
            <div className="mb-[7px] text-[12.5px] font-semibold text-[#9aa4a5]">Team name</div>
            <input
              type="text"
              value={teams.new_team_name}
              onChange={(event) => teams.setNewTeamName(event.target.value)}
              placeholder="Enter team name"
              className="w-full rounded-[9px] border border-white/[0.14] bg-[#0F1C1C] px-[13px] py-[11px] text-[14px] text-[#e9eded] placeholder:text-[#7e8889] focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-[7px] text-[12.5px] font-semibold text-[#9aa4a5]">Team members</div>
            <PeopleMultiSelect
              people={teams.members}
              selected_ids={teams.new_team_member_ids}
              onChange={teams.setNewTeamMemberIds}
              getSubtitle={(person) =>
                teams.members.find((member) => member.id === person.id)?.email
              }
              placeholder="Search people by name or email"
            />
          </div>
        </div>

        <div className="flex flex-none items-center justify-end gap-2.5 border-t border-white/[0.07] px-[22px] py-4">
          <button
            type="button"
            onClick={teams.closeCreateTeam}
            className="rounded-lg px-3.5 py-[10px] text-[13.5px] font-semibold text-[#c7d0d0] transition-colors hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={teams.createTeam}
            disabled={!teams.can_create_team}
            className="rounded-lg bg-brand-500 px-5 py-[10px] text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamModal;
