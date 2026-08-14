import React from "react";
import { PersonAvatar } from "@/components/board";
import { CloseIcon } from "@/icons/board-icons";
import type { TeamMember } from "./types";

export type TeamMembersTableProps = {
  members: TeamMember[];
  /** Shown when `members` is empty, e.g. after a search with no matches. */
  empty_label?: string;
  /** Renders a hover "remove" action per row when given — omit for read-only listings like the "All members" dedupe. */
  onRemoveMember?: (member: TeamMember) => void;
};

/**
 * Name / Email / Title member list shared by every Teams-view member listing (a single
 * team's roster, or the "All members" dedupe across teams) so both render identically.
 */
const TeamMembersTable: React.FC<TeamMembersTableProps> = ({
  members,
  empty_label = "No people match your search.",
  onRemoveMember,
}) => (
  <div>
    <div className="flex items-center px-[10px] py-2 text-[11.5px] font-semibold tracking-[0.04em] text-shell-text-faint">
      <span className="w-[230px] flex-none">Name</span>
      <span className="min-w-0 flex-1">Email</span>
      <span className="w-[200px] flex-none">Title</span>
      {onRemoveMember ? <span className="w-9 flex-none" /> : null}
    </div>

    {members.map((member) => (
      <div
        key={member.id}
        className="group flex items-center rounded-[9px] px-[10px] py-[9px] transition-colors hover:bg-shell-hover"
      >
        <span className="flex w-[230px] min-w-0 flex-none items-center gap-[9px]">
          <PersonAvatar person={member} size={28} />
          <span className="truncate text-[13.5px] font-medium text-shell-text">{member.name}</span>
          {member.is_owner ? (
            <span className="flex-none rounded-[5px] bg-warning-500/[0.16] px-[7px] py-0.5 text-[10.5px] font-bold tracking-[0.03em] text-warning-500">
              OWNER
            </span>
          ) : null}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-shell-text-muted">{member.email}</span>
        <span className="w-[200px] flex-none truncate text-[13px] text-shell-text-muted">
          {member.title ?? "—"}
        </span>
        {onRemoveMember ? (
          <span className="flex w-9 flex-none justify-end">
            <button
              type="button"
              onClick={() => onRemoveMember(member)}
              aria-label={`Remove ${member.name} from this team`}
              className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-shell-text-muted opacity-0 transition-opacity hover:bg-shell-hover-strong hover:text-brand-200 group-hover:opacity-100"
            >
              <CloseIcon size={13} />
            </button>
          </span>
        ) : null}
      </div>
    ))}

    {members.length === 0 ? (
      <div className="px-[10px] py-10 text-center text-[13px] text-shell-text-faint">{empty_label}</div>
    ) : null}
  </div>
);

export default TeamMembersTable;
