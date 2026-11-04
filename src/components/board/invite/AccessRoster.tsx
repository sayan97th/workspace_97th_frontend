"use client";

import React, { useMemo, useState } from "react";
import { Building2, ChevronDown, Crown, Mail, RotateCw, Search, UserMinus, Users, X } from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import type { BoardAccessEntry, BoardWorkspaceAccess } from "@/types/board-invitation";
import { expiresLabel, peopleLabel, ROSTER_GROUPS, rosterGroupOf, sentLabel, type RosterFilter } from "./boardInviteUtils";

/** Past this many rows the roster offers its own search box. */
const SEARCH_THRESHOLD = 8;

export type AccessRosterProps = {
  entries: BoardAccessEntry[];
  /** Null while the full roster is still loading. */
  workspace_access: BoardWorkspaceAccess | null;
  workspace_name: string;
  current_user_id: number | null;
  can_manage: boolean;
  /** Key of the row with a remove or resend in flight. */
  busy_key: string | null;
  /** Keys of rows added in this session, they glow once. */
  fresh_keys: Set<string>;
  onRemove: (entry: BoardAccessEntry) => Promise<void>;
  onResend: (entry: BoardAccessEntry) => Promise<void>;
};

const entryMatches = (entry: BoardAccessEntry, needle: string): boolean =>
  (entry.full_name ?? "").toLowerCase().includes(needle) || entry.email.toLowerCase().includes(needle);

const PersonRow: React.FC<{
  entry: BoardAccessEntry;
  is_you: boolean;
  is_fresh: boolean;
  can_manage: boolean;
  is_busy: boolean;
  onRemove?: () => void;
  onResend?: () => void;
}> = ({ entry, is_you, is_fresh, can_manage, is_busy, onRemove, onResend }) => {
  const [is_confirming, setIsConfirming] = useState(false);
  const is_pending = entry.kind === "invitation";
  const display_name = entry.full_name ?? entry.email;

  const meta = is_pending
    ? [sentLabel(entry.invited_at), entry.invited_by_name ? `by ${entry.invited_by_name}` : null, expiresLabel(entry.expires_at)]
        .filter(Boolean)
        .join(" · ") || "Invitation pending"
    : entry.job_title
      ? `${entry.job_title}, ${entry.email}`
      : entry.email;

  const pill = (() => {
    if (entry.kind === "owner") {
      return (
        <span className="binv-pill" data-tone="warning" title="Board owner, manages who has access">
          <Crown size={12} fill="currentColor" />
          Owner
        </span>
      );
    }
    if (is_pending) {
      return (
        <span className="binv-pill" data-tone="warning">
          Pending
        </span>
      );
    }
    if (entry.kind === "member") {
      return (
        <span className="binv-pill" data-tone="neutral" title="Can open this board through the workspace">
          {entry.is_guest ? "Guest" : "Workspace"}
        </span>
      );
    }
    return entry.is_guest ? (
      <span className="binv-pill" data-tone="info" title="Sees only the boards they were invited to">
        Guest
      </span>
    ) : (
      <span className="binv-pill" data-tone="brand" title="Added to this board">
        Member
      </span>
    );
  })();

  const can_remove = can_manage && entry.removable && Boolean(onRemove);

  return (
    <li className="binv-person" data-fresh={is_fresh ? "true" : "false"} data-confirming={is_confirming ? "true" : "false"}>
      {is_pending ? (
        <span className="binv-pending-avatar" style={{ width: 36, height: 36 }}>
          <Mail size={16} />
        </span>
      ) : (
        <span className="binv-avatar-wrap">
          <UserAvatar user={{ full_name: display_name, profile_photo_url: entry.profile_photo_url }} size={36} />
        </span>
      )}
      <span className="binv-person-text">
        <span className="binv-person-name">
          <span>{display_name}</span>
          {is_you && <span className="binv-you">You</span>}
        </span>
        <span className="binv-person-meta">{meta}</span>
      </span>

      {is_confirming ? (
        <span className="binv-confirm">
          <span>{is_pending ? "Revoke invite?" : "Remove access?"}</span>
          <button type="button" className="binv-confirm-button" data-tone="neutral" onClick={() => setIsConfirming(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="binv-confirm-button"
            data-tone="danger"
            disabled={is_busy}
            onClick={() => {
              setIsConfirming(false);
              onRemove?.();
            }}
            autoFocus
          >
            {is_pending ? "Revoke" : "Remove"}
          </button>
        </span>
      ) : (
        <>
          {pill}
          {can_manage && (is_pending || can_remove) && (
            <span className="binv-person-actions">
              {is_pending && onResend && (
                <button type="button" className="binv-icon-button" onClick={onResend} disabled={is_busy} aria-label={`Resend invitation to ${entry.email}`} title="Resend invitation">
                  <RotateCw size={15} className={is_busy ? "animate-spin" : undefined} />
                </button>
              )}
              {can_remove && (
                <button
                  type="button"
                  className="binv-icon-button"
                  data-tone="danger"
                  onClick={() => setIsConfirming(true)}
                  disabled={is_busy}
                  aria-label={is_pending ? `Revoke invitation to ${entry.email}` : `Remove ${display_name}`}
                  title={is_pending ? "Revoke invitation" : "Remove from board"}
                >
                  {is_pending ? <X size={16} /> : <UserMinus size={16} />}
                </button>
              )}
            </span>
          )}
        </>
      )}
    </li>
  );
};

/**
 * "People with access" roster of the board invite dialog. Everyone added on purpose is grouped
 * into Owners, Board members, Guests and Pending invitations, with filter chips and (for long
 * lists) a search box. People who see the board only through the workspace are folded into one
 * "Everyone at {workspace}" card that expands into the full list.
 */
const AccessRoster: React.FC<AccessRosterProps> = ({
  entries,
  workspace_access,
  workspace_name,
  current_user_id,
  can_manage,
  busy_key,
  fresh_keys,
  onRemove,
  onResend,
}) => {
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [query, setQuery] = useState("");
  const [is_workspace_open, setIsWorkspaceOpen] = useState(false);

  const workspace_members = workspace_access?.members ?? [];
  const total = entries.length + workspace_members.length;
  const needle = query.trim().toLowerCase();

  const counts = useMemo(() => {
    const next: Record<RosterFilter, number> = { all: entries.length, owners: 0, members: 0, guests: 0, pending: 0 };
    entries.forEach((entry) => {
      next[rosterGroupOf(entry)] += 1;
    });
    return next;
  }, [entries]);

  const visible_entries = entries.filter(
    (entry) => (filter === "all" || rosterGroupOf(entry) === filter) && (!needle || entryMatches(entry, needle))
  );
  const visible_workspace_members = workspace_members.filter((entry) => !needle || entryMatches(entry, needle));
  const show_workspace_card = (filter === "all" || filter === "members") && workspace_access?.applies && workspace_members.length > 0;

  // While searching, matching workspace members are shown without opening the card by hand.
  const is_workspace_expanded = is_workspace_open || (needle.length > 0 && visible_workspace_members.length > 0);
  const filters = (["all", ...ROSTER_GROUPS.map((group) => group.id)] as RosterFilter[]).filter(
    (id) => id === "all" || counts[id] > 0
  );

  return (
    <section aria-labelledby="binv-roster-title">
      <div className="binv-roster-head">
        <h3 id="binv-roster-title" className="binv-roster-title">
          People with access
          <span className="binv-count" aria-label={`${total} in total`}>
            {total}
          </span>
        </h3>
        {filters.length > 2 && (
          <div className="binv-filters" role="group" aria-label="Filter people">
            {filters.map((id) => (
              <button key={id} type="button" className="binv-filter" aria-pressed={filter === id} onClick={() => setFilter(id)}>
                {id === "all" ? "All" : ROSTER_GROUPS.find((group) => group.id === id)?.short_label}
                <span>{counts[id]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {total > SEARCH_THRESHOLD && (
        <div className="binv-search" style={{ marginTop: 10 }}>
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find someone with access"
            aria-label="Find someone with access"
            className="binv-search-input"
          />
          {query && (
            <button type="button" className="binv-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {ROSTER_GROUPS.map((group) => {
        const rows = visible_entries.filter((entry) => rosterGroupOf(entry) === group.id);
        if (rows.length === 0) return null;
        return (
          <div key={group.id} className="binv-group">
            <div className="binv-group-label">
              {group.label} · {rows.length}
            </div>
            <ul className="binv-roster">
              {rows.map((entry) => (
                <PersonRow
                  key={entry.key}
                  entry={entry}
                  is_you={entry.kind !== "invitation" && entry.id === current_user_id}
                  is_fresh={fresh_keys.has(entry.key)}
                  can_manage={can_manage}
                  is_busy={busy_key === entry.key}
                  onRemove={() => void onRemove(entry)}
                  onResend={entry.kind === "invitation" ? () => void onResend(entry) : undefined}
                />
              ))}
            </ul>
          </div>
        );
      })}

      {visible_entries.length === 0 && !show_workspace_card && (
        <div className="binv-roster-empty">
          <Users size={22} />
          {needle ? `No one with access matches "${query.trim()}".` : "No one has been added to this board yet."}
        </div>
      )}

      {workspace_access === null && <div className="binv-skeleton" style={{ marginTop: 8 }} aria-hidden="true" />}

      {show_workspace_card && (!needle || visible_workspace_members.length > 0) && (
        <div className="binv-workspace-card">
          <button
            type="button"
            className="binv-workspace-toggle"
            aria-expanded={is_workspace_expanded}
            aria-controls="binv-workspace-list"
            onClick={() => setIsWorkspaceOpen((current) => !current)}
          >
            <span className="binv-workspace-icon">
              <Building2 size={18} />
            </span>
            <span className="binv-person-text">
              <span className="binv-person-name">
                <span>Everyone at {workspace_name}</span>
              </span>
              <span className="binv-person-meta">
                {peopleLabel(workspace_members.length)} more can open it through the workspace
              </span>
            </span>
            <span className="binv-stack" aria-hidden="true">
              {workspace_members.slice(0, 3).map((entry) => (
                <UserAvatar key={entry.key} user={{ full_name: entry.full_name ?? entry.email, profile_photo_url: entry.profile_photo_url }} size={26} />
              ))}
              {workspace_members.length > 3 && <span className="binv-stack-more">+{workspace_members.length - 3}</span>}
            </span>
            <ChevronDown size={18} />
          </button>
          {is_workspace_expanded && (
            <ul id="binv-workspace-list" className="binv-roster binv-workspace-list">
              {visible_workspace_members.map((entry) => (
                <PersonRow
                  key={entry.key}
                  entry={entry}
                  is_you={entry.id === current_user_id}
                  is_fresh={false}
                  can_manage={false}
                  is_busy={false}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

export default AccessRoster;
