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
 * Wrapped in a `dark` scope so ProfileForm's `dark:` Tailwind variants stay active
 * regardless of the site-wide theme toggle, matching the modal's always-dark chrome.
 */
const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({ onOpenTeams }) => (
  <div className="dark">
    <ProfileForm />

    {onOpenTeams ? (
      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-gray-800 bg-white/[0.03] p-6 text-center">
        <div className="text-[15px] font-semibold text-white">Create and join teams</div>
        <p className="max-w-[360px] text-[13px] leading-relaxed text-gray-400">
          Collaborate better with teammates and keep track of projects you&apos;re interested in.
        </p>
        <button
          type="button"
          onClick={onOpenTeams}
          className="rounded-lg bg-white/[0.08] px-[18px] py-[9px] text-[13px] font-bold text-gray-200 transition-colors hover:bg-white/[0.14]"
        >
          Explore teams
        </button>
      </div>
    ) : null}
  </div>
);

export default PersonalInfoSection;
