"use client";
import React, { useEffect } from "react";
import { CloseIcon } from "@/icons/workspace-icons";
import ProfileNav from "./ProfileNav";
import ProfileBanner from "./ProfileBanner";
import { useProfileManager } from "./useProfileManager";
import type { ProfileSectionId } from "./types";
import PersonalInfoSection from "./sections/PersonalInfoSection";
import WorkingStatusSection from "./sections/WorkingStatusSection";
import NotificationsSection from "./sections/NotificationsSection";
import LanguageRegionSection from "./sections/LanguageRegionSection";
import PasswordSection from "./sections/PasswordSection";
import SessionHistorySection from "./sections/SessionHistorySection";

export type ProfileModalProps = {
  is_open: boolean;
  onClose: () => void;
  /** Opens the real Teams directory dialog owned by the top bar. */
  onOpenTeams?: () => void;
};

/**
 * "My Profile" dialog opened from {@link AccountMenu}'s "My profile" entry: a left nav
 * ({@link ProfileNav}) and a right content pane that swaps between the six profile pages.
 * Structured the same way as {@link AdministrationModal} — {@link useProfileManager} owns
 * the mock-section state, every panel below stays presentational over its output. Personal
 * info and Password keep their existing, fully functional real-API components untouched.
 */
const ProfileModal: React.FC<ProfileModalProps> = ({ is_open, onClose, onOpenTeams }) => {
  const profile = useProfileManager();

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
    };
  }, [is_open, onClose]);

  if (!is_open) return null;

  const SECTION_PANELS: Record<ProfileSectionId, React.ReactNode> = {
    personal: <PersonalInfoSection onOpenTeams={onOpenTeams} />,
    working: <WorkingStatusSection profile={profile} />,
    notifications: <NotificationsSection profile={profile} />,
    language: <LanguageRegionSection profile={profile} />,
    password: <PasswordSection />,
    sessions: <SessionHistorySection profile={profile} />,
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="My Profile" className="fixed inset-0 z-[400] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[401] flex h-[780px] max-h-[92vh] w-[1180px] max-w-full overflow-hidden rounded-[18px] border border-shell-border bg-shell-panel font-outfit text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-[18px] top-4 z-[2] flex h-[30px] w-[30px] items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover"
        >
          <CloseIcon size={15} />
        </button>

        <ProfileNav profile={profile} />

        <div className="scrollnice min-w-0 flex-1 overflow-y-auto px-11 pb-11 pt-9">
          {profile.preferences_error ? (
            <ProfileBanner tone="error" className="mb-6">
              {profile.preferences_error}
            </ProfileBanner>
          ) : null}
          {SECTION_PANELS[profile.active_section]}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
