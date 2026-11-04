"use client";

import React, { useMemo, useState } from "react";
import { Check, Info, Minus, Search, UserPlus, Users, X } from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import type { WorkspaceMember } from "@/types/workspace";
import { peopleLabel } from "./boardInviteUtils";

/** Rows rendered at once, a search narrows a large workspace down. */
const MAX_VISIBLE_MEMBERS = 60;

export type InviteTeam = { id: number; name: string; member_ids: number[] };

export type MemberPickerPanelProps = {
  /** Active workspace members (deactivated accounts already removed). */
  members: WorkspaceMember[];
  teams: InviteTeam[];
  /** Ids of people already added to the board (owners and board members). */
  added_user_ids: Set<number>;
  current_user_id: number | null;
  /** True for a main or shareable board, where members can already open it through the workspace. */
  workspace_can_view: boolean;
  is_busy: boolean;
  /** Adds the picked people to the board. Resolves true when it worked, so the selection clears. */
  onAdd: (user_ids: number[]) => Promise<boolean>;
};

const matches = (member: WorkspaceMember, needle: string): boolean =>
  member.full_name.toLowerCase().includes(needle) ||
  member.email.toLowerCase().includes(needle) ||
  (member.job_title ?? "").toLowerCase().includes(needle);

/**
 * "Workspace members" tab of the board invite dialog: a searchable, multi select list of the
 * workspace's people (and teams, which pick all of their members at once). People already on the
 * board stay listed but locked, so it is clear why they cannot be picked. Picking does nothing
 * until "Add to board", which grants access right away, no email round trip.
 */
const MemberPickerPanel: React.FC<MemberPickerPanelProps> = ({
  members,
  teams,
  added_user_ids,
  current_user_id,
  workspace_can_view,
  is_busy,
  onAdd,
}) => {
  const [query, setQuery] = useState("");
  const [selected_ids, setSelectedIds] = useState<Set<number>>(() => new Set());

  const needle = query.trim().toLowerCase();
  const member_by_id = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  // Available people first, then the ones already on the board, each alphabetical.
  const visible_members = useMemo(() => {
    const filtered = members.filter((member) => member.id !== current_user_id && (!needle || matches(member, needle)));
    return filtered.sort((first, second) => {
      const first_added = added_user_ids.has(first.id) ? 1 : 0;
      const second_added = added_user_ids.has(second.id) ? 1 : 0;
      return first_added - second_added || first.full_name.localeCompare(second.full_name);
    });
  }, [members, needle, current_user_id, added_user_ids]);

  const visible_teams = useMemo(
    () =>
      teams
        .filter((team) => !needle || team.name.toLowerCase().includes(needle))
        .map((team) => ({
          ...team,
          available_ids: team.member_ids.filter((id) => member_by_id.has(id) && !added_user_ids.has(id) && id !== current_user_id),
        }))
        // A team that is already fully on the board only shows up when searched for.
        .filter((team) => needle || team.available_ids.length > 0),
    [teams, needle, member_by_id, added_user_ids, current_user_id]
  );

  const available_count = members.filter((member) => member.id !== current_user_id && !added_user_ids.has(member.id)).length;
  const selected_members = [...selected_ids].map((id) => member_by_id.get(id)).filter((member): member is WorkspaceMember => Boolean(member));

  const toggleMember = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTeam = (available_ids: number[]) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const is_all_selected = available_ids.every((id) => next.has(id));
      available_ids.forEach((id) => (is_all_selected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      visible_members.filter((member) => !added_user_ids.has(member.id)).forEach((member) => next.add(member.id));
      return next;
    });
  };

  const submit = async () => {
    if (selected_ids.size === 0 || is_busy) return;
    const was_added = await onAdd([...selected_ids]);
    if (was_added) {
      setSelectedIds(new Set());
      setQuery("");
    }
  };

  const has_results = visible_members.length > 0 || visible_teams.length > 0;
  const visible_available = visible_members.filter((member) => !added_user_ids.has(member.id)).length;

  return (
    <div className="binv-panel" role="tabpanel" id="binv-panel-members" aria-labelledby="binv-tab-members">
      {workspace_can_view && (
        <p className="binv-panel-note">
          <Info size={14} />
          <span>Everyone here can already open this board. Adding them makes them board members, they get notified and keep access if the board becomes private.</span>
        </p>
      )}

      <div className="binv-search">
        <Search size={16} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people, teams or job titles"
          aria-label="Search workspace members"
          className="binv-search-input"
          autoFocus
        />
        {query && (
          <button type="button" className="binv-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>

      {!has_results ? (
        <p className="binv-empty-results">
          {needle ? (
            <>
              No one matches &ldquo;{query.trim()}&rdquo;. Switch to <strong>Invite by email</strong> to invite someone new.
            </>
          ) : (
            "There is no one else in this workspace yet."
          )}
        </p>
      ) : (
        <div className="binv-pick-list">
          {visible_teams.length > 0 && (
            <>
              <div className="binv-list-label">Teams</div>
              {visible_teams.map((team) => {
                const selected_count = team.available_ids.filter((id) => selected_ids.has(id)).length;
                const pressed = team.available_ids.length > 0 && selected_count === team.available_ids.length ? "true" : selected_count > 0 ? "mixed" : "false";
                return (
                  <button
                    key={`team-${team.id}`}
                    type="button"
                    className="binv-pick-row"
                    aria-pressed={pressed}
                    disabled={team.available_ids.length === 0}
                    onClick={() => toggleTeam(team.available_ids)}
                  >
                    <span className="binv-check" aria-hidden="true">
                      {pressed === "mixed" ? <Minus size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="binv-team-icon">
                      <Users size={16} />
                    </span>
                    <span className="binv-person-text">
                      <span className="binv-person-name">
                        <span>{team.name}</span>
                      </span>
                      <span className="binv-person-meta">
                        {team.available_ids.length === 0
                          ? "Everyone in this team is already on the board"
                          : `Adds ${peopleLabel(team.available_ids.length)}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {visible_members.length > 0 && (
            <>
              <div className="binv-list-label">
                <span>People</span>
                {visible_available > 1 && (
                  <button type="button" className="binv-text-button" onClick={selectAllVisible}>
                    Select all {visible_available}
                  </button>
                )}
              </div>
              {visible_members.slice(0, MAX_VISIBLE_MEMBERS).map((member) => {
                const is_added = added_user_ids.has(member.id);
                const is_selected = selected_ids.has(member.id);
                const is_guest = member.role === "viewer";
                return (
                  <button
                    key={member.id}
                    type="button"
                    className="binv-pick-row"
                    aria-pressed={is_selected}
                    disabled={is_added}
                    onClick={() => toggleMember(member.id)}
                  >
                    <span className="binv-check" aria-hidden="true">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span className="binv-avatar-wrap">
                      <UserAvatar user={member} size={32} />
                    </span>
                    <span className="binv-person-text">
                      <span className="binv-person-name">
                        <span>{member.full_name}</span>
                      </span>
                      <span className="binv-person-meta">{member.job_title ? `${member.job_title}, ${member.email}` : member.email}</span>
                    </span>
                    {is_added ? (
                      <span className="binv-pill" data-tone="success">
                        <Check size={12} strokeWidth={3} />
                        On this board
                      </span>
                    ) : is_guest ? (
                      <span className="binv-pill" data-tone="info">
                        Guest
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {visible_members.length > MAX_VISIBLE_MEMBERS && (
                <p className="binv-empty-results">
                  Showing {MAX_VISIBLE_MEMBERS} of {visible_members.length}. Search to find someone specific.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {selected_members.length > 0 ? (
        <div className="binv-selection-bar">
          <span className="binv-stack" aria-hidden="true">
            {selected_members.slice(0, 4).map((member) => (
              <UserAvatar key={member.id} user={member} size={26} />
            ))}
            {selected_members.length > 4 && <span className="binv-stack-more">+{selected_members.length - 4}</span>}
          </span>
          <span className="binv-selection-text">
            <strong>{peopleLabel(selected_members.length)}</strong> selected
            {" · "}
            <button type="button" className="binv-text-button" onClick={() => setSelectedIds(new Set())}>
              Clear
            </button>
          </span>
          <button type="button" className="inv-button inv-button-primary" onClick={() => void submit()} disabled={is_busy}>
            {is_busy ? <span className="inv-spinner" aria-hidden="true" /> : <UserPlus size={16} />}
            Add to board
          </button>
        </div>
      ) : (
        <p className="binv-panel-note">
          <UserPlus size={14} />
          <span>
            {available_count === 0
              ? "Everyone in the workspace is already on this board."
              : `Pick people or a whole team, they get access right away. ${peopleLabel(available_count)} can still be added.`}
          </span>
        </p>
      )}
    </div>
  );
};

export default MemberPickerPanel;
