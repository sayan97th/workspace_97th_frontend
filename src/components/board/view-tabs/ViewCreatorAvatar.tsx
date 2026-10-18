"use client";
import React from "react";
import { avatarGradientForEmail, initialsFromFullName } from "@/components/invitations/invitationFormat";

export type ViewCreatorAvatarProps = {
  full_name: string;
  photo_url?: string | null;
  /** Diameter in pixels. */
  size?: number;
};

/** Round avatar of the person who created a view: their photo, or initials on a gradient stable for their name. */
const ViewCreatorAvatar: React.FC<ViewCreatorAvatarProps> = ({ full_name, photo_url, size = 20 }) => {
  const dimensions = { width: size, height: size };

  if (photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary user uploaded URLs.
      <img src={photo_url} alt="" aria-hidden className="vt-avatar" style={dimensions} />
    );
  }

  const [gradient_from, gradient_to] = avatarGradientForEmail(full_name);

  return (
    <span
      aria-hidden
      className="vt-avatar"
      style={{
        ...dimensions,
        fontSize: Math.max(9, Math.round(size * 0.42)),
        background: `linear-gradient(135deg, ${gradient_from}, ${gradient_to})`,
      }}
    >
      {initialsFromFullName(full_name)}
    </span>
  );
};

export default ViewCreatorAvatar;
