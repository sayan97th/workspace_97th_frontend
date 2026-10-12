"use client";
import React, { useEffect, useMemo, useRef } from "react";
import { Upload, UsersRound, X } from "lucide-react";
import SettingsDropdown from "@/components/administration/SettingsDropdown";
import TeamModal from "./TeamModal";
import TeamPeopleSelect from "./TeamPeopleSelect";
import type { TeamsManagerApi } from "./useTeamsManager";

export type CreateTeamModalProps = {
  teams: TeamsManagerApi;
};

const NO_PARENT_ID = "";

/**
 * "Create new team" and "Edit team", after monday.com: Team name, "Allow guests on this team",
 * the parent team (a sub-team when set), and, when creating, the team members and an optional
 * team profile picture. Editing leaves the roster to the Users tab.
 */
const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ teams }) => {
  const form = teams.team_form;
  const file_input_ref = useRef<HTMLInputElement>(null);
  const picture_file = form?.picture_file ?? null;
  const picture_preview_url = useMemo(() => (picture_file ? URL.createObjectURL(picture_file) : null), [picture_file]);

  useEffect(
    () => () => {
      if (picture_preview_url) URL.revokeObjectURL(picture_preview_url);
    },
    [picture_preview_url]
  );

  if (!form) return null;

  const is_edit_mode = form.mode === "edit";
  const title = is_edit_mode ? "Edit team" : form.parent_id ? "Create sub-team" : "Create new team";
  const people = form.allow_guests ? teams.candidates : teams.candidates.filter((person) => !person.is_guest);
  const parent_options = [
    { id: NO_PARENT_ID, label: "None, a top level team" },
    ...teams.parent_options.map((team) => ({ id: team.id, label: team.name })),
  ];

  return (
    <TeamModal
      is_open
      title={title}
      onClose={teams.closeTeamForm}
      icon={
        <span className="teams-avatar" style={{ width: 40, height: 40 }}>
          <UsersRound size={22} strokeWidth={1.5} aria-hidden="true" />
        </span>
      }
      footer={
        <>
          <button type="button" className="teams-button teams-button-tertiary" onClick={teams.closeTeamForm}>
            Cancel
          </button>
          <button
            type="button"
            className="teams-button teams-button-primary"
            onClick={() => void teams.submitTeamForm()}
            disabled={!teams.can_submit_team_form}
          >
            {teams.is_submitting_team_form ? "Saving..." : is_edit_mode ? "Save" : "Create"}
          </button>
        </>
      }
    >
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          void teams.submitTeamForm();
        }}
      >
        <div>
          <label htmlFor="team-form-name" className="teams-field-label">
            Team name
          </label>
          <input
            id="team-form-name"
            className="teams-input"
            value={form.name}
            onChange={(event) => teams.updateTeamForm({ name: event.target.value })}
            placeholder="Enter team name"
            maxLength={255}
            autoFocus
          />
        </div>

        <label className="teams-checkbox-row">
          <input
            type="checkbox"
            checked={form.allow_guests}
            onChange={(event) => teams.updateTeamForm({ allow_guests: event.target.checked })}
          />
          <span>
            <span className="teams-checkbox-label">Allow guests on this team</span>
            <span className="teams-checkbox-help block">This team will only be able to join shareable boards.</span>
          </span>
        </label>

        {teams.can_create_teams ? (
          <div>
            <span className="teams-field-label">Parent team</span>
            <SettingsDropdown
              value={form.parent_id ?? NO_PARENT_ID}
              options={parent_options}
              onChange={(id) => teams.updateTeamForm({ parent_id: id === NO_PARENT_ID ? null : id })}
              is_searchable={parent_options.length > 8}
              className="w-full"
            />
          </div>
        ) : null}

        {is_edit_mode ? null : (
          <>
            <div>
              <span className="teams-field-label">Team members</span>
              <TeamPeopleSelect
                people={people}
                selected_ids={form.member_ids}
                onChange={(member_ids) => teams.updateTeamForm({ member_ids })}
                is_loading={teams.is_loading_candidates}
                placeholder="Enter name"
                aria_label="Team members"
              />
            </div>

            <div className="teams-upload-preview">
              {picture_preview_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={picture_preview_url} alt="New team picture" className="h-10 w-10 rounded-full object-cover" />
                  <span className="teams-muted min-w-0 flex-1 truncate">{picture_file?.name}</span>
                  <button
                    type="button"
                    className="teams-icon-button"
                    onClick={() => teams.updateTeamForm({ picture_file: null })}
                    aria-label="Remove picture"
                  >
                    <X size={16} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </>
              ) : (
                <button type="button" className="teams-button teams-button-secondary" onClick={() => file_input_ref.current?.click()}>
                  <Upload size={18} strokeWidth={1.75} aria-hidden="true" />
                  Upload team profile picture
                </button>
              )}
              <input
                ref={file_input_ref}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  if (file) teams.updateTeamForm({ picture_file: file });
                }}
              />
            </div>
          </>
        )}

        {teams.team_form_error ? <div className="teams-notice teams-notice-error">{teams.team_form_error}</div> : null}
      </form>
    </TeamModal>
  );
};

export default CreateTeamModal;
