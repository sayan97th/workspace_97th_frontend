"use client";
import React from "react";
import { cardClass } from "./profileStyles";

export type ProfileCardProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Bordered card shared by the Password and two-factor sections and the Users directory edit page,
 * a framed block inside the white section card, same as the setting groups of the other sections.
 */
const ProfileCard: React.FC<ProfileCardProps> = ({ children, className = "" }) => (
  <div className={`${cardClass} ${className}`}>{children}</div>
);

export default ProfileCard;
