"use client";
import React from "react";
import { ChevronDownIcon, InviteIcon, MoreDotsIcon, StarIcon } from "@/icons/workspace-icons";
import {
  AgentsIcon,
  AutomateIcon,
  CommentIcon,
  IntegrateIcon,
  LinkIcon,
} from "@/icons/board-icons";

export type BoardHeaderProps = {
  title: string;
  is_favorite?: boolean;
  invite_count?: number;
  user_initials?: string;
};

const action_button_class =
  "flex items-center gap-[7px] rounded-lg px-[11px] py-[7px] text-[13px] font-medium text-[#c7d0d0] transition-colors hover:bg-white/[0.07]";

const icon_button_class =
  "flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[#c2cacb] transition-colors hover:bg-white/[0.08]";

/**
 * Board title row: the board name (with favourite star + view switcher) on the
 * left and the Integrate / Automate / Agents / Invite cluster on the right.
 */
const BoardHeader: React.FC<BoardHeaderProps> = ({
  title,
  is_favorite = false,
  invite_count = 18,
  user_initials = "JM",
}) => (
  <div className="flex items-center gap-[9px]">
    <span className="text-[23px] font-extrabold tracking-[-0.015em] text-[#e9eded]">
      {title}
    </span>
    {is_favorite && (
      <span className="flex flex-none text-sunset-200">
        <StarIcon filled size={19} />
      </span>
    )}
    <button
      type="button"
      className="flex h-6 w-6 items-center justify-center rounded-md text-[#8a9495] transition-colors hover:bg-white/[0.08]"
      aria-label="Board options"
    >
      <ChevronDownIcon size={13} />
    </button>

    <div className="flex-1" />

    <div className="flex items-center gap-0.5">
      <button type="button" className={`${action_button_class} hidden md:flex`}>
        <span className="text-[#9aa4a5]">
          <IntegrateIcon />
        </span>
        Integrate
      </button>
      <button type="button" className={`${action_button_class} hidden md:flex`}>
        <span className="text-[#9aa4a5]">
          <AutomateIcon />
        </span>
        Automate
      </button>
      <button type="button" className={`${action_button_class} relative hidden md:flex`}>
        <span className="text-[#9aa4a5]">
          <AgentsIcon />
        </span>
        Agents
        <span className="absolute right-[6px] top-1 h-1.5 w-1.5 rounded-full bg-[#4c7cf3]" />
      </button>

      <span className="mx-1.5 hidden h-5 w-px bg-white/10 md:block" />

      <button type="button" className={icon_button_class} aria-label="Board updates">
        <CommentIcon />
      </button>

      <span className="mx-1 flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#E5623E,#8A2018)] text-[11px] font-bold text-white">
        {user_initials}
      </span>

      <button
        type="button"
        className="flex items-center gap-[7px] rounded-lg border border-white/[0.16] px-[13px] py-[7px] text-[13px] font-semibold text-[#e9eded] transition-colors hover:border-brand-500"
      >
        <InviteIcon size={14} />
        Invite / {invite_count}
      </button>

      <button type="button" className={`${icon_button_class} hidden sm:flex`} aria-label="Copy board link">
        <LinkIcon />
      </button>
      <button type="button" className={`${icon_button_class} hidden sm:flex`} aria-label="More board actions">
        <MoreDotsIcon />
      </button>
    </div>
  </div>
);

export default BoardHeader;
