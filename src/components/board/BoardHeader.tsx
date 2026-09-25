"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  BellIcon,
  CheckIcon,
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
import Tooltip from "@/components/ui/tooltip/Tooltip";
import type { BoardType } from "@/types/workspace";
import BoardOptionsMenu, { type BoardOptionsMenuProps } from "./BoardOptionsMenu";
import { BOARD_TYPE_OPTIONS } from "./BoardTypePicker";
import BoardActivityLogDrawer from "./BoardActivityLogDrawer";
import PersonAvatar from "./PersonAvatar";
import PersonAvatarStack, { type PersonAvatarStackPerson } from "./PersonAvatarStack";
import type { BoardPersonOption } from "./toolbar/types";

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
  /** Stars or unstars the board in the current user's Favorites. The star is display only when omitted. */
  onToggleFavorite?: () => void;
  invite_count?: number;
  /** Id of the board whose activity log the avatar button opens; the button is hidden when omitted. */
  board_id?: number;
  /** The signed in user, shown as a profile photo (or initials fallback) that opens the board's activity log; the button is hidden when omitted. */
  current_user?: BoardPersonOption;
  /** Board info popover content; the chevron next to the title stays inert when omitted. */
  info?: BoardHeaderInfo;
  /** Opens the "Invite to this board" dialog; the button stays inert when omitted. */
  onInviteClick?: () => void;
  /** Opens the board-wide discussion drawer ("Board updates"); the button stays inert when omitted. */
  onBoardUpdatesClick?: () => void;
  /** Total updates on the board's discussion feed; shown as a badge on the "Board updates" button, hidden when 0 or omitted. */
  board_updates_count?: number;
  /** Whether that badge reads as unseen (brand red, to draw the eye) rather than caught-up (neutral gray). */
  board_updates_unseen?: boolean;
  /** Opens the "Integrate" dialog where Email and Slack are connected; the button stays inert when omitted. */
  onIntegrateClick?: () => void;
  /** Opens the rule-based automations panel; the "Automate" button stays inert when omitted (every board view but Table, which is the only one with an automations engine so far). */
  onAutomateClick?: () => void;
  /** Enabled automation count on the current tab, shown as a badge on "Automate", hidden when 0 or omitted. */
  automation_count?: number;
  /** Powers the "..." options menu; the button stays inert when omitted. */
  options_menu?: Omit<BoardOptionsMenuProps, "anchor_el" | "is_open" | "onClose">;
  /** Face-pile of the other users currently viewing this board (see `PresenceAvatarStack`); hidden when omitted. */
  presence?: React.ReactNode;
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
  onToggleFavorite,
  invite_count = 0,
  board_id,
  current_user,
  info,
  onInviteClick,
  onBoardUpdatesClick,
  board_updates_count = 0,
  board_updates_unseen = false,
  onIntegrateClick,
  onAutomateClick,
  automation_count = 0,
  options_menu,
  presence,
}) => {
  const [is_info_open, setIsInfoOpen] = useState(false);
  const info_button_ref = useRef<HTMLButtonElement>(null);
  const [is_link_copied, setIsLinkCopied] = useState(false);
  const [is_options_open, setIsOptionsOpen] = useState(false);
  const options_button_ref = useRef<HTMLButtonElement>(null);
  const [is_activity_log_open, setIsActivityLogOpen] = useState(false);

  // Reverts the "Copied" confirmation back to the plain link icon after a beat.
  useEffect(() => {
    if (!is_link_copied) return;
    const timeout = window.setTimeout(() => setIsLinkCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [is_link_copied]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsLinkCopied(true);
    } catch {
      // Clipboard can be unavailable (insecure context); fail silently.
    }
  };

  return (
    <div className="flex items-center gap-[9px]">
      <span className="text-[23px] font-extrabold tracking-[-0.015em] text-shell-text">
        {title}
      </span>
      {onToggleFavorite ? (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={is_favorite}
          aria-label={is_favorite ? "Remove from favorites" : "Add to favorites"}
          title={is_favorite ? "Remove from favorites" : "Add to favorites"}
          className={`flex flex-none rounded-md p-0.5 transition-colors hover:bg-shell-hover ${is_favorite ? "text-sunset-200" : "text-shell-text-faint hover:text-shell-text-muted"}`}
        >
          <StarIcon filled={is_favorite} size={19} />
        </button>
      ) : (
        is_favorite && (
          <span className="flex flex-none text-sunset-200">
            <StarIcon filled size={19} />
          </span>
        )
      )}
      <button
        ref={info_button_ref}
        type="button"
        onClick={() => info && setIsInfoOpen((open) => !open)}
        className={`flex h-6 w-6 items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover ${is_info_open ? "bg-shell-hover" : ""
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
        <button type="button" onClick={onIntegrateClick} className={`${action_button_class} hidden md:flex`}>
          <span className="text-shell-text-muted">
            <IntegrateIcon />
          </span>
          Integrate
        </button>
        <button type="button" onClick={onAutomateClick} className={`${action_button_class} relative hidden md:flex`}>
          <span className="text-shell-text-muted">
            <AutomateIcon />
          </span>
          Automate
          {automation_count > 0 && (
            <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#4c7cf3] px-1 text-[10.5px] font-bold leading-none text-white">
              {automation_count}
            </span>
          )}
        </button>

        <span className="mx-1.5 hidden h-5 w-px bg-shell-border-strong md:block" />

        <button
          type="button"
          onClick={onBoardUpdatesClick}
          className={`${icon_button_class} relative`}
          aria-label={
            board_updates_count > 0 ? `Board updates, ${board_updates_count} comments` : "Board updates"
          }
        >
          <CommentIcon />
          {board_updates_count > 0 && (
            <span
              className={`absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold leading-none ${board_updates_unseen ? "bg-brand-500/15 text-brand-500" : "bg-shell-hover-strong text-shell-text-secondary"
                }`}
            >
              {board_updates_count > 99 ? "99+" : board_updates_count}
            </span>
          )}
        </button>

        {presence && (
          <>
            <span className="mx-1.5 h-5 w-px bg-shell-border-strong" />
            {presence}
          </>
        )}

        {current_user && board_id !== undefined && (
          <>
            <Tooltip content="View activity log" placement="bottom" className="mx-1">
              <button
                type="button"
                onClick={() => setIsActivityLogOpen(true)}
                className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-lg transition-colors hover:bg-shell-hover"
                aria-label="View activity log"
                aria-haspopup="dialog"
                aria-expanded={is_activity_log_open}
              >
                <PersonAvatar person={current_user} size={28} />
              </button>
            </Tooltip>
            <BoardActivityLogDrawer
              board_id={board_id}
              is_open={is_activity_log_open}
              onClose={() => setIsActivityLogOpen(false)}
            />
          </>
        )}

        <button
          type="button"
          onClick={onInviteClick}
          className="flex items-center gap-[7px] rounded-lg border border-shell-border-strong px-[13px] py-[7px] text-[13px] font-semibold text-shell-text transition-colors hover:border-brand-500"
        >
          <InviteIcon size={14} />
          Invite / {invite_count}
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className={`${icon_button_class} hidden sm:flex`}
          aria-label={is_link_copied ? "Board link copied" : "Copy board link"}
          title={is_link_copied ? "Link copied!" : "Copy board link"}
        >
          {is_link_copied ? <CheckIcon size={14} className="text-success-400" /> : <LinkIcon />}
        </button>
        <button
          ref={options_button_ref}
          type="button"
          onClick={() => options_menu && setIsOptionsOpen((open) => !open)}
          className={`${icon_button_class} hidden sm:flex ${is_options_open ? "bg-shell-hover" : ""}`}
          aria-label="More board actions"
          aria-expanded={is_options_open}
        >
          <MoreDotsIcon />
        </button>
        {options_menu && (
          <BoardOptionsMenu
            anchor_el={options_button_ref.current}
            is_open={is_options_open}
            onClose={() => setIsOptionsOpen(false)}
            {...options_menu}
          />
        )}
      </div>
    </div>
  );
};

export default BoardHeader;
