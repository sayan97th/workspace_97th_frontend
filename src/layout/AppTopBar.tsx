"use client";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import UserAvatar from "@/components/common/UserAvatar";
import AccountMenu from "./AccountMenu";
import RequestAccessModal, {
  type RequestAccessSubmission,
} from "./RequestAccessModal";
import InviteMembersModal, {
  type InviteMembersSubmission,
} from "./InviteMembersModal";
import NotificationsPanel from "./NotificationsPanel";
import UpdateFeedPanel from "./UpdateFeedPanel";
import { TeamsModal } from "@/components/teams";
import { TrashModal, type TrashTabId } from "@/components/trash";
import {
  AppsGridIcon,
  BellIcon,
  EyeIcon,
  FeedIcon,
  HamburgerIcon,
  HelpIcon,
  InviteIcon,
  SearchIcon,
} from "@/icons/workspace-icons";

/**
 * Full-width dark application bar that sits above the sidebar and main content.
 * Mirrors the "top application bar" from the approved 97 Workspace design.
 */
const AppTopBar: React.FC = () => {
  const { toggleMobileSidebar } = useSidebar();
  const { user } = useAuth();
  const [is_account_open, setIsAccountOpen] = useState(false);
  const [is_request_access_open, setIsRequestAccessOpen] = useState(false);
  const [is_invite_open, setIsInviteOpen] = useState(false);
  const [is_notifications_open, setIsNotificationsOpen] = useState(false);
  const [is_feed_open, setIsFeedOpen] = useState(false);
  const [is_teams_open, setIsTeamsOpen] = useState(false);
  const [is_trash_open, setIsTrashOpen] = useState(false);
  const [trash_initial_tab, setTrashInitialTab] = useState<TrashTabId>("trash");

  const toggleNotifications = () => setIsNotificationsOpen((previous) => !previous);
  const closeNotifications = () => setIsNotificationsOpen(false);

  const toggleFeed = () => setIsFeedOpen((previous) => !previous);
  const closeFeed = () => setIsFeedOpen(false);

  const openRequestAccess = () => setIsRequestAccessOpen(true);
  const closeRequestAccess = () => setIsRequestAccessOpen(false);

  const openInvite = () => setIsInviteOpen(true);
  const closeInvite = () => setIsInviteOpen(false);

  const openTeams = () => setIsTeamsOpen(true);
  const closeTeams = () => setIsTeamsOpen(false);

  const openTrash = () => {
    setTrashInitialTab("trash");
    setIsTrashOpen(true);
  };
  const openArchive = () => {
    setTrashInitialTab("archive");
    setIsTrashOpen(true);
  };
  const closeTrash = () => setIsTrashOpen(false);

  const handleRequestAccessSubmit = (submission: RequestAccessSubmission) => {
    // No backend wiring yet — surface the payload for the future API hook.
    console.log("Request edit access submitted", submission);
  };

  const handleInviteSubmit = (submission: InviteMembersSubmission) => {
    // No backend wiring yet — surface the payload for the future API hook.
    console.log("Invite members submitted", submission);
  };

  const toggleAccount = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsAccountOpen((prev) => !prev);
  };

  const closeAccount = () => setIsAccountOpen(false);

  const icon_button_class =
    "relative flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[#C2CACB] transition-colors hover:bg-white/[0.08]";

  return (
    <>
    <header className="relative z-[60] flex h-[52px] flex-none items-center gap-3.5 border-b border-white/[0.06] bg-gray-700 px-3.5 text-[#E9EDED]">
      {/* Left cluster */}
      <div className="flex flex-none items-center gap-2.5">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[#C2CACB] hover:bg-white/[0.08] lg:hidden"
          aria-label="Toggle sidebar"
        >
          <HamburgerIcon size={18} />
        </button>

        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-brand-500 text-[13px] font-bold tracking-[-0.02em] text-white">
          97
        </span>

        <span className="hidden items-center gap-1.5 rounded-lg bg-white/[0.08] px-[11px] py-1.5 text-[13px] font-semibold text-[#C7D0D0] sm:flex">
          <EyeIcon size={15} />
          Viewer
        </span>

        <button
          type="button"
          onClick={openRequestAccess}
          className="hidden rounded-lg border border-white/[0.14] px-[13px] py-1.5 text-[13px] font-semibold text-[#E9EDED] transition-colors hover:border-brand-500 hover:text-white md:block"
        >
          Request edit access
        </button>
      </div>

      {/* Center search */}
      <div className="flex min-w-0 flex-1 justify-center">
        <button
          type="button"
          className="flex w-full max-w-[520px] cursor-text items-center gap-2.5 rounded-[10px] border border-white/[0.08] bg-white/[0.07] px-3.5 py-2 text-left text-[#8A9495] transition-colors hover:bg-white/[0.12]"
        >
          <SearchIcon size={15} />
          <span className="text-[13.5px]">Search for anything...</span>
        </button>
      </div>

      {/* Right cluster */}
      <div className="flex flex-none items-center gap-0.5">
        <button
          type="button"
          onClick={toggleNotifications}
          className={`${icon_button_class} ${is_notifications_open ? "bg-white/[0.10]" : ""}`}
          aria-label="Notifications"
          aria-haspopup="dialog"
          aria-expanded={is_notifications_open}
        >
          <BellIcon size={17} />
          <span className="absolute right-2 top-[7px] h-[7px] w-[7px] rounded-full border-[1.5px] border-gray-700 bg-brand-500" />
        </button>

        <button
          type="button"
          onClick={toggleFeed}
          className={`${icon_button_class} ${is_feed_open ? "bg-white/[0.10]" : ""}`}
          aria-label="Update feed"
          aria-haspopup="dialog"
          aria-expanded={is_feed_open}
        >
          <FeedIcon size={17} />
          <span className="absolute right-0.5 top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-lg border-[1.5px] border-gray-700 bg-brand-500 px-[3px] text-[9.5px] font-bold text-white">
            8
          </span>
        </button>

        <button
          type="button"
          onClick={openInvite}
          className={`${icon_button_class} ${is_invite_open ? "bg-white/[0.10]" : ""}`}
          aria-label="Invite members"
          aria-haspopup="dialog"
          aria-expanded={is_invite_open}
        >
          <InviteIcon size={17} />
        </button>

        <button type="button" className={`${icon_button_class} hidden sm:flex`} aria-label="Help">
          <HelpIcon size={17} />
        </button>

        <button type="button" className={`${icon_button_class} hidden sm:flex`} aria-label="Apps">
          <AppsGridIcon size={16} />
        </button>

        <button
          type="button"
          onClick={toggleAccount}
          className="dropdown-toggle ml-1.5 flex flex-none rounded-full border-2 border-transparent transition-colors hover:border-white/35 aria-expanded:border-white/35"
          aria-label="Account"
          aria-haspopup="menu"
          aria-expanded={is_account_open}
        >
          <UserAvatar user={user} size={30} font_size={11} />
        </button>
      </div>
    </header>

      <RequestAccessModal
        is_open={is_request_access_open}
        onClose={closeRequestAccess}
        onSubmit={handleRequestAccessSubmit}
      />

      <InviteMembersModal
        is_open={is_invite_open}
        onClose={closeInvite}
        onSubmit={handleInviteSubmit}
      />

      <NotificationsPanel
        is_open={is_notifications_open}
        onClose={closeNotifications}
      />

      <UpdateFeedPanel is_open={is_feed_open} onClose={closeFeed} />

      <TeamsModal is_open={is_teams_open} onClose={closeTeams} />

      <TrashModal is_open={is_trash_open} onClose={closeTrash} initial_tab={trash_initial_tab} />

      <AccountMenu
        is_open={is_account_open}
        onClose={closeAccount}
        onInviteMembers={openInvite}
        onOpenTeams={openTeams}
        onOpenTrash={openTrash}
        onOpenArchive={openArchive}
      />
    </>
  );
};

export default AppTopBar;
