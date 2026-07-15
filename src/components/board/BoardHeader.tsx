"use client";
import React, { useRef, useState } from "react";
import {
  BellIcon,
  ChevronDownIcon,
  CrownIcon,
  InviteIcon,
  MoreDotsIcon,
  StarIcon,
  WorkspaceTypeIcon,
} from "@/icons/workspace-icons";
import {
  AgentsIcon,
  AutomateIcon,
  CommentIcon,
  IntegrateIcon,
  LinkIcon,
} from "@/icons/board-icons";
import InfoDropdown from "@/components/ui/dropdown/InfoDropdown";
import type { BoardType } from "@/types/workspace";
import { BOARD_TYPE_OPTIONS } from "./BoardTypePicker";
import PersonAvatarStack, { type PersonAvatarStackPerson } from "./PersonAvatarStack";

/** Pre-formatted "Board info" popover content — the caller resolves raw data (a nav node, seed data, …) into display strings. */
export type BoardHeaderInfo = {
  description?: string | null;
  board_type: BoardType;
  /** Shows the edit chevron and makes the "Board type" row clickable. */
  can_change_board_type?: boolean;
  onChangeBoardType?: () => void;
  owners: PersonAvatarStackPerson[];
  /** Creator's display name, or null when unknown. */
  created_by: string | null;
  /** Pre-formatted creation date, e.g. "Jul 15, 2026". */
  created_at: string | null;
  /** e.g. "Everything". */
  notifications: string;
};

export type BoardHeaderProps = {
  title: string;
  is_favorite?: boolean;
  invite_count?: number;
  user_initials?: string;
  /** Board info popover content; the chevron next to the title stays inert when omitted. */
  info?: BoardHeaderInfo;
};

const action_button_class =
  "flex items-center gap-[7px] rounded-lg px-[11px] py-[7px] text-[13px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover";

const icon_button_class =
  "flex h-[34px] w-[34px] items-center justify-center rounded-lg text-shell-text-secondary transition-colors hover:bg-shell-hover";

/**
 * Board title row: the board name (with favourite star + view switcher) on the
 * left and the Integrate / Automate / Agents / Invite cluster on the right.
 */
const BoardHeader: React.FC<BoardHeaderProps> = ({
  title,
  is_favorite = false,
  invite_count = 18,
  user_initials = "JM",
  info,
}) => {
  const [is_info_open, setIsInfoOpen] = useState(false);
  const info_button_ref = useRef<HTMLButtonElement>(null);

  return (
  <div className="flex items-center gap-[9px]">
    <span className="text-[23px] font-extrabold tracking-[-0.015em] text-shell-text">
      {title}
    </span>
    {is_favorite && (
      <span className="flex flex-none text-sunset-200">
        <StarIcon filled size={19} />
      </span>
    )}
    <button
      ref={info_button_ref}
      type="button"
      onClick={() => info && setIsInfoOpen((open) => !open)}
      className={`flex h-6 w-6 items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover ${
        is_info_open ? "bg-shell-hover" : ""
      }`}
      aria-label="Board info"
      aria-expanded={is_info_open}
    >
      <ChevronDownIcon size={13} className={is_info_open ? "rotate-180" : ""} />
    </button>
    {info && (
      <InfoDropdown
        anchor_el={info_button_ref.current}
        is_open={is_info_open}
        onClose={() => setIsInfoOpen(false)}
        title={title}
        section_label="Board info"
        description={info.description}
        rows={[
          {
            key: "board_type",
            label: "Board type",
            value: (
              <>
                <WorkspaceTypeIcon size={15} className="flex-none text-shell-text-muted" />
                <span className="flex-1">
                  {BOARD_TYPE_OPTIONS.find((option) => option.value === info.board_type)?.label ??
                    "Main"}
                </span>
                {info.can_change_board_type && (
                  <ChevronDownIcon size={13} className="flex-none -rotate-90 text-shell-text-faint" />
                )}
              </>
            ),
            onClick: info.can_change_board_type
              ? () => {
                  setIsInfoOpen(false);
                  info.onChangeBoardType?.();
                }
              : undefined,
          },
          {
            key: "owners",
            label: "Owners",
            value: (
              <>
                <CrownIcon size={15} className="flex-none text-shell-text-muted" />
                <span className="flex-1">
                  <PersonAvatarStack people={info.owners} />
                </span>
              </>
            ),
          },
          {
            key: "created_by",
            label: "Created by",
            value: info.created_by ? (
              <>
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#E5623E,#8A2018)] text-[9px] font-bold text-white">
                  {info.created_by
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span className="flex-1">
                  {info.created_by}
                  {info.created_at ? ` · ${info.created_at}` : ""}
                </span>
              </>
            ) : (
              <span className="flex-1 text-shell-text-faint">Unknown</span>
            ),
          },
          {
            key: "notifications",
            label: "Notifications",
            value: (
              <>
                <BellIcon size={14} className="flex-none text-shell-text-muted" />
                <span className="flex-1">{info.notifications}</span>
              </>
            ),
          },
        ]}
      />
    )}

    <div className="flex-1" />

    <div className="flex items-center gap-0.5">
      <button type="button" className={`${action_button_class} hidden md:flex`}>
        <span className="text-shell-text-muted">
          <IntegrateIcon />
        </span>
        Integrate
      </button>
      <button type="button" className={`${action_button_class} hidden md:flex`}>
        <span className="text-shell-text-muted">
          <AutomateIcon />
        </span>
        Automate
      </button>
      <button type="button" className={`${action_button_class} relative hidden md:flex`}>
        <span className="text-shell-text-muted">
          <AgentsIcon />
        </span>
        Agents
        <span className="absolute right-[6px] top-1 h-1.5 w-1.5 rounded-full bg-[#4c7cf3]" />
      </button>

      <span className="mx-1.5 hidden h-5 w-px bg-shell-border-strong md:block" />

      <button type="button" className={icon_button_class} aria-label="Board updates">
        <CommentIcon />
      </button>

      <span className="mx-1 flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#E5623E,#8A2018)] text-[11px] font-bold text-white">
        {user_initials}
      </span>

      <button
        type="button"
        className="flex items-center gap-[7px] rounded-lg border border-shell-border-strong px-[13px] py-[7px] text-[13px] font-semibold text-shell-text transition-colors hover:border-brand-500"
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
};

export default BoardHeader;
