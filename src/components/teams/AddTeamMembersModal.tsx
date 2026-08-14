"use client";
import React, { useEffect } from "react";
import PeopleMultiSelect from "@/components/common/PeopleMultiSelect";
import { CloseIcon } from "@/icons/board-icons";
import { PersonIcon } from "@/icons/workspace-icons";
import type { TeamMember } from "./types";
import type { TeamsManagerApi } from "./useTeamsManager";

export type AddTeamMembersModalProps = {
  teams: TeamsManagerApi;
};

/**
 * "Add members" sub-dialog opened from the roster panel's Users tab. Only
 * ever open while a single team (not "All teams") is selected, and only adds
 * people, it never touches anyone already on the roster, unlike
 * {@link CreateTeamModal}'s edit flow which replaces the whole selection.
 */
const AddTeamMembersModal: React.FC<AddTeamMembersModalProps> = ({ teams }) => {
  useEffect(() => {
    if (!teams.is_add_members_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") teams.closeAddMembers();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [teams]);

  if (!teams.is_add_members_open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add members"
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div
        className="absolute inset-0 bg-[#060e0e]/[0.68]"
        onClick={teams.closeAddMembers}
        aria-hidden="true"
      />

      <div className="relative z-[421] flex max-h-[90vh] w-[480px] max-w-full flex-col overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-500/[0.16] text-brand-200">
              <PersonIcon size={17} />
            </span>
            <span className="text-[18px] font-extrabold tracking-[-0.01em]">
              Add members to {teams.selected_team?.name ?? "team"}
            </span>
          </div>
          <button
            type="button"
            onClick={teams.closeAddMembers}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {/* min-h-0 lets this scroll instead of growing the dialog past max-h-[90vh] once
            the member picker's candidate list (rendered in-flow, not floated) opens. */}
        <div className="shell-scrollbar flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-[22px] py-5">
          <div>
            <div className="mb-[7px] text-[12.5px] font-semibold text-shell-text-muted">People</div>
            {teams.is_loading_add_member_candidates ? (
              <div className="rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-[13px] py-[11px] text-[13px] text-shell-text-faint">
                Loading people…
              </div>
            ) : (
              <PeopleMultiSelect
                people={teams.add_member_candidates}
                selected_ids={teams.add_member_selected_ids}
                onChange={teams.setAddMemberSelectedIds}
                getSubtitle={(person) => (person as TeamMember).email}
                placeholder="Search people by name or email"
                default_open
              />
            )}
          </div>

          {teams.add_members_error ? (
            <div className="rounded-lg border border-brand-500/30 bg-brand-500/[0.1] px-3 py-2.5 text-[13px] font-medium text-brand-200">
              {teams.add_members_error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-none items-center justify-end gap-2.5 border-t border-shell-border px-[22px] py-4">
          <button
            type="button"
            onClick={teams.closeAddMembers}
            className="rounded-lg px-3.5 py-[10px] text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={teams.submitAddMembers}
            disabled={!teams.can_submit_add_members}
            className="rounded-lg bg-brand-500 px-5 py-[10px] text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {teams.is_submitting_add_members ? "Please wait…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTeamMembersModal;
