"use client";
import React from "react";
import { cardClass } from "./profileStyles";

export type ProfileCardProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Plain padded card wrapper (`shell-panel-alt` fill, `shell-border` outline) shared by the
 * Personal info / Password real-API-backed sections — the recessed-layer counterpart to the
 * page background (`shell-panel`, inherited from {@link ProfileView}), so cards read as a
 * distinct tone from the modal in both light and dark theme.
 */
const ProfileCard: React.FC<ProfileCardProps> = ({ children, className = "" }) => (
  <div className={`${cardClass} ${className}`}>{children}</div>
);

export default ProfileCard;
