"use client";
import React from "react";

export type ProfileSectionHeaderProps = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** Trailing status pill, e.g. Two-Factor Authentication's Active/Not-enabled badge. */
  badge?: React.ReactNode;
  /** Icon chip color — `success` for an already-active/protected state (e.g. 2FA enabled). */
  tone?: "brand" | "success";
  className?: string;
};

const TONE_CHIP_CLASSES: Record<NonNullable<ProfileSectionHeaderProps["tone"]>, string> = {
  brand: "bg-brand-500/10 text-brand-500",
  success: "bg-[#6fcf97]/[0.14] text-[#6fcf97]",
};

/**
 * Icon-chip + title (+ optional badge) + description header, shared by every card inside
 * {@link ProfileForm}, {@link ChangePasswordSection} and {@link TwoFactorSection} so the four
 * real-API-backed cards read consistently with each other.
 */
const ProfileSectionHeader: React.FC<ProfileSectionHeaderProps> = ({
  icon,
  title,
  description,
  badge,
  tone = "brand",
  className = "",
}) => (
  <div className={`mb-5 ${className}`}>
    <div className="flex items-center gap-2.5">
      <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${TONE_CHIP_CLASSES[tone]}`}>
        {icon}
      </div>
      <h2 className="text-[15px] font-bold text-shell-text">{title}</h2>
      {badge}
    </div>
    {description ? <p className="mt-1 text-[13px] text-shell-text-muted">{description}</p> : null}
  </div>
);

export default ProfileSectionHeader;
