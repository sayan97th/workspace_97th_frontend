"use client";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import {
  ChatBubbleIcon,
  ChevronDownIcon,
  ClockIcon,
  CollaboratorsIcon,
  ContentTabIcon,
  FileIcon,
  BoardGridIcon,
  FolderIcon,
  MemberIcon,
  MoreDotsIcon,
  PermissionsIcon,
  PersonIcon,
  StarIcon,
} from "@/icons/workspace-icons";
import {
  ChangeWorkspaceTypeModal,
  NavItemFormModal,
  useWorkspaces,
  WorkspaceOptionsMenu,
} from "@/components/workspace-nav";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import InfoDropdown from "@/components/ui/dropdown/InfoDropdown";
import WorkspaceContent from "./WorkspaceContent";
import WorkspacePermissions from "./WorkspacePermissions";

type TabId = "recents" | "content" | "collaborators" | "permissions";

type TabDefinition = {
  id: TabId;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
};

type RecentItem = {
  id: string;
  label: string;
  kind: "file" | "folder";
};

/** Which single-field/confirm dialog the "…" menu currently has open. */
type OptionsDialog = "rename" | "change-type" | "leave" | "delete" | null;

const workspace_tabs: TabDefinition[] = [
  { id: "recents", label: "Recents", Icon: ClockIcon },
  { id: "content", label: "Content", Icon: ContentTabIcon },
  { id: "collaborators", label: "Collaborators", Icon: CollaboratorsIcon },
  { id: "permissions", label: "Permissions", Icon: PermissionsIcon },
];

const recent_items: RecentItem[] = [
  { id: "mcp", label: "MCP getting started", kind: "file" },
  { id: "teamjaecie", label: "Team Jaecie", kind: "folder" },
  { id: "teamblake", label: "Team Blake", kind: "folder" },
  { id: "retro", label: "Retrospectives", kind: "folder" },
  { id: "salesres", label: "Sales Resources", kind: "folder" },
];

const WorkspaceHome: React.FC = () => {
  const { active_item_label } = useSidebar();
  const router = useRouter();
  const workspaces = useWorkspaces();
  const [active_tab, setActiveTab] = useState<TabId>("recents");
  const [is_options_open, setIsOptionsOpen] = useState(false);
  const [is_info_open, setIsInfoOpen] = useState(false);
  const [open_dialog, setOpenDialog] = useState<OptionsDialog>(null);
  const options_button_ref = useRef<HTMLButtonElement>(null);
  const info_button_ref = useRef<HTMLButtonElement>(null);

  const active_workspace = workspaces.active_workspace;
  const workspace_name = active_workspace?.name ?? "Fulfillment";
  const workspace_mono = active_workspace?.mono ?? "97";
  const workspace_color = active_workspace?.color;
  const can_manage_workspace = active_workspace?.role?.toLowerCase() === "owner";

  const closeDialog = () => setOpenDialog(null);

  const handleRename = async (name: string) => {
    if (!active_workspace) return;
    await workspaces.updateWorkspace(active_workspace.id, { name });
  };

  const handleChangeType = async (privacy: "open" | "closed") => {
    if (!active_workspace) return;
    await workspaces.updateWorkspace(active_workspace.id, { privacy });
  };

  const handleLeave = async () => {
    if (!active_workspace) return;
    await workspaces.leaveWorkspace(active_workspace.id);
    router.push("/");
  };

  const handleDelete = async () => {
    if (!active_workspace) return;
    await workspaces.deleteWorkspace(active_workspace.id);
    router.push("/");
  };

  return (
    <div className="min-h-full bg-shell-bg">
      {/* Cover banner — placeholder gradient, matches the approved workspace design. */}
      <div className="relative h-[170px] w-full overflow-hidden bg-[linear-gradient(115deg,#0A1717_0%,#1C2B2E_38%,#3A4A4D_60%,#D8DCDB_100%)]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(108deg,rgba(255,255,255,0.05)_0_2px,transparent_2px_22px)]" />
        <div className="absolute right-10 top-[18px] font-mono-accent text-[11px] tracking-[0.14em] text-white/45">
        </div>
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
                            {active_workspace?.privacy === "closed"
                              ? "Closed workspace"
                              : "Open workspace"}
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
                            {active_workspace?.privacy === "closed"
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
                <span className="font-medium text-brand-500">{active_item_label}</span>
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
          {workspace_tabs.map(({ id, label, Icon }) => {
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
        {active_tab === "recents" && (
          <div className="mt-2.5 pb-[60px]">
            {recent_items.map((item, index) => (
              <div
                key={item.id}
                className={`flex cursor-pointer items-center gap-3.5 rounded-lg px-2 py-[15px] hover:bg-shell-hover ${index < recent_items.length - 1 ? "border-b border-shell-border" : ""
                  }`}
              >
                <span className="flex flex-none text-shell-text-muted">
                  {item.kind === "file" ? <FileIcon /> : <FolderIcon size={17} />}
                </span>
                <span className="flex-1 text-[15px] font-medium text-shell-text">
                  {item.label}
                </span>
                <span className="flex flex-none text-shell-text-faint">
                  <StarIcon size={16} />
                </span>
              </div>
            ))}
          </div>
        )}

        {active_tab === "content" && <WorkspaceContent />}

        {active_tab === "permissions" && <WorkspacePermissions />}

        {active_tab === "collaborators" && (
          <div className="flex items-center justify-center py-24 font-mono-accent text-[13px] tracking-[0.04em] text-shell-text-muted">
            [ no {active_tab} yet ]
          </div>
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
        initial_privacy={active_workspace?.privacy ?? "open"}
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

export default WorkspaceHome;
