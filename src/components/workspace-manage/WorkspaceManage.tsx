"use client";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  ClockIcon,
  CollaboratorsIcon,
  ContentTabIcon,
  BoardGridIcon,
  HomeFilledIcon,
  MemberIcon,
  MoreDotsIcon,
  PermissionsIcon,
} from "@/icons/workspace-icons";
import {
  ChangeWorkspaceTypeModal,
  NavItemFormModal,
  WorkspaceOptionsMenu,
} from "@/components/workspace-nav";
import EditWorkspaceModal, {
  type EditWorkspaceSubmission,
} from "@/layout/EditWorkspaceModal";
import type { WorkspaceViewProps } from "@/components/workspace-nav/TableBoardView";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import InfoDropdown from "@/components/ui/dropdown/InfoDropdown";
import { useAuth } from "@/context/AuthContext";
import { INVITATION_MANAGER_ROLES } from "@/components/invitations";
import { WORKSPACE_PERMISSIONS_MANAGER_ROLES } from "@/components/permissions";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { useWorkspaceDetail } from "./useWorkspaceDetail";
import WorkspaceManageRecents from "./WorkspaceManageRecents";
import WorkspaceManageContent from "./WorkspaceManageContent";
import WorkspaceManagePermissions from "./WorkspaceManagePermissions";
import WorkspaceManageCollaborators from "./WorkspaceManageCollaborators";
import TransferOwnershipModal from "./TransferOwnershipModal";
import WorkspaceCover from "./WorkspaceCover";
import "./workspace-manage.css";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import type { TransferOwnershipPayload } from "@/types/workspace";
import { DEFAULT_WORKSPACE_MANAGE_TAB, WORKSPACE_MANAGE_TAB_LABELS, type WorkspaceManageTabId } from "./tab-routing";

type TabId = WorkspaceManageTabId;

type TabDefinition = {
  id: TabId;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
};

/** Which single-field/confirm dialog the "…" menu currently has open. */
type OptionsDialog = "edit" | "rename" | "change-type" | "transfer-ownership" | "leave" | "delete" | null;

const WORKSPACE_TABS: TabDefinition[] = [
  { id: "recents", label: WORKSPACE_MANAGE_TAB_LABELS.recents, Icon: ClockIcon },
  { id: "content", label: WORKSPACE_MANAGE_TAB_LABELS.content, Icon: ContentTabIcon },
  { id: "collaborators", label: WORKSPACE_MANAGE_TAB_LABELS.collaborators, Icon: CollaboratorsIcon },
  { id: "permissions", label: WORKSPACE_MANAGE_TAB_LABELS.permissions, Icon: PermissionsIcon },
];

/**
 * "Manage Workspace" — every workspace's settings/overview hub: a summary of
 * its recent activity, all its content, its collaborators, and the default
 * permission matrix applied to it. Registered under `view_key:
 * "workspace_manage"` (see `view-registry.tsx`), so it renders through the
 * same generic `/boards/{id}` route as every other board — that's what gives
 * it a real, always-correct `workspace_slug` instead of guessing at an
 * independently-selected "active workspace".
 */
export type WorkspaceManageProps = WorkspaceViewProps & {
  /**
   * Active tab, controlled by the `/workspaces/{workspace_id}/{tab}` route
   * (see `WorkspaceManageRouteContext`). Falls back to internal state when
   * omitted, e.g. if this ever renders through the generic `/boards/{id}`
   * path without a route wrapper.
   */
  active_tab?: TabId;
  /** Called when the user switches tabs; required alongside `active_tab` to drive the URL from the route wrapper. */
  onTabChange?: (tab: TabId) => void;
};

const WorkspaceManage: React.FC<WorkspaceManageProps> = ({
  node,
  workspace_slug,
  active_tab: controlled_active_tab,
  onTabChange,
}) => {
  const router = useRouter();
  const { hasAnyRole } = useAuth();
  const {
    workspace,
    is_loading,
    error,
    updateWorkspace,
    uploadWorkspaceAvatar,
    removeWorkspaceAvatar,
    uploadWorkspaceCover,
    repositionWorkspaceCover,
    removeWorkspaceCover,
    leaveWorkspace,
    deleteWorkspace,
    transferOwnership,
  } = useWorkspaceDetail(workspace_slug);

  const [internal_active_tab, setInternalActiveTab] = useState<TabId>(DEFAULT_WORKSPACE_MANAGE_TAB);
  const active_tab = controlled_active_tab ?? internal_active_tab;
  const setActiveTab = (tab: TabId) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };
  const [is_options_open, setIsOptionsOpen] = useState(false);
  const [is_info_open, setIsInfoOpen] = useState(false);
  const [open_dialog, setOpenDialog] = useState<OptionsDialog>(null);
  const [collaborators_refresh_key, setCollaboratorsRefreshKey] = useState(0);
  const options_button_ref = useRef<HTMLButtonElement>(null);
  const info_button_ref = useRef<HTMLButtonElement>(null);

  if (is_loading && !workspace) return <BoardLoadingSpinner />;
  if (error || !workspace) {
    return (
      <CenteredMessage
        title="Something went wrong"
        detail={error ?? "We couldn't load this workspace."}
      />
    );
  }

  const workspace_name = workspace.name;
  const workspace_mono = workspace.mono;
  const workspace_color = workspace.color;
  const workspace_avatar_url = workspace.avatar_url ?? workspace.avatar_thumbnail_url;
  const can_manage_workspace = workspace.role?.toLowerCase() === "owner";
  // Changing the cover follows the same gate as the avatar on the API
  // (`AuthorizesWorkspaceManagement`): the owner or a privileged global role.
  const can_manage_cover = can_manage_workspace || hasAnyRole(...INVITATION_MANAGER_ROLES);
  // Inviting/removing collaborators is broader than owner-only rename/delete: it also
  // opens up to a privileged global role, mirroring the "Sent invitations" view's own gate
  // (see `AuthorizesWorkspaceManagement` on the backend and `canManageWorkspaceInvitations`).
  const can_manage_collaborators = can_manage_workspace || hasAnyRole(...INVITATION_MANAGER_ROLES);
  // The Permissions tab configures the default workspace-role matrix shared
  // across every workspace, not this workspace's own settings — so its gate
  // is a straight global-role check, mirroring the API's
  // `role:super_admin,admin,staff` floor on `/workspace-permissions`
  // (see `WORKSPACE_PERMISSIONS_MANAGER_ROLES`), not workspace ownership.
  const can_manage_permissions = hasAnyRole(...WORKSPACE_PERMISSIONS_MANAGER_ROLES);

  const closeDialog = () => setOpenDialog(null);

  const handleRename = async (name: string) => {
    await updateWorkspace({ name });
  };

  const handleEditWorkspace = async (
    _workspace_slug: string,
    submission: EditWorkspaceSubmission
  ) => {
    await updateWorkspace({
      name: submission.name,
      mono: submission.name[0]?.toUpperCase() ?? "W",
      color: submission.color,
      privacy: submission.privacy,
    });
    if (submission.avatar_change instanceof File) {
      await uploadWorkspaceAvatar(submission.avatar_change);
    } else if (submission.avatar_change === "remove") {
      await removeWorkspaceAvatar();
    }
  };

  const handleChangeType = async (privacy: "open" | "closed") => {
    await updateWorkspace({ privacy });
  };

  const handleTransferOwnership = async (payload: TransferOwnershipPayload) => {
    const result = await transferOwnership(payload);
    if (result.left) {
      router.push("/");
    } else {
      setCollaboratorsRefreshKey((key) => key + 1);
    }
  };

  const handleLeave = async () => {
    await leaveWorkspace();
    router.push("/");
  };

  const handleDelete = async () => {
    await deleteWorkspace();
    router.push("/");
  };

  return (
    <div className="workspace-manage-theme min-h-full bg-shell-bg">
      <WorkspaceCover
        cover_url={workspace.cover_url}
        cover_position_y={workspace.cover_position_y}
        can_manage={can_manage_cover}
        onUpload={(file) => uploadWorkspaceCover(file)}
        onReposition={repositionWorkspaceCover}
        onRemove={removeWorkspaceCover}
      />

      <div className="px-4 sm:px-8 xl:px-16">
        {/* Workspace header: logo overlapping the cover, title, actions. */}
        <div className="relative flex items-start gap-4 sm:gap-6">
          <div className="relative -mt-9 flex-none">
            <div
              className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-[14px] border-4 border-shell-bg bg-brand-500 shadow-[0_4px_12px_rgba(0,0,0,0.16)] sm:h-[108px] sm:w-[108px] sm:rounded-[16px]"
              style={!workspace_avatar_url && workspace_color ? { backgroundColor: workspace_color } : undefined}
            >
              {workspace_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary user uploaded URLs, not static app assets.
                <img src={workspace_avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-heading text-[34px] font-semibold tracking-[-0.03em] text-white sm:text-[48px]">
                  {workspace_mono}
                </span>
              )}
            </div>
            {workspace.is_home && (
              <span
                title="Home workspace"
                className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-[8px] bg-shell-bg text-shell-text shadow-[0_1px_4px_rgba(0,0,0,0.12)] sm:h-8 sm:w-8"
              >
                <HomeFilledIcon size={20} />
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-5 gap-y-3 pt-3 sm:pt-5">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="m-0 truncate font-heading text-[24px] font-medium leading-[40px] tracking-[-0.2px] text-shell-text sm:text-[32px]">
                {workspace_name}
              </h1>
              <button
                ref={info_button_ref}
                type="button"
                onClick={() => setIsInfoOpen((open) => !open)}
                aria-label="Workspace info"
                aria-expanded={is_info_open}
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-[4px] text-shell-text transition-colors hover:bg-shell-hover-strong ${
                  is_info_open ? "bg-shell-hover-strong" : ""
                }`}
              >
                <ChevronDownIcon size={20} className={`transition-transform ${is_info_open ? "rotate-180" : ""}`} />
              </button>
              <InfoDropdown
                anchor_el={info_button_ref.current}
                is_open={is_info_open}
                onClose={() => setIsInfoOpen(false)}
                title={workspace_name}
                section_label="Workspace info"
                width={400}
                rows={[
                  {
                    key: "type",
                    label: "Workspace type",
                    value: (
                      <>
                        <BoardGridIcon size={15} className="flex-none text-shell-text-muted" />
                        <span className="flex-1">
                          {workspace.privacy === "closed" ? "Closed workspace" : "Open workspace"}
                        </span>
                        {can_manage_workspace && (
                          <ChevronDownIcon size={13} className="flex-none text-shell-text-faint" />
                        )}
                      </>
                    ),
                    onClick: can_manage_workspace
                      ? () => {
                          setIsInfoOpen(false);
                          setOpenDialog("change-type");
                        }
                      : undefined,
                  },
                  {
                    key: "members",
                    label: "Members",
                    value: (
                      <>
                        {workspace.privacy === "closed" && (
                          <MemberIcon size={15} className="flex-none text-shell-text-muted" />
                        )}
                        <span className="flex-1">
                          {workspace.privacy === "closed"
                            ? "Invite only, managed from Collaborators"
                            : "All members in monday"}
                        </span>
                      </>
                    ),
                  },
                ]}
              />
            </div>

            {/* "Feedback" and "Agents" are intentionally hidden for now, by client request. */}
            <div className="flex flex-none items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("collaborators")}
                className="h-8 rounded-[4px] border border-shell-border-strong px-2.5 text-[14px] text-shell-text transition-colors hover:bg-shell-hover"
              >
                Members
              </button>
              <button
                ref={options_button_ref}
                type="button"
                onClick={() => setIsOptionsOpen((open) => !open)}
                className={`flex h-8 w-8 items-center justify-center rounded-[4px] text-shell-text transition-colors hover:bg-shell-hover-strong ${
                  is_options_open ? "bg-[var(--color-workspace-manage-selected)]" : ""
                }`}
                aria-label="More workspace actions"
                aria-expanded={is_options_open}
              >
                <MoreDotsIcon size={18} />
              </button>
              <WorkspaceOptionsMenu
                anchor_el={options_button_ref.current}
                is_open={is_options_open}
                onClose={() => setIsOptionsOpen(false)}
                can_manage={can_manage_workspace}
                show_disabled_actions
                onEdit={() => setOpenDialog("edit")}
                onRename={() => setOpenDialog("rename")}
                onChangeType={() => setOpenDialog("change-type")}
                onTransferOwnership={() => setOpenDialog("transfer-ownership")}
                onLeave={() => setOpenDialog("leave")}
                onDelete={() => setOpenDialog("delete")}
              />
              <EditWorkspaceModal
                is_open={open_dialog === "edit"}
                workspace={{
                  id: workspace.slug,
                  name: workspace_name,
                  color: workspace_color,
                  avatar_url: workspace.avatar_thumbnail_url ?? workspace.avatar_url,
                  privacy: workspace.privacy,
                }}
                onSave={handleEditWorkspace}
                onClose={closeDialog}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" className="mt-6 flex gap-1 overflow-x-auto border-b border-shell-border">
          {WORKSPACE_TABS.map(({ id, label, Icon }) => {
            const is_active = active_tab === id;
            // The Permissions tab stays visible for every member, but is
            // rendered disabled (greyed out, unclickable) for anyone without
            // WORKSPACE_PERMISSIONS_MANAGER_ROLES, see `can_manage_permissions`.
            const is_disabled = id === "permissions" && !can_manage_permissions;
            const tab_button = (
              <button
                type="button"
                role="tab"
                aria-selected={is_active}
                onClick={() => !is_disabled && setActiveTab(id)}
                disabled={is_disabled}
                aria-disabled={is_disabled}
                className={`group -mb-px flex h-10 flex-none items-center border-b-2 pb-1 pt-1 text-[16px] ${
                  is_disabled
                    ? "cursor-not-allowed border-transparent text-shell-text-faint"
                    : is_active
                      ? "border-[var(--color-workspace-manage-accent)] text-shell-text"
                      : "border-transparent text-shell-text"
                }`}
              >
                <span
                  className={`flex items-center gap-2 rounded-[4px] px-3 py-1 transition-colors ${
                    is_disabled || is_active ? "" : "group-hover:bg-shell-hover-strong"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </span>
              </button>
            );

            return (
              <Tooltip
                key={id}
                disabled={!is_disabled}
                content="Only workspace administrators and staff can manage permissions in this workspace."
              >
                {tab_button}
              </Tooltip>
            );
          })}
        </div>

        {/* Tab panels */}
        {active_tab === "recents" && <WorkspaceManageRecents workspace_slug={workspace.slug} />}
        {active_tab === "content" && <WorkspaceManageContent />}
        {active_tab === "permissions" && (
          <WorkspaceManagePermissions can_manage={can_manage_permissions} />
        )}
        {active_tab === "collaborators" && (
          <WorkspaceManageCollaborators
            key={collaborators_refresh_key}
            workspace_slug={workspace.slug}
            can_manage_workspace={can_manage_collaborators}
          />
        )}
      </div>

      <NavItemFormModal
        is_open={open_dialog === "rename"}
        title="Rename workspace"
        submit_label="Rename"
        initial_label={workspace_name}
        placeholder="Workspace name"
        onSubmit={handleRename}
        onClose={closeDialog}
      />

      <ChangeWorkspaceTypeModal
        is_open={open_dialog === "change-type"}
        initial_privacy={workspace.privacy}
        onSubmit={handleChangeType}
        onClose={closeDialog}
      />

      <TransferOwnershipModal
        is_open={open_dialog === "transfer-ownership"}
        workspace_slug={workspace.slug}
        workspace_name={workspace_name}
        onSubmit={handleTransferOwnership}
        onClose={closeDialog}
      />

      <ConfirmActionModal
        is_open={open_dialog === "leave"}
        title="Leave workspace"
        description={`Are you sure you want to leave "${workspace_name}"?`}
        confirm_label="Leave workspace"
        variant="warning"
        risk_items={[
          `You'll immediately lose access to every board, file, and conversation in "${workspace_name}".`,
          "Boards or items assigned to you will stay assigned, but you won't be able to view or update them.",
          "You can only get back in if an owner invites you again.",
          ...(can_manage_workspace
            ? ["You're an owner here. If you're the only one, assign another owner first."]
            : []),
        ]}
        onConfirm={handleLeave}
        onClose={closeDialog}
      />

      <ConfirmActionModal
        is_open={open_dialog === "delete"}
        title="Delete workspace"
        description={`Are you sure you want to delete "${workspace_name}"?`}
        confirm_label="Delete workspace"
        danger
        risk_items={[
          "Every board, file, and conversation in this workspace will be moved to trash for all members.",
          "Members lose access immediately, including anyone currently viewing it.",
          "You can restore it from Trash within 30 days. After that, it's gone for good.",
        ]}
        onConfirm={handleDelete}
        onClose={closeDialog}
      />
    </div>
  );
};

export default WorkspaceManage;
