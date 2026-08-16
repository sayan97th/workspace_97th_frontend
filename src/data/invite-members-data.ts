/**
 * Static data backing the "Invite members" modal. Mirrors the approved 97
 * Workspace design. Roles and the placeholder invite link are intentionally
 * decoupled from the modal component so the same options can later be fed from
 * the API without touching the presentation layer.
 */

/** Selectable permission levels an invited teammate can be granted. */
export type InviteRoleId = "viewer" | "member" | "admin";

/** A permission level shown in the role selector. */
export type InviteRole = {
  id: InviteRoleId;
  label: string;
  /** Short explanation of what the role can do, shown under the label. */
  description: string;
};

/** Roles offered by the invite flow, ordered from least to most privileged. */
export const invite_roles: InviteRole[] = [
  {
    id: "viewer",
    label: "Viewer",
    description: "Can view boards and updates but cannot make changes.",
  },
  {
    id: "member",
    label: "Member",
    description: "Can create and edit boards, items and updates.",
  },
  {
    id: "admin",
    label: "Admin",
    description: "Full access, including managing people and settings.",
  },
];

/** Role selected by default when the invite modal is opened. */
export const invite_default_role: InviteRoleId = "member";

/** Placeholder shown in the multi-email input. */
export const invite_email_placeholder = "name@company.com, name@company.com ...";

/** Placeholder shown in the optional message textarea. */
export const invite_message_placeholder = "Add context for new members";
