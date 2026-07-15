"use client";
import React from "react";
import { AlertCircleIcon, CheckIcon, WarningTriangleIcon, InfoIcon } from "@/icons/workspace-icons";

export type ProfileBannerTone = "success" | "error" | "warning" | "info";

export type ProfileBannerProps = {
  tone: ProfileBannerTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const TONE_STYLES: Record<
  ProfileBannerTone,
  { border: string; bg: string; icon_wrap: string; icon: React.ReactNode; title_color: string; body_color: string }
> = {
  success: {
    border: "border-[#6fcf97]/25",
    bg: "bg-[#6fcf97]/[0.12]",
    icon_wrap: "bg-[#6fcf97] text-white",
    icon: <CheckIcon size={13} />,
    title_color: "text-[#6fcf97]",
    body_color: "text-[#6fcf97]",
  },
  error: {
    border: "border-[#e2445c]/25",
    bg: "bg-[#e2445c]/[0.12]",
    icon_wrap: "bg-[#e2445c]/[0.16] text-[#ff8a94]",
    icon: <AlertCircleIcon size={14} />,
    title_color: "text-[#ff8a94]",
    body_color: "text-[#ff8a94]",
  },
  warning: {
    border: "border-[#f2c94c]/30",
    bg: "bg-[#f2c94c]/[0.12]",
    icon_wrap: "bg-[#f2c94c]/[0.18] text-[#f2c94c]",
    icon: <WarningTriangleIcon size={14} />,
    title_color: "text-shell-text-secondary",
    body_color: "text-shell-text-muted",
  },
  info: {
    border: "border-[#579bfc]/25",
    bg: "bg-[#579bfc]/10",
    icon_wrap: "bg-[#579bfc]/[0.16] text-[#7fb2ff]",
    icon: <InfoIcon size={13} />,
    title_color: "text-[#b9d4ff]",
    body_color: "text-[#b9d4ff]",
  },
};

/**
 * Success/error/warning/info alert box shared by {@link ProfileForm}, {@link ChangePasswordSection}
 * and {@link TwoFactorSection} — replaces ~8 duplicated ad hoc banner blocks across those files.
 * Follows the app's convention of static literal-hex accent colors (no `dark:` variants needed —
 * these tones don't flip with theme, matching Administration's `AdvancedSection`/`ProfileSection`).
 */
const ProfileBanner: React.FC<ProfileBannerProps> = ({ tone, title, children, className = "" }) => {
  const style = TONE_STYLES[tone];
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${style.border} ${style.bg} px-4 py-3 ${className}`}>
      <span className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full ${style.icon_wrap}`}>
        {style.icon}
      </span>
      <div className="min-w-0">
        {title ? <p className={`text-sm font-semibold ${style.title_color}`}>{title}</p> : null}
        <div className={`text-xs leading-relaxed ${title ? "mt-0.5" : "text-sm font-medium"} ${style.body_color}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default ProfileBanner;
