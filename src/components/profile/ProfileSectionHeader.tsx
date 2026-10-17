"use client";
import React from "react";
import "./profile.scss";

export type ProfileSectionHeaderProps = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** Trailing status pill, e.g. Two-Factor Authentication's Active/Not-enabled badge. */
  badge?: React.ReactNode;
  /** Icon chip color, `success` for an already-active/protected state (e.g. 2FA enabled). */
  tone?: "brand" | "success";
  className?: string;
};

const TONE_CHIP_CLASSES: Record<NonNullable<ProfileSectionHeaderProps["tone"]>, string> = {
  brand: "bg-[var(--profile-primary-soft)] text-[var(--profile-primary)]",
  success: "bg-[var(--profile-success-bg)] text-[var(--profile-success-text)]",
};

/**
 * Icon chip, title, optional badge and description header, shared by the cards of
 * {@link ChangePasswordSection}, {@link TwoFactorSection} and the Users directory edit page so
 * they read consistently with each other.
 */
const ProfileSectionHeader: React.FC<ProfileSectionHeaderProps> = ({
  icon,
  title,
  description,
  badge,
  tone = "brand",
  className = "",
}) => (
  <div className={`mb-5 flex items-start gap-3 ${className}`}>
    <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${TONE_CHIP_CLASSES[tone]}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-outfit text-section-title text-shell-text">{title}</h3>
        {badge}
      </div>
      {description ? <p className="mt-0.5 text-[13px] text-shell-text-muted">{description}</p> : null}
    </div>
  </div>
);

export default ProfileSectionHeader;
