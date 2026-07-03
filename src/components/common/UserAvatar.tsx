"use client";

import React, { useState } from "react";
import type { User } from "@/types/auth";
import { getUserDisplayName, getUserInitials } from "@/lib/user";

type UserAvatarProps = {
  user: User | null | undefined;
  /** Rendered width/height in pixels. */
  size?: number;
  /** Font size for the initials fallback; defaults to a size-relative value. */
  font_size?: number;
  /** Extra classes for the outer element (e.g. ring / border utilities). */
  className?: string;
};

/**
 * Circular user avatar. Shows the account profile photo when available and
 * falls back to the user's initials over the brand gradient otherwise.
 * Reusable across the top bar, member lists, comments, etc.
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 30,
  font_size,
  className = "",
}) => {
  const [has_image_error, setHasImageError] = useState(false);

  const photo_url = user?.profile_photo_url ?? null;
  const show_photo = Boolean(photo_url) && !has_image_error;
  const initials = getUserInitials(user);
  const display_name = getUserDisplayName(user);
  const resolved_font_size = font_size ?? Math.round(size * 0.37);

  return (
    <span
      className={`flex flex-none items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#E5623E,#8A2018)] font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: resolved_font_size }}
      title={display_name}
    >
      {show_photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo_url as string}
          alt={display_name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span className="select-none leading-none">{initials}</span>
      )}
    </span>
  );
};

export default UserAvatar;
