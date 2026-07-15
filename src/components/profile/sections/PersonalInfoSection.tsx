"use client";
import React from "react";
import ProfileForm from "@/components/user-profile/ProfileForm";

export type PersonalInfoSectionProps = {
  /** Opens the real Teams directory dialog owned by the top bar. */
  onOpenTeams?: () => void;
};

/**
 * My Profile > Personal info — hosts the existing, fully functional {@link ProfileForm}
 * (avatar upload, name/email/phone/timezone editing, all wired to the real profile API)
 * unchanged, plus a "Create and join teams" card that opens the real Teams directory.
 * Styled entirely with theme-aware `shell-*` tokens, so it follows the site-wide theme
 * toggle like every other Profile/Administration section.
 */
const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({ onOpenTeams }) => (
  <div>
    <ProfileForm />

    {onOpenTeams ? (
      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-shell-border bg-shell-panel-alt p-6 text-center">
        <div className="text-[15px] font-semibold text-shell-text">Create and join teams</div>
        <p className="max-w-[360px] text-[13px] leading-relaxed text-shell-text-muted">
          Collaborate better with teammates and keep track of projects you&apos;re interested in.
        </p>
        <button
          type="button"
          onClick={onOpenTeams}
          className="rounded-lg bg-shell-hover-strong px-[18px] py-[9px] text-[13px] font-bold text-shell-text-secondary transition-colors hover:bg-shell-hover-strong"
        >
          Explore teams
        </button>
      </div>
    ) : null}
  </div>
);

export default PersonalInfoSection;
