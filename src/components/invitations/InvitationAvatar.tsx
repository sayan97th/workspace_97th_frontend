import React from "react";
import { avatarGradientForEmail, initialsFromEmail, initialsFromFullName } from "./invitationFormat";

export type InvitationAvatarProps = {
  /** Seeds the color, and the initials when no `full_name` is given. */
  email: string;
  full_name?: string | null;
  photo_url?: string | null;
  /** Diameter in pixels. */
  size?: number;
};

/**
 * Round avatar for an invited address or an inviter: the uploaded photo when there is one,
 * otherwise initials on a gradient that is stable for that email.
 */
const InvitationAvatar: React.FC<InvitationAvatarProps> = ({ email, full_name, photo_url, size = 32 }) => {
  const dimensions = { width: size, height: size };

  if (photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary user uploaded URLs.
      <img src={photo_url} alt="" aria-hidden className="inv-avatar" style={dimensions} />
    );
  }

  const [gradient_from, gradient_to] = avatarGradientForEmail(email);
  const initials = full_name ? initialsFromFullName(full_name) : initialsFromEmail(email);

  return (
    <span
      aria-hidden
      className="inv-avatar"
      style={{
        ...dimensions,
        fontSize: Math.max(10, Math.round(size * 0.38)),
        background: `linear-gradient(135deg, ${gradient_from}, ${gradient_to})`,
      }}
    >
      {initials}
    </span>
  );
};

export default InvitationAvatar;
