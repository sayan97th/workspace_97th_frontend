import React from "react";
import type { PlatformRoleName } from "@/types/administration/admin-users";
import { CrownIcon, EyeIcon, MemberIcon, ShieldIcon } from "@/icons/workspace-icons";
import InvitationPill from "./InvitationPill";
import type { InvitationTone } from "./invitationFormat";

export const PLATFORM_ROLE_META: Record<
  PlatformRoleName,
  { label: string; tone: InvitationTone; hint: string; Icon: typeof CrownIcon }
> = {
  super_admin: {
    label: "Super admin",
    tone: "brand",
    hint: "Full control of the account, including other admins and every setting.",
    Icon: CrownIcon,
  },
  admin: {
    label: "Admin",
    tone: "info",
    hint: "Manages users, teams, departments and account settings.",
    Icon: ShieldIcon,
  },
  staff: {
    label: "Staff",
    tone: "success",
    hint: "Works in the workspaces and boards they are added to.",
    Icon: MemberIcon,
  },
  client: {
    label: "Client",
    tone: "neutral",
    hint: "External guest who only sees what is shared with them.",
    Icon: EyeIcon,
  },
};

export type InvitationPlatformRoleBadgeProps = {
  role: PlatformRoleName;
};

/** Account role pill (Super admin, Admin, Staff, Client) for Administration > Invitations. */
const InvitationPlatformRoleBadge: React.FC<InvitationPlatformRoleBadgeProps> = ({ role }) => {
  const meta = PLATFORM_ROLE_META[role] ?? PLATFORM_ROLE_META.staff;
  return (
    <InvitationPill tone={meta.tone} tooltip={meta.hint} icon={<meta.Icon size={12} />}>
      {meta.label}
    </InvitationPill>
  );
};

export default InvitationPlatformRoleBadge;
