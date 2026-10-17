"use client";
import React from "react";
import { AlertCircle, CircleCheck, Info, TriangleAlert } from "lucide-react";
import "./profile.scss";

export type ProfileBannerTone = "success" | "error" | "warning" | "info";

export type ProfileBannerProps = {
  tone: ProfileBannerTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const TONE_ICONS: Record<ProfileBannerTone, React.ReactNode> = {
  success: <CircleCheck size={16} strokeWidth={1.75} />,
  error: <AlertCircle size={16} strokeWidth={1.75} />,
  warning: <TriangleAlert size={16} strokeWidth={1.75} />,
  info: <Info size={16} strokeWidth={1.75} />,
};

/**
 * monday style tinted notice (success, error, warning, info) shared by the My Profile sections,
 * the password and 2FA cards and the Users directory edit page. Colors come from the
 * `--profile-*` tokens in `profile.scss`, so the notice reads well in light and dark mode.
 */
const ProfileBanner: React.FC<ProfileBannerProps> = ({ tone, title, children, className = "" }) => (
  <div role={tone === "error" ? "alert" : "status"} className={`profile-notice profile-notice-${tone} ${className}`}>
    <span className="profile-notice-icon" aria-hidden="true">
      {TONE_ICONS[tone]}
    </span>
    <div className="profile-notice-body">
      {title ? <p className="profile-notice-title">{title}</p> : null}
      <div className={title ? "mt-0.5 text-[13px]" : ""}>{children}</div>
    </div>
  </div>
);

export default ProfileBanner;
