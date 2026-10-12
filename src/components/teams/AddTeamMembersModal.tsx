"use client";
import React from "react";
import TeamModal from "./TeamModal";
import TeamPeopleSelect from "./TeamPeopleSelect";
import type { Team } from "./types";
import type { TeamRosterApi } from "./useTeamRoster";

export type AddTeamMembersModalProps = {
  team: Team | null;
  roster: TeamRosterApi;
};

/**
 * monday's "Add users" dialog: a single "Enter name" picker listing the people who are not on
 * the team yet as "Name (Title)", guests included when the team allows them. Only adds people,
 * nobody already on the roster is touched.
 */
const AddTeamMembersModal: React.FC<AddTeamMembersModalProps> = ({ team, roster }) => (
  <TeamModal
    is_open={roster.is_add_open && team !== null}
    title="Add users"
    is_compact
    onClose={roster.closeAddUsers}
    footer={
      <>
        <button type="button" className="teams-button teams-button-tertiary" onClick={roster.closeAddUsers}>
          Cancel
        </button>
        <button
          type="button"
          className="teams-button teams-button-primary"
          onClick={() => void roster.submitAddUsers()}
          disabled={!roster.can_submit_add}
        >
          {roster.is_submitting_add ? "Adding..." : "Add"}
        </button>
      </>
    }
  >
    <TeamPeopleSelect
      people={roster.add_candidates}
      selected_ids={roster.add_selected_ids}
      onChange={roster.setAddSelectedIds}
      is_loading={roster.is_loading_add_candidates}
      placeholder="Enter name"
      aria_label={`Users to add to ${team?.name ?? "the team"}`}
      auto_focus
    />
    {team?.allow_guests ? <p className="teams-muted">Guests can be added because this team allows guests.</p> : null}
    {roster.add_error ? <div className="teams-notice teams-notice-error">{roster.add_error}</div> : null}
  </TeamModal>
);

export default AddTeamMembersModal;
