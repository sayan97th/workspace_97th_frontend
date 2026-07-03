"use client";
import React from "react";
import { CheckCircleIcon } from "@/icons/workspace-icons";
import type { RequestAccessMember } from "@/data/request-access-data";

type MemberSelectRowProps = {
  member: RequestAccessMember;
  is_selected: boolean;
  onToggle: (member_id: string) => void;
};

/**
 * A single toggleable member row: gradient avatar, name, and a trailing
 * check-circle that reflects selection. Reusable anywhere a selectable list of
 * people is needed (request access, share, invite, etc.).
 */
const MemberSelectRow: React.FC<MemberSelectRowProps> = ({
  member,
  is_selected,
  onToggle,
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={is_selected}
    onClick={() => onToggle(member.id)}
    className="flex w-full items-center gap-3 rounded-[10px] px-1 py-[11px] text-left transition-colors hover:bg-white/[0.05]"
  >
    <span
      className={`h-8 w-8 flex-none rounded-full bg-gradient-to-br ${member.avatar_gradient}`}
      aria-hidden="true"
    />
    <span className="flex-1 text-sm font-medium text-[#e9eded]">{member.name}</span>
    <CheckCircleIcon
      size={20}
      selected={is_selected}
      className={is_selected ? "" : "text-gray-500"}
    />
  </button>
);

export default MemberSelectRow;
