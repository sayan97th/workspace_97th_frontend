"use client";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChatBubbleIcon,
  ChevronDownIcon,
  ClockIcon,
  CollaboratorsIcon,
  ContentTabIcon,
  BoardGridIcon,
  MemberIcon,
  MoreDotsIcon,
  PermissionsIcon,
  PersonIcon,
} from "@/icons/workspace-icons";
import {
  ChangeWorkspaceTypeModal,
  NavItemFormModal,
  WorkspaceOptionsMenu,
} from "@/components/workspace-nav";
import type { WorkspaceViewProps } from "@/components/workspace-nav/TableBoardView";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import InfoDropdown from "@/components/ui/dropdown/InfoDropdown";
import { useWorkspaceDetail } from "./useWorkspaceDetail";
import WorkspaceManageRecents from "./WorkspaceManageRecents";
import WorkspaceManageContent from "./WorkspaceManageContent";
import WorkspaceManagePermissions from "./WorkspaceManagePermissions";
import WorkspaceManageCollaborators from "./WorkspaceManageCollaborators";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";

type TabId = "recents" | "content" | "collaborators" | "permissions";

type TabDefinition = {
  id: TabId;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
};

/** Which single-field/confirm dialog the "…" menu currently has open. */
type OptionsDialog = "rename" | "change-type" | "leave" | "delete" | null;

const WORKSPACE_TABS: TabDefinition[] = [
  { id: "recents", label: "Recents", Icon: ClockIcon },
  { id: "content", label: "Content", Icon: ContentTabIcon },
  { id: "collaborators", label: "Collaborators", Icon: CollaboratorsIcon },
  { id: "permissions", label: "Permissions", Icon: PermissionsIcon },
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
const WorkspaceManage: React.FC<WorkspaceViewProps> = ({ node, workspace_slug }) => {
  const router = useRouter();
  const { workspace, is_loading, error, updateWorkspace, leaveWorkspace, deleteWorkspace } =
    useWorkspaceDetail(workspace_slug);

  const [active_tab, setActiveTab] = useState<TabId>("recents");
  const [is_options_open, setIsOptionsOpen] = useState(false);
  const [is_info_open, setIsInfoOpen] = useState(false);
  const [open_dialog, setOpenDialog] = useState<OptionsDialog>(null);
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
  const can_manage_workspace = workspace.role?.toLowerCase() === "owner";

  const closeDialog = () => setOpenDialog(null);

  const handleRename = async (name: string) => {
    await updateWorkspace({ name });
  };

  const handleChangeType = async (privacy: "open" | "closed") => {
    await updateWorkspace({ privacy });
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
    <div className="min-h-full bg-shell-bg">
      {/* Cover banner — placeholder gradient, matches the approved workspace design. */}
      <div className="relative h-[170px] w-full overflow-hidden bg-[linear-gradient(115deg,#0A1717_0%,#1C2B2E_38%,#3A4A4D_60%,#D8DCDB_100%)]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(108deg,rgba(255,255,255,0.05)_0_2px,transparent_2px_22px)]" />
      </div>

      <div className="px-10">
        {/* Workspace header block */}
        <div className="relative flex items-start gap-[18px]">
          <div
            className="-mt-11 flex h-[88px] w-[88px] flex-none items-center justify-center rounded-[18px] border-[3px] border-shell-bg bg-brand-500 shadow-[0_10px_30px_rgba(10,23,23,0.28)]"
            style={workspace_color ? { backgroundColor: workspace_color } : undefined}
          >
            <span className="font-outfit text-[38px] font-bold tracking-[-0.03em] text-white">
              {workspace_mono}
            </span>
          </div>

          <div className="flex flex-1 flex-wrap items-start justify-between gap-5 pt-3.5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="m-0 text-[34px] font-light tracking-[-0.01em] text-shell-text">
                  {workspace_name}
                </h1>
                <button
                  ref={info_button_ref}
                  type="button"
                  onClick={() => setIsInfoOpen((open) => !open)}
                  aria-label="Workspace info"
                  aria-expanded={is_info_open}
                  className={`flex h-[26px] w-[26px] items-center justify-center rounded-[7px] text-shell-text-secondary hover:bg-shell-hover ${
                    is_info_open ? "bg-shell-hover" : ""
                  }`}
                >
                  <ChevronDownIcon size={18} className={is_info_open ? "rotate-180" : ""} />
                </button>
                <InfoDropdown
                  anchor_el={info_button_ref.current}
                  is_open={is_info_open}
                  onClose={() => setIsInfoOpen(false)}
                  title={workspace_name}
                  section_label="Workspace info"
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
                            <ChevronDownIcon size={13} className="flex-none -rotate-90 text-shell-text-faint" />
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
                          <MemberIcon size={15} className="flex-none text-shell-text-muted" />
                          <span className="flex-1">
                            {workspace.privacy === "closed"
                              ? "Invite-only — managed from Permissions"
                              : "All members in monday"}
                          </span>
                        </>
                      ),
                    },
                  ]}
                />
              </div>
              <div className="mt-1 font-mono-accent text-xs tracking-[0.02em] text-shell-text-muted">
                {workspace_name}&nbsp;&nbsp;/&nbsp;&nbsp;
                <span className="font-medium text-brand-500">{node.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-shell-text-secondary hover:bg-shell-hover"
              >
                <ChatBubbleIcon />
                Feedback
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-shell-text-secondary hover:bg-shell-hover"
              >
                <PersonIcon />
                Agents
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("collaborators")}
                className="rounded-lg bg-shell-text px-[18px] py-2.5 text-[13px] font-semibold text-shell-bg hover:opacity-90"
              >
                Members
              </button>
              <button
                ref={options_button_ref}
                type="button"
                onClick={() => setIsOptionsOpen((open) => !open)}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-shell-border text-shell-text-secondary hover:bg-shell-hover"
                aria-label="More workspace actions"
              >
                <MoreDotsIcon size={16} />
              </button>
              <WorkspaceOptionsMenu
                anchor_el={options_button_ref.current}
                is_open={is_options_open}
                onClose={() => setIsOptionsOpen(false)}
                can_manage={can_manage_workspace}
                onRename={() => setOpenDialog("rename")}
                onChangeType={() => setOpenDialog("change-type")}
                onLeave={() => setOpenDialog("leave")}
                onDelete={() => setOpenDialog("delete")}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-[26px] flex gap-1.5 border-b border-shell-border">
          {WORKSPACE_TABS.map(({ id, label, Icon }) => {
            const is_active = active_tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`-mb-px flex items-center gap-[7px] border-b-2 px-3.5 py-3 text-sm ${is_active
                    ? "border-brand-500 font-semibold text-brand-500"
                    : "border-transparent font-medium text-shell-text-muted hover:text-shell-text"
                  }`}
              >
                <Icon />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab panels */}
        {active_tab === "recents" && <WorkspaceManageRecents workspace_slug={workspace.slug} />}
        {active_tab === "content" && <WorkspaceManageContent />}
        {active_tab === "permissions" && <WorkspaceManagePermissions />}
        {active_tab === "collaborators" && <WorkspaceManageCollaborators workspace_slug={workspace.slug} />}
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

      <ConfirmActionModal
        is_open={open_dialog === "leave"}
        title="Leave workspace"
        description={`You'll lose access to "${workspace_name}" and everything in it until someone invites you back.`}
        confirm_label="Leave workspace"
        onConfirm={handleLeave}
        onClose={closeDialog}
      />

      <ConfirmActionModal
        is_open={open_dialog === "delete"}
        title="Delete workspace"
        description={`"${workspace_name}" and everything in it will be moved to trash. This can be undone from Trash within 30 days.`}
        confirm_label="Delete workspace"
        danger
        onConfirm={handleDelete}
        onClose={closeDialog}
      />
    </div>
  );
};

export default WorkspaceManage;
