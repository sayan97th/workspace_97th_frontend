"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  CrownIcon,
  MoreDotsIcon,
  StarIcon,
  WorkspaceTypeIcon,
} from "@/icons/workspace-icons";
import {
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
  /** Small status pill right after the title, e.g. how many items the active filters leave; hidden when omitted. */
  title_badge?: React.ReactNode;
};

// Header actions, view tabs and toolbar controls share the regular Figtree
// `text-board-nav` style (see `src/styles/typography.css`). Colors come from
// the monday palette BoardShell scopes on the chrome (`monday-palette.css`).
const action_button_class =
  "flex h-8 items-center gap-2 rounded-[4px] px-2 text-board-nav text-shell-text transition-colors hover:bg-shell-hover";

const icon_button_class =
  "flex h-8 w-8 items-center justify-center rounded-[4px] text-shell-text transition-colors hover:bg-shell-hover";

/**
 * Board title row, matching monday.com: the board name and its info chevron
 * as one button on the left (the favorite star lives inside the info
 * popover), and the Integrate / Automate / updates / Invite cluster on the
 * right. AI suggestions and Agents are intentionally not offered yet.
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
  title_badge,
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

  const favorite_label = is_favorite ? "Remove from favorites" : "Add to favorites";

  const favorite_button = onToggleFavorite ? (
    <button
      type="button"
      onClick={onToggleFavorite}
      aria-pressed={is_favorite}
      aria-label={favorite_label}
      title={favorite_label}
      className={`flex h-8 w-8 flex-none items-center justify-center rounded-[4px] transition-colors hover:bg-shell-hover ${is_favorite ? "text-sunset-200" : "text-shell-text-secondary"}`}
    >
      <StarIcon filled={is_favorite} size={18} />
    </button>
  ) : (
    is_favorite && (
      <span className="flex h-8 w-8 flex-none items-center justify-center text-sunset-200">
        <StarIcon filled size={18} />
      </span>
    )
  );

  return (
    <div className="flex min-h-10 items-center gap-2">
      <h1 className="flex min-w-0 font-heading text-board-title text-shell-text">
        <button
          ref={info_button_ref}
          type="button"
          onClick={() => info && setIsInfoOpen((open) => !open)}
          className={`flex min-w-0 items-center gap-1 rounded-[4px] px-1.5 transition-colors hover:bg-shell-hover ${is_info_open ? "bg-shell-hover" : ""} ${info ? "" : "cursor-default"}`}
          aria-label={`${title}, board info`}
          aria-haspopup={info ? "dialog" : undefined}
          aria-expanded={info ? is_info_open : undefined}
        >
          <span className="truncate">{title}</span>
          <ChevronDownIcon
            size={18}
            className={`flex-none text-shell-text transition-transform ${is_info_open ? "rotate-180" : ""}`}
          />
        </button>
      </h1>
      {/* Without the info popover there is nowhere else to star the board, so the star stays inline. */}
      {!info && favorite_button}
      {title_badge}
      {info && (
        <InfoDropdown
          anchor_el={info_button_ref.current}
          is_open={is_info_open}
          onClose={() => setIsInfoOpen(false)}
          title={title}
          title_action={favorite_button}
          className="board-chrome-theme"
          width={420}
          section_label="Board info"
          description={info.description}
          rows={[
            {
              key: "board_type",
              label: "Board type",
              value: (
                <>
                  <WorkspaceTypeIcon size={15} className="flex-none text-shell-text-secondary" />
                  <span className="flex-1">
                    {BOARD_TYPE_OPTIONS.find((option) => option.value === info.board_type)?.label ??
                      "Main"}
                  </span>
                  {info.can_change_board_type && (
                    <ChevronDownIcon size={14} className="flex-none text-shell-text" />
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
                  <CrownIcon size={15} className="flex-none text-shell-text-secondary" />
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
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#E5623E,#8A2018)] text-[10px] font-bold text-white">
                    {info.created_by
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="flex-1 truncate">
                    {info.created_by}
                    {info.created_at ? ` on ${info.created_at}` : ""}
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
                  <BellIcon size={15} className="flex-none text-shell-text-secondary" />
                  <span className="flex-1">{info.notifications}</span>
                </>
              ),
            },
          ]}
        />
      )}

      <div className="flex-1" />

      <div className="flex flex-none items-center gap-1">
        <button type="button" onClick={onIntegrateClick} className={`${action_button_class} hidden md:flex`}>
          <IntegrateIcon size={16} />
          Integrate
        </button>
        <button type="button" onClick={onAutomateClick} className={`${action_button_class} hidden md:flex`}>
          <AutomateIcon size={16} />
          {automation_count > 0 ? `Automate / ${automation_count}` : "Automate"}
        </button>

        <button
          type="button"
          onClick={onBoardUpdatesClick}
          className={`${icon_button_class} relative`}
          aria-label={
            board_updates_count > 0 ? `Board updates, ${board_updates_count} comments` : "Board updates"
          }
        >
          <CommentIcon size={17} />
          {board_updates_count > 0 && (
            <span
              className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none ${board_updates_unseen ? "bg-brand-500 text-white" : "bg-shell-hover-strong text-shell-text"
                }`}
            >
              {board_updates_count > 99 ? "99+" : board_updates_count}
            </span>
          )}
        </button>

        {presence}

        {current_user && board_id !== undefined && (
          <>
            <Tooltip content="View activity log" placement="bottom">
              <button
                type="button"
                onClick={() => setIsActivityLogOpen(true)}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[4px] transition-colors hover:bg-shell-hover"
                aria-label="View activity log"
                aria-haspopup="dialog"
                aria-expanded={is_activity_log_open}
              >
                <PersonAvatar person={current_user} size={26} />
              </button>
            </Tooltip>
            <BoardActivityLogDrawer
              board_id={board_id}
              is_open={is_activity_log_open}
              onClose={() => setIsActivityLogOpen(false)}
            />
          </>
        )}

        {/* Invite and Copy link read as one split button, as on monday. */}
        <div className="ml-1 flex h-8 flex-none items-stretch overflow-hidden rounded-[4px] border border-shell-border-strong">
          <button
            type="button"
            onClick={onInviteClick}
            className="flex items-center px-2.5 text-board-nav text-shell-text transition-colors hover:bg-shell-hover"
          >
            Invite / {invite_count}
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="hidden w-8 items-center justify-center border-l border-shell-border-strong text-shell-text transition-colors hover:bg-shell-hover sm:flex"
            aria-label={is_link_copied ? "Board link copied" : "Copy board link"}
            title={is_link_copied ? "Link copied!" : "Copy board link"}
          >
            {is_link_copied ? <CheckIcon size={14} className="text-success-400" /> : <LinkIcon size={16} />}
          </button>
        </div>

        <button
          ref={options_button_ref}
          type="button"
          onClick={() => options_menu && setIsOptionsOpen((open) => !open)}
          className={`${icon_button_class} ml-1 hidden sm:flex ${is_options_open ? "bg-shell-hover" : ""}`}
          aria-label="More board actions"
          aria-expanded={is_options_open}
        >
          <MoreDotsIcon size={18} />
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
