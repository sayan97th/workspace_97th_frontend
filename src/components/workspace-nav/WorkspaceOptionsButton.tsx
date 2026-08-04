"use client";
import React, { useRef, useState } from "react";
import WorkspaceOptionsMenu from "./WorkspaceOptionsMenu";
import NavItemFormModal from "./NavItemFormModal";
import ChangeWorkspaceTypeModal from "./ChangeWorkspaceTypeModal";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { MoreDotsIcon } from "@/icons/workspace-icons";
import type { UpdateWorkspacePayload } from "@/types/workspace";

/** Which single-field/confirm dialog the "…" menu currently has open. */
type OptionsDialog = "rename" | "change-type" | "leave" | "delete" | null;

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
};

export type WorkspaceOptionsButtonProps = {
  workspace: WorkspaceOptionsButtonWorkspace;
  updateWorkspace: (
    workspace_slug: string,
    payload: UpdateWorkspacePayload
  ) => Promise<unknown>;
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

  const openDialog = (dialog: Exclude<OptionsDialog, null>) => {
    setIsMenuOpen(false);
    setOpenDialog(dialog);
  };

  const handleRename = async (name: string) => {
    await updateWorkspace(workspace.id, { name });
  };

  const handleChangeType = async (privacy: "open" | "closed") => {
    await updateWorkspace(workspace.id, { privacy });
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
          so clicking inside them can't also fire a parent row's onClick. */}
      <span onClick={(event) => event.stopPropagation()}>
        <WorkspaceOptionsMenu
          anchor_el={button_ref.current}
          is_open={is_menu_open}
          onClose={() => setIsMenuOpen(false)}
          can_manage={can_manage}
          onRename={() => openDialog("rename")}
          onChangeType={() => openDialog("change-type")}
          onLeave={() => openDialog("leave")}
          onDelete={() => openDialog("delete")}
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
