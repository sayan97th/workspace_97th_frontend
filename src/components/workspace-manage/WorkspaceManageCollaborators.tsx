"use client";
import React, { useEffect, useState } from "react";
import { workspaceService } from "@/services/workspace.service";
import type { WorkspaceMember } from "@/types/workspace";
import { CrownIcon, MemberIcon } from "@/icons/workspace-icons";
import CreatorAvatar from "@/components/content/CreatorAvatar";
import { gradientForId, initialsFromName } from "./creatorAvatar";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";

export type WorkspaceManageCollaboratorsProps = {
  workspace_slug: string;
};

/** Manage Workspace's "Collaborations" tab: the full member roster and each person's role. */
const WorkspaceManageCollaborators: React.FC<WorkspaceManageCollaboratorsProps> = ({ workspace_slug }) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    workspaceService
      .getWorkspaceMembers(workspace_slug)
      .then((data) => {
        if (!cancelled) setMembers(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load workspace members.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspace_slug]);

  if (is_loading) return <BoardLoadingSpinner />;
  if (error) return <CenteredMessage title="Something went wrong" detail={error} />;

  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 font-mono-accent text-[13px] tracking-[0.04em] text-shell-text-muted">
        [ no collaborators yet ]
      </div>
    );
  }

  return (
    <div className="mt-2.5 pb-[60px]">
      {members.map((member, index) => {
        const [gradient_from, gradient_to] = gradientForId(member.id);
        const is_owner = member.role === "owner";
        return (
          <div
            key={member.id}
            className={`flex items-center gap-3.5 rounded-lg px-2 py-[15px] ${
              index < members.length - 1 ? "border-b border-shell-border" : ""
            }`}
          >
            <CreatorAvatar
              initials={initialsFromName(member.full_name)}
              gradient_from={gradient_from}
              gradient_to={gradient_to}
              title={member.full_name}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-shell-text">{member.full_name}</span>
              <span className="block truncate text-[12.5px] text-shell-text-faint">{member.email}</span>
            </span>
            <span className="flex flex-none items-center gap-1.5 rounded-full border border-shell-border px-2.5 py-1 text-[12.5px] font-medium text-shell-text-secondary">
              {is_owner ? <CrownIcon size={13} /> : <MemberIcon size={13} />}
              {member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : "Member"}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default WorkspaceManageCollaborators;
