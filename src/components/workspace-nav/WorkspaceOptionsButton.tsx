"use client";
import React, { useMemo, useRef, useState } from "react";
import WorkspaceOptionsMenu from "./WorkspaceOptionsMenu";
import NavItemFormModal from "./NavItemFormModal";
import ChangeWorkspaceTypeModal from "./ChangeWorkspaceTypeModal";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import EditWorkspaceModal, {
  type EditWorkspaceSubmission,
} from "@/layout/EditWorkspaceModal";
import { MoreDotsIcon } from "@/icons/workspace-icons";
import type { UpdateWorkspacePayload } from "@/types/workspace";

/** Which single-field/confirm dialog the "…" menu currently has open. */
type OptionsDialog = "edit" | "rename" | "change-type" | "leave" | "delete" | null;

/**
 * The subset of a workspace this button actually needs — kept minimal (rather
 * than importing the full `BrowseWorkspace` shape) so any workspace-ish object
 * (switcher rows, browse cards, the header's active workspace) can be passed
 * in without a structural-typing fight.
 */
export type WorkspaceOptionsButtonWorkspace = {
  id: string;
  name: string;
  /** Human role label for the current user (e.g. "Owner"); absent/null when not a member — the button renders nothing in that case. */
  role?: string | null;
  privacy?: "open" | "closed";
  /** Priority client flag — drives the "Mark/Remove as priority client" menu item. */
  is_priority?: boolean;
  /** Badge background color, used to prefill the "Edit workspace" dialog's color picker. */
  color?: string;
  /** Uploaded avatar image, used to prefill the "Edit workspace" dialog's photo preview. */
  avatar_url?: string | null;
};

export type WorkspaceOptionsButtonProps = {
  workspace: WorkspaceOptionsButtonWorkspace;
  updateWorkspace: (
    workspace_slug: string,
    payload: UpdateWorkspacePayload
  ) => Promise<unknown>;
  /** Flags/unflags this workspace as a priority client; the menu item stays hidden when omitted. */
  togglePriority?: (workspace_slug: string, is_priority: boolean) => Promise<unknown>;
  /** Uploads (or replaces) this workspace's avatar; the "Edit workspace" dialog's photo picker is disabled when omitted. */
  uploadWorkspaceAvatar?: (workspace_slug: string, file: File) => Promise<unknown>;
  /** Removes this workspace's avatar, reverting it to its generated mono/color badge. */
  removeWorkspaceAvatar?: (workspace_slug: string) => Promise<unknown>;
  leaveWorkspace: (workspace_slug: string) => Promise<void>;
  deleteWorkspace: (workspace_slug: string) => Promise<void>;
  /** Overrides the default hover-revealed row-dots trigger styling (e.g. an always-visible header button). */
  trigger_class_name?: string;
  icon_size?: number;
  /** Defaults to `"${workspace.name} options"`; pass a fixed label for a header button whose position already implies which workspace (avoids restating the name). */
  aria_label?: string;
};

const DEFAULT_TRIGGER_CLASS =
  "flex h-6 w-6 flex-none items-center justify-center rounded-md text-shell-text-secondary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-shell-hover-strong hover:text-shell-text";

/**
 * Self-contained "…" workspace options trigger — Rename / Change type / Leave /
 * Delete — built on the same {@link WorkspaceOptionsMenu} and dialogs the
 * workspace header introduced, so any list of workspaces (sidebar switcher,
 * browse grid) can drop this in without re-implementing the menu or its
 * dialogs. Renders nothing for a workspace the current user has no
 * membership in (no `role`), since none of these actions apply.
 *
 * Stops click propagation on itself so it can be nested inside a clickable
 * row/card (e.g. "select this workspace") without also triggering the
 * parent's click.
 */
const WorkspaceOptionsButton: React.FC<WorkspaceOptionsButtonProps> = ({
  workspace,
  updateWorkspace,
  togglePriority,
  uploadWorkspaceAvatar,
  removeWorkspaceAvatar,
  leaveWorkspace,
  deleteWorkspace,
  trigger_class_name,
  icon_size = 15,
  aria_label,
}) => {
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const [open_dialog, setOpenDialog] = useState<OptionsDialog>(null);
  const button_ref = useRef<HTMLButtonElement>(null);

  if (!workspace.role) return null;

  const can_manage = workspace.role.toLowerCase() === "owner";
  const closeDialog = () => setOpenDialog(null);

  // Stable object identity across re-renders (only changes when the actual
  // fields do) — EditWorkspaceModal reseeds its form off this object, and a
  // fresh literal on every render would otherwise discard in-progress edits.
  const edit_workspace = useMemo(
    () => ({
      id: workspace.id,
      name: workspace.name,
      color: workspace.color ?? "#6E7B7D",
      avatar_url: workspace.avatar_url,
      privacy: workspace.privacy ?? "open",
    }),
    [workspace.id, workspace.name, workspace.color, workspace.avatar_url, workspace.privacy]
  );

  const openDialog = (dialog: Exclude<OptionsDialog, null>) => {
    setIsMenuOpen(false);
    setOpenDialog(dialog);
  };

  const handleRename = async (name: string) => {
    await updateWorkspace(workspace.id, { name });
  };

  const handleEdit = async (
    workspace_slug: string,
    submission: EditWorkspaceSubmission
  ) => {
    await updateWorkspace(workspace_slug, {
      name: submission.name,
      mono: submission.name[0]?.toUpperCase() ?? "W",
      color: submission.color,
      privacy: submission.privacy,
    });
    if (submission.avatar_change instanceof File) {
      await uploadWorkspaceAvatar?.(workspace_slug, submission.avatar_change);
    } else if (submission.avatar_change === "remove") {
      await removeWorkspaceAvatar?.(workspace_slug);
    }
  };

  const handleChangeType = async (privacy: "open" | "closed") => {
    await updateWorkspace(workspace.id, { privacy });
  };

  const handleTogglePriority = async () => {
    await togglePriority?.(workspace.id, !workspace.is_priority);
  };

  const handleLeave = async () => {
    await leaveWorkspace(workspace.id);
  };

  const handleDelete = async () => {
    await deleteWorkspace(workspace.id);
  };

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsMenuOpen((open) => !open);
        }}
        aria-label={aria_label ?? `${workspace.name} options`}
        aria-haspopup="menu"
        aria-expanded={is_menu_open}
        className={trigger_class_name ?? DEFAULT_TRIGGER_CLASS}
      >
        <MoreDotsIcon size={icon_size} />
      </button>

      {/* Menu + dialogs render fixed/portaled overlays, but React event bubbling
          still follows this component's place in the tree — stop propagation here
          so clicking inside them can't also fire a parent row's onClick, and so
          typing (e.g. a space between words, or Enter) inside one of their form
          fields can't bubble up into a parent row's "Enter/Space selects this
          row" keyboard handler and select/navigate away mid-edit. */}
      <span
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <WorkspaceOptionsMenu
          anchor_el={button_ref.current}
          is_open={is_menu_open}
          onClose={() => setIsMenuOpen(false)}
          can_manage={can_manage}
          onEdit={() => openDialog("edit")}
          onRename={() => openDialog("rename")}
          onChangeType={() => openDialog("change-type")}
          is_priority={!!workspace.is_priority}
          onTogglePriority={togglePriority ? handleTogglePriority : undefined}
          onLeave={() => openDialog("leave")}
          onDelete={() => openDialog("delete")}
        />

        <EditWorkspaceModal
          is_open={open_dialog === "edit"}
          workspace={edit_workspace}
          onSave={handleEdit}
          onClose={closeDialog}
        />

        <NavItemFormModal
          is_open={open_dialog === "rename"}
          title="Rename workspace"
          submit_label="Rename"
          initial_label={workspace.name}
          placeholder="Workspace name"
          onSubmit={handleRename}
          onClose={closeDialog}
        />

        <ChangeWorkspaceTypeModal
          is_open={open_dialog === "change-type"}
          initial_privacy={workspace.privacy ?? "open"}
          onSubmit={handleChangeType}
          onClose={closeDialog}
        />

        <ConfirmActionModal
          is_open={open_dialog === "leave"}
          title="Leave workspace"
          description={`You'll lose access to "${workspace.name}" and everything in it until someone invites you back.`}
          confirm_label="Leave workspace"
          onConfirm={handleLeave}
          onClose={closeDialog}
        />

        <ConfirmActionModal
          is_open={open_dialog === "delete"}
          title="Delete workspace"
          description={`"${workspace.name}" and everything in it will be moved to trash. This can be undone from Trash within 30 days.`}
          confirm_label="Delete workspace"
          danger
          onConfirm={handleDelete}
          onClose={closeDialog}
        />
      </span>
    </>
  );
};

export default WorkspaceOptionsButton;
