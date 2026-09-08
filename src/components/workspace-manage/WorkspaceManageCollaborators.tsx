"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { workspaceService } from "@/services/workspace.service";
import type { WorkspaceMember } from "@/types/workspace";
import type { ApiError } from "@/types/auth";
import type { WorkspaceMembershipRole } from "@/types/invitation";
import { ChevronRightIcon, CrownIcon, EyeIcon, MemberIcon, MoreDotsIcon, PlusIcon } from "@/icons/workspace-icons";
import CreatorAvatar from "@/components/content/CreatorAvatar";
import { gradientForId, initialsFromName } from "./creatorAvatar";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { SendInvitationModal } from "@/components/invitations";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import MemberOptionsMenu from "./MemberOptionsMenu";

export type WorkspaceManageCollaboratorsProps = {
  workspace_slug: string;
  /** Whether the current user may invite people into this workspace — the same gate as "Sent invitations" (owner or a privileged global role). */
  can_manage_workspace?: boolean;
};

const apiErrorMessage = (error: unknown, fallback: string): string => {
  const api_error = error as ApiError;
  const field_message = api_error?.errors ? Object.values(api_error.errors)[0]?.[0] : undefined;
  return field_message || api_error?.message || fallback;
};

/** Manage Workspace's "Collaborations" tab: the full member roster, each person's role, and — for an owner/admin — the controls to add, re-role, or remove a collaborator. */
const WorkspaceManageCollaborators: React.FC<WorkspaceManageCollaboratorsProps> = ({
  workspace_slug,
  can_manage_workspace = false,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [is_add_member_open, setIsAddMemberOpen] = useState(false);
  const [open_menu_member_id, setOpenMenuMemberId] = useState<number | null>(null);
  const [action_error, setActionError] = useState<string | null>(null);
  const [member_pending_removal, setMemberPendingRemoval] = useState<WorkspaceMember | null>(null);
  const menu_button_refs = useRef<Record<number, HTMLButtonElement | null>>({});

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

  const viewSentInvitations = () => router.push(`/invitations?workspace=${workspace_slug}`);

  const handleChangeRole = async (member: WorkspaceMember, role: WorkspaceMembershipRole) => {
    setActionError(null);
    const previous_members = members;
    setMembers((current) => current.map((m) => (m.id === member.id ? { ...m, role } : m)));

    try {
      const updated = await workspaceService.updateWorkspaceMemberRole(workspace_slug, member.id, { role });
      setMembers((current) => current.map((m) => (m.id === member.id ? updated : m)));
    } catch (error) {
      setMembers(previous_members);
      setActionError(apiErrorMessage(error, "We couldn't update that member's role."));
    }
  };

  const handleRemoveMember = async (member: WorkspaceMember) => {
    await workspaceService.removeWorkspaceMember(workspace_slug, member.id);
    setMembers((current) => current.filter((m) => m.id !== member.id));
  };

  const addMemberButton = can_manage_workspace && (
    <button
      type="button"
      onClick={() => setIsAddMemberOpen(true)}
      className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
    >
      <PlusIcon size={13} />
      Add member
    </button>
  );

  if (is_loading) return <BoardLoadingSpinner />;
  if (error) return <CenteredMessage title="Something went wrong" detail={error} />;

  if (members.length === 0) {
    return (
      <div className="pb-[60px]">
        <div className="flex items-center justify-center py-24 font-mono-accent text-[13px] tracking-[0.04em] text-shell-text-muted">
          [ no collaborators yet ]
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={viewSentInvitations}
            className="flex items-center gap-1 text-[12.5px] font-semibold text-shell-text-secondary transition-colors hover:text-shell-text"
          >
            View sent invitations
            <ChevronRightIcon size={10} />
          </button>
          {addMemberButton}
        </div>
        <SendInvitationModal
          is_open={is_add_member_open}
          onClose={() => setIsAddMemberOpen(false)}
          workspace_slug={workspace_slug}
          onSent={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="mt-2.5 pb-[60px]">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={viewSentInvitations}
          className="flex items-center gap-1 text-[12.5px] font-semibold text-shell-text-secondary transition-colors hover:text-shell-text"
        >
          View sent invitations
          <ChevronRightIcon size={10} />
        </button>
        {addMemberButton}
      </div>

      {action_error && (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
          {action_error}
        </div>
      )}

      {members.map((member, index) => {
        const [gradient_from, gradient_to] = gradientForId(member.id);
        const is_owner = member.role === "owner";
        const is_viewer = member.role === "viewer";
        const is_self = member.id === user?.id;
        const can_manage_this_member = can_manage_workspace && !is_self;

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
              photo_url={member.profile_photo_url}
              title={member.full_name}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-shell-text">
                {member.full_name}
                {is_self && <span className="ml-1.5 text-[12.5px] font-normal text-shell-text-faint">(You)</span>}
              </span>
              <span className="block truncate text-[12.5px] text-shell-text-faint">{member.email}</span>
            </span>
            {member.is_creator && (
              <span className="flex-none rounded-full border border-shell-border px-2.5 py-1 text-[11.5px] font-medium text-shell-text-faint">
                Creator
              </span>
            )}
            <span className="flex flex-none items-center gap-1.5 rounded-full border border-shell-border px-2.5 py-1 text-[12.5px] font-medium text-shell-text-secondary">
              {is_owner ? (
                <CrownIcon size={13} />
              ) : is_viewer ? (
                <EyeIcon size={13} />
              ) : (
                <MemberIcon size={13} />
              )}
              {member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : "Member"}
            </span>
            {can_manage_this_member && (
              <>
                <button
                  ref={(el) => {
                    menu_button_refs.current[member.id] = el;
                  }}
                  type="button"
                  onClick={() => setOpenMenuMemberId((current) => (current === member.id ? null : member.id))}
                  aria-label={`Manage ${member.full_name}`}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-shell-text-secondary hover:bg-shell-hover"
                >
                  <MoreDotsIcon size={15} />
                </button>
                <MemberOptionsMenu
                  anchor_el={menu_button_refs.current[member.id] ?? null}
                  is_open={open_menu_member_id === member.id}
                  onClose={() => setOpenMenuMemberId(null)}
                  current_role={member.role}
                  can_remove={!member.is_creator}
                  onChangeRole={(role) => handleChangeRole(member, role)}
                  onRemove={() => setMemberPendingRemoval(member)}
                />
              </>
            )}
          </div>
        );
      })}

      <SendInvitationModal
        is_open={is_add_member_open}
        onClose={() => setIsAddMemberOpen(false)}
        workspace_slug={workspace_slug}
        onSent={() => {}}
      />

      <ConfirmActionModal
        is_open={member_pending_removal !== null}
        title="Remove from workspace"
        description={
          <>
            <span className="font-medium text-shell-text">{member_pending_removal?.full_name}</span> will lose
            access to this workspace and everything in it.
          </>
        }
        confirm_label="Remove member"
        danger
        onConfirm={() => {
          if (member_pending_removal) return handleRemoveMember(member_pending_removal);
        }}
        onClose={() => setMemberPendingRemoval(null)}
      />
    </div>
  );
};

export default WorkspaceManageCollaborators;
