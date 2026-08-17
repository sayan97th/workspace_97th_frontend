"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { useBranding } from "@/context/BrandingContext";
import UserAvatar from "@/components/common/UserAvatar";
import AccountMenu from "./AccountMenu";
import RequestAccessModal, {
  type RequestAccessSubmission,
} from "./RequestAccessModal";
import InviteMembersModal, {
  type InviteMembersResult,
  type InviteMembersSubmission,
} from "./InviteMembersModal";
import { useWorkspaces } from "@/components/workspace-nav/useWorkspaces";
import { invitationService } from "@/services/invitation.service";
import { useNotifications } from "@/hooks/useNotifications";
import { useFeedUpdates } from "@/hooks/useFeedUpdates";
import NotificationsPanel from "./NotificationsPanel";
import UpdateFeedPanel from "./UpdateFeedPanel";
import { TrashModal, type TrashTabId } from "@/components/trash";
import { AdministrationModal } from "@/components/administration";
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
 * Full-width application bar that sits above the sidebar and main content.
 * Mirrors the "top application bar" from the approved 97 Workspace design.
 * Colors come from the shell-* theme tokens, so it repaints with AccountMenu's
 * Light/Dark/System default switcher.
 */
const AppTopBar: React.FC = () => {
  const router = useRouter();
  const { toggleMobileSidebar } = useSidebar();
  const { user } = useAuth();
  const { logo_url } = useBranding();
  const { active_workspace, active_workspace_slug } = useWorkspaces();
  const is_active_workspace_viewer = active_workspace?.role === "Viewer";
  const { notifications, unread_count, selectNotification } = useNotifications();
  const { unread_count: feed_unread_count } = useFeedUpdates({ tab: "all" });
  const [is_account_open, setIsAccountOpen] = useState(false);
  const [is_request_access_open, setIsRequestAccessOpen] = useState(false);
  const [is_invite_open, setIsInviteOpen] = useState(false);
  const [is_notifications_open, setIsNotificationsOpen] = useState(false);
  const [is_feed_open, setIsFeedOpen] = useState(false);
  const [is_trash_open, setIsTrashOpen] = useState(false);
  const [trash_initial_tab, setTrashInitialTab] = useState<TrashTabId>("trash");
  const [is_administration_open, setIsAdministrationOpen] = useState(false);

  const toggleNotifications = () => setIsNotificationsOpen((previous) => !previous);
  const closeNotifications = () => setIsNotificationsOpen(false);

  const toggleFeed = () => setIsFeedOpen((previous) => !previous);
  const closeFeed = () => setIsFeedOpen(false);

  const openRequestAccess = () => setIsRequestAccessOpen(true);
  const closeRequestAccess = () => setIsRequestAccessOpen(false);

  const openInvite = () => setIsInviteOpen(true);
  const closeInvite = () => setIsInviteOpen(false);

  /** "My Profile" is now a routed page (`/profile`) rather than a modal. */
  const openProfile = () => router.push("/profile");

  /** "Teams" is now a routed page (`/teams`) rather than a modal. */
  const openTeams = () => router.push("/teams");

  /** "Invitations" opens the Sent invitations page, scoped to the active workspace. */
  const openInvitations = () =>
    router.push(active_workspace_slug ? `/invitations?workspace=${active_workspace_slug}` : "/invitations");

  const openTrash = () => {
    setTrashInitialTab("trash");
    setIsTrashOpen(true);
  };
  const openArchive = () => {
    setTrashInitialTab("archive");
    setIsTrashOpen(true);
  };
  const closeTrash = () => setIsTrashOpen(false);

  const openAdministration = () => setIsAdministrationOpen(true);
  const closeAdministration = () => setIsAdministrationOpen(false);

  const handleRequestAccessSubmit = (submission: RequestAccessSubmission) => {
    // No backend wiring yet — surface the payload for the future API hook.
    console.log("Request edit access submitted", submission);
  };

  const handleInviteSubmit = async (
    submission: InviteMembersSubmission
  ): Promise<InviteMembersResult> => {
    if (!active_workspace_slug) {
      throw new Error("Select a workspace before inviting members.");
    }
    const result = await invitationService.inviteMembers(
      active_workspace_slug,
      submission.emails,
      submission.role,
      submission.message
    );
    return {
      invited_count: result.data.length,
      skipped_emails: result.skipped.map((skipped) => skipped.email),
    };
  };

  const toggleAccount = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsAccountOpen((prev) => !prev);
  };

  const closeAccount = () => setIsAccountOpen(false);

  const icon_button_class =
    "relative flex h-[34px] w-[34px] items-center justify-center rounded-lg text-shell-text-secondary transition-colors hover:bg-shell-hover";

  return (
    <>
    <header className="relative z-[60] flex h-[52px] flex-none items-center gap-3.5 border-b border-shell-border bg-shell-surface px-3.5 text-shell-text">
      {/* Left cluster */}
      <div className="flex flex-none items-center gap-2.5">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-shell-text-secondary hover:bg-shell-hover lg:hidden"
          aria-label="Toggle sidebar"
        >
          <HamburgerIcon size={18} />
        </button>

        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center overflow-hidden rounded-lg bg-brand-500 text-[13px] font-bold tracking-[-0.02em] text-white">
          {logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo_url} alt="Workspace logo" className="h-full w-full object-contain" />
          ) : (
            "97"
          )}
        </span>

        {is_active_workspace_viewer && (
          <>
            <span className="hidden items-center gap-1.5 rounded-lg bg-shell-hover px-[11px] py-1.5 text-[13px] font-semibold text-shell-text-secondary sm:flex">
              <EyeIcon size={15} />
              Viewer
            </span>

            <button
              type="button"
              onClick={openRequestAccess}
              className="hidden rounded-lg border border-shell-border-strong px-[13px] py-1.5 text-[13px] font-semibold text-shell-text transition-colors hover:border-brand-500 hover:text-brand-500 md:block"
            >
              Request edit access
            </button>
          </>
        )}
      </div>

      {/* Center search */}
      <div className="flex min-w-0 flex-1 justify-center">
        <button
          type="button"
          className="flex w-full max-w-[520px] cursor-text items-center gap-2.5 rounded-[10px] border border-shell-border bg-shell-hover px-3.5 py-2 text-left text-shell-text-muted transition-colors hover:bg-shell-hover-strong"
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
          className={`${icon_button_class} ${is_notifications_open ? "bg-shell-hover-strong" : ""}`}
          aria-label="Notifications"
          aria-haspopup="dialog"
          aria-expanded={is_notifications_open}
        >
          <BellIcon size={17} />
          {unread_count > 0 && (
            <span className="absolute right-2 top-[7px] h-[7px] w-[7px] rounded-full border-[1.5px] border-shell-surface bg-brand-500" />
          )}
        </button>

        <button
          type="button"
          onClick={toggleFeed}
          className={`${icon_button_class} ${is_feed_open ? "bg-shell-hover-strong" : ""}`}
          aria-label="Update feed"
          aria-haspopup="dialog"
          aria-expanded={is_feed_open}
        >
          <FeedIcon size={17} />
          {feed_unread_count > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-lg border-[1.5px] border-shell-surface bg-brand-500 px-[3px] text-[9.5px] font-bold text-white">
              {feed_unread_count > 99 ? "99+" : feed_unread_count}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={openInvite}
          className={`${icon_button_class} ${is_invite_open ? "bg-shell-hover-strong" : ""}`}
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
          className="dropdown-toggle ml-1.5 flex flex-none rounded-full border-2 border-transparent transition-colors hover:border-shell-border-strong aria-expanded:border-shell-border-strong"
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
        workspace_slug={active_workspace_slug}
        onSubmit={handleInviteSubmit}
      />

      <NotificationsPanel
        is_open={is_notifications_open}
        onClose={closeNotifications}
        notifications={notifications}
        onSelectNotification={(id) => {
          const selected = selectNotification(id);
          if (selected?.link) router.push(selected.link);
        }}
      />

      <UpdateFeedPanel is_open={is_feed_open} onClose={closeFeed} />

      <TrashModal is_open={is_trash_open} onClose={closeTrash} initial_tab={trash_initial_tab} />

      <AdministrationModal is_open={is_administration_open} onClose={closeAdministration} />

      <AccountMenu
        is_open={is_account_open}
        onClose={closeAccount}
        onOpenProfile={openProfile}
        onInviteMembers={openInvite}
        onOpenTeams={openTeams}
        onOpenInvitations={openInvitations}
        onOpenTrash={openTrash}
        onOpenArchive={openArchive}
        onOpenAdministration={openAdministration}
      />
    </>
  );
};

export default AppTopBar;
