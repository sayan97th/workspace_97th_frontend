"use client";
import React from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "@/components/common/UserAvatar";
import { getUserDisplayName } from "@/lib/user";
import { ChevronRightIcon } from "@/icons/workspace-icons";
import ProfileTabs from "./ProfileTabs";
import ProfileBanner from "./ProfileBanner";
import { useProfileManager } from "./useProfileManager";
import type { ProfileSectionId } from "./types";
import PersonalInfoSection from "./sections/PersonalInfoSection";
import WorkingStatusSection from "./sections/WorkingStatusSection";
import NotificationsSection from "./sections/NotificationsSection";
import LanguageRegionSection from "./sections/LanguageRegionSection";
import PasswordSection from "./sections/PasswordSection";
import SessionHistorySection from "./sections/SessionHistorySection";

/**
 * "My Profile" page, mounted at `/profile`. Replaces the old floating `ProfileModal`
 * dialog with a full route: the same six sections, still driven by {@link useProfileManager},
 * now switched through a top tab bar ({@link ProfileTabs}) instead of a left nav, and framed
 * by an identity header instead of a dimmed backdrop + centered panel.
 */
const ProfileView: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useProfileManager();

  /** "Teams" is a routed page (`/teams`) rather than a modal. */
  const openTeams = () => router.push("/teams");

  const SECTION_PANELS: Record<ProfileSectionId, React.ReactNode> = {
    personal: <PersonalInfoSection onOpenTeams={openTeams} />,
    working: <WorkingStatusSection profile={profile} />,
    notifications: <NotificationsSection profile={profile} />,
    language: <LanguageRegionSection profile={profile} />,
    password: <PasswordSection />,
    sessions: <SessionHistorySection profile={profile} />,
  };

  const role_names = (user?.roles ?? []).map((role) => (typeof role === "string" ? role : role.name));
  const member_since = user?.created_at ? format(new Date(user.created_at), "MMMM yyyy") : null;

  return (
    <div className="mx-auto flex min-h-full max-w-[1040px] flex-col px-6 pb-16 pt-7 sm:px-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-5 flex w-fit items-center gap-1.5 text-[13px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text"
      >
        <ChevronRightIcon className="rotate-180" size={11} />
        Back
      </button>

      <div className="relative mb-7 overflow-hidden rounded-2xl border border-shell-border bg-shell-panel-alt p-6 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(229,62,46,0.16),transparent_70%)]"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar user={user} size={64} font_size={22} className="ring-4 ring-shell-panel" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[22px] font-extrabold tracking-[-0.01em] text-shell-text">
                  {getUserDisplayName(user)}
                </h1>
                {role_names.map((role_name) => (
                  <span
                    key={role_name}
                    className="flex-none rounded-md bg-brand-500/10 px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.03em] text-brand-500"
                  >
                    {role_name}
                  </span>
                ))}
              </div>
              <p className="mt-0.5 truncate text-[13.5px] text-shell-text-muted">{user?.email}</p>
            </div>
          </div>

          {member_since ? (
            <div className="flex-none text-left text-[12.5px] text-shell-text-muted sm:text-right">
              Member since
              <div className="text-[13.5px] font-semibold text-shell-text-secondary">{member_since}</div>
            </div>
          ) : null}
        </div>
      </div>

      <ProfileTabs active_section={profile.active_section} onSelect={profile.selectSection} />

      <div className="pt-7">
        {profile.preferences_error ? (
          <ProfileBanner tone="error" className="mb-6">
            {profile.preferences_error}
          </ProfileBanner>
        ) : null}
        {SECTION_PANELS[profile.active_section]}
      </div>
    </div>
  );
};

export default ProfileView;
